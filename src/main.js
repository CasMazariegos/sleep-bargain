import { parseTime, formatTime, snoozeBudget, parseRequest, ledgerTotals } from './budget.js';
import { pickMood, MOOD_EMOJI, openingOffer, counterDecision } from './mood.js';
import { loadModel, speak, classify } from './negotiator.js';

const $ = (id) => document.getElementById(id);
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };
const ledger = JSON.parse(localStorage.getItem('ledger') || '[]');
let alarmAt = null, ringing = false, audio = null, timer = null;
let snoozeCount = 0;          // snoozes granted this morning
let pending = null;           // { granted, requested, quest, rounds, ctx }

function say(who, text) {
  const p = document.createElement('div'); p.className = `msg ${who}`; p.textContent = text;
  $('chat').append(p); $('chat').scrollTop = 1e9;
}
function setMood(mood) { $('mood').textContent = `${MOOD_EMOJI[mood] ?? '🐣'} ${mood}`; }
function typing(on) { $('typing').hidden = !on; $('chat').scrollTop = 1e9; }
function chips(on) { $('chips').hidden = !on; }
async function meep(ctx, opts) {
  typing(true);
  const [text] = await Promise.all([speak(ctx, opts), new Promise((r) => setTimeout(r, 500 + Math.random() * 500))]);
  typing(false); say('meep', text);
}
function renderLedger() {
  const { won, lost } = ledgerTotals(ledger);
  $('totals').textContent = `Won ${won} min · Lost ${lost} min · Snoozes this morning: ${snoozeCount}`;
  $('ledger').innerHTML = ledger.slice(-8).reverse().map((e) => `<li>${e.when}: asked ${e.requested}, got ${e.granted} (${e.verdict}${e.quest ? `, quest: ${e.quest}` : ''})</li>`).join('');
}
function record(requested, granted, verdict, quest) {
  ledger.push({ when: new Date().toLocaleTimeString(), requested, granted, verdict, quest });
  localStorage.setItem('ledger', JSON.stringify(ledger)); renderLedger();
}
function beep() {
  const ctx = new AudioContext(); const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = 'square'; o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(ctx.destination);
  o.start(); setInterval(() => { o.frequency.value = o.frequency.value === 880 ? 660 : 880; }, 300);
  return ctx;
}
function ring() {
  ringing = true; $('status').textContent = '⏰ RING RING. Negotiate or get up.';
  audio = beep();
  if (window.Notification?.permission === 'granted') new Notification('Meep: wake up!', { body: 'Snooze? You will have to negotiate.' });
  setMood(snoozeCount ? 'suspicious' : 'sassy');
  say('meep', snoozeCount ? `Snooze ${snoozeCount + 1}?? I'm listening... barely.` : 'WAKE UP! Want more sleep? Make your case. 🎤');
}
function stopRing() { ringing = false; audio?.close(); audio = null; }
function schedule(min) {
  alarmAt = min; $('status').textContent = `Alarm set for ${formatTime(min)}`;
  clearInterval(timer);
  timer = setInterval(() => { if (!ringing && Math.floor(nowMin()) === Math.floor(alarmAt) % 1440) ring(); }, 1000);
}
function context() {
  const leaveBy = parseTime($('leave').value);
  const budget = snoozeBudget({ nowMin: Math.floor(nowMin()), leaveBy, readyMinutes: Number($('ready').value), bufferMinutes: Number($('buffer').value) });
  return { leaveBy, leaveByText: formatTime(leaveBy), budget };
}
function grant(minutes, requested, verdict, quest) {
  record(requested, minutes, verdict, quest);
  stopRing(); pending = null; chips(false);
  if (minutes > 0) { snoozeCount++; schedule(nowMin() + minutes); }
  renderLedger();
}

async function onExcuse(excuse) {
  let base; try { base = context(); } catch (e) { say('meep', e.message); return; }
  const requested = parseRequest(excuse);
  // Haggling: a number while an offer is pending is a counter.
  if (pending && /\d|more|how about|counter/i.test(excuse)) return onCounter(requested, excuse);
  typing(true);
  const category = await classify(excuse);
  typing(false);
  const offer = openingOffer({ requested, maxSnooze: base.budget.maxSnooze, category, snoozeCount, seed: excuse.length });
  const mood = pickMood({ snoozeCount, maxSnooze: base.budget.maxSnooze, category });
  setMood(mood);
  const ctx = { ...base, mood, verdict: offer.verdict, granted: offer.granted, requested, excuse, snoozeCount, quest: offer.quest, category };
  $('cat').textContent = `excuse: ${category}`;
  await meep(ctx);
  if (offer.verdict === 'accepted') grant(offer.granted, requested, 'accepted', null);
  else if (offer.verdict === 'denied') { record(requested, 0, 'denied'); chips(true); pending = null; }
  else { pending = { granted: offer.granted, requested, quest: offer.quest, rounds: 0, ctx }; chips(true); }
}
async function onCounter(ask, excuse) {
  const { ctx } = pending;
  const d = counterDecision({ ask, offer: pending.granted, maxSnooze: context().budget.maxSnooze, rounds: pending.rounds });
  pending.rounds++;
  const key = d.verdict === 'holding' ? 'holding' : d.verdict === 'accepted' ? 'accepted' : 'meetHalfway';
  await meep({ ...ctx, excuse, requested: ask, granted: d.granted }, { key });
  if (d.verdict === 'accepted') grant(d.granted, pending.requested, 'haggled', pending.quest);
  else pending.granted = d.granted;
}

$('set').onclick = () => {
  try { schedule(parseTime($('alarm').value)); window.Notification?.requestPermission?.(); }
  catch (e) { $('status').textContent = e.message; }
};
$('test').onclick = () => ring();
$('up').onclick = $('chipUp').onclick = async () => {
  setMood('triumphant'); chips(false); pending = null; stopRing();
  let c; try { c = context(); } catch { c = { leaveByText: $('leave').value, budget: null }; }
  await meep({ ...c, mood: 'triumphant', granted: 0 }, { key: 'triumphant' });
  snoozeCount = 0; $('status').textContent = 'Awake. 🏆'; renderLedger();
};
$('chipAccept').onclick = async () => {
  if (!pending) return;
  say('me', `Deal${pending.quest ? `, I'll ${pending.quest}` : ''}.`);
  await meep({ ...pending.ctx, granted: pending.granted }, { key: 'accepted' });
  grant(pending.granted, pending.requested, 'countered', pending.quest);
};
$('chipReject').onclick = async () => {
  say('me', 'No deal.');
  await meep({ ...(pending?.ctx ?? {}), granted: 0 }, { key: 'rejected' });
  if (pending) record(pending.requested, 0, 'rejected');
  pending = null; chips(false);
};
$('chipCounter').onclick = () => { $('excuse').value = `How about ${(pending?.granted ?? 5) + 3} minutes?`; $('excuse').focus(); };
$('load').onclick = async () => {
  if (!navigator.gpu) { $('model').textContent = 'No WebGPU here: Meep uses the built-in line bank (math still works).'; return; }
  try { await loadModel((t) => ($('model').textContent = t)); $('model').textContent = 'Gemma 2 2B loaded on-device ✅'; }
  catch (e) { $('model').textContent = 'Model failed to load: ' + e.message; }
};
$('form').onsubmit = async (ev) => {
  ev.preventDefault();
  const excuse = $('excuse').value.trim(); if (!excuse) return;
  say('me', excuse); $('excuse').value = '';
  await onExcuse(excuse);
};
renderLedger(); setMood('generous');
