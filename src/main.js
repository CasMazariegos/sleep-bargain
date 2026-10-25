import { parseTime, formatTime, snoozeBudget, parseRequest, decide, scoreExcuse, ledgerTotals } from './budget.js';
import { loadModel, negotiate } from './negotiator.js';

const $ = (id) => document.getElementById(id);
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };
const ledger = JSON.parse(localStorage.getItem('ledger') || '[]');
let alarmAt = null, ringing = false, audio = null, timer = null;

function say(who, text) {
  const p = document.createElement('div'); p.className = `msg ${who}`; p.textContent = text;
  $('chat').append(p); $('chat').scrollTop = 1e9;
}
function renderLedger() {
  const { won, lost } = ledgerTotals(ledger);
  $('totals').textContent = `Won ${won} min · Lost ${lost} min`;
  $('ledger').innerHTML = ledger.slice(-8).reverse().map((e) => `<li>${e.when}: asked ${e.requested}, got ${e.granted} (${e.verdict})</li>`).join('');
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
  if (Notification?.permission === 'granted') new Notification('Meep: wake up!', { body: 'Snooze? You will have to negotiate.' });
  say('meep', 'WAKE UP! Want more sleep? Make your case.');
}
function stopRing() { ringing = false; audio?.close(); audio = null; }
function schedule(min) {
  alarmAt = min; $('status').textContent = `Alarm set for ${formatTime(min)}`;
  clearInterval(timer);
  timer = setInterval(() => { if (!ringing && Math.floor(nowMin()) === Math.floor(alarmAt) % 1440) ring(); }, 1000);
}

$('set').onclick = () => {
  try { schedule(parseTime($('alarm').value)); Notification?.requestPermission?.(); }
  catch (e) { $('status').textContent = e.message; }
};
$('test').onclick = () => ring();
$('up').onclick = () => { stopRing(); say('meep', 'You got up! Legend. 🏆'); $('status').textContent = 'Awake.'; };
$('load').onclick = async () => {
  if (!navigator.gpu) { $('model').textContent = 'No WebGPU here: using built-in Meep lines (math still works).'; return; }
  try { await loadModel((t) => ($('model').textContent = t)); $('model').textContent = 'Gemma 2 2B loaded on-device ✅'; }
  catch (e) { $('model').textContent = 'Model failed to load: ' + e.message; }
};
$('form').onsubmit = async (ev) => {
  ev.preventDefault();
  const excuse = $('excuse').value.trim(); if (!excuse) return;
  say('me', excuse); $('excuse').value = '';
  let leaveBy;
  try { leaveBy = parseTime($('leave').value); } catch (e) { say('meep', e.message); return; }
  const budget = snoozeBudget({ nowMin: Math.floor(nowMin()), leaveBy, readyMinutes: Number($('ready').value), bufferMinutes: Number($('buffer').value) });
  const requested = parseRequest(excuse);
  const deal = decide({ requested, maxSnooze: budget.maxSnooze, excuseScore: scoreExcuse(excuse) });
  const text = await negotiate({ excuse, requested, deal, budget, leaveByText: formatTime(leaveBy) });
  say('meep', text);
  ledger.push({ when: new Date().toLocaleString(), requested, granted: deal.granted, verdict: deal.verdict });
  localStorage.setItem('ledger', JSON.stringify(ledger)); renderLedger();
  stopRing();
  if (deal.granted > 0) schedule(nowMin() + deal.granted);
};
renderLedger();
