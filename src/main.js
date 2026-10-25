import { parseTime, formatTime, ledgerTotals, alignLeave } from './budget.js';
import { MOOD_EMOJI } from './mood.js';
import { loadModel, hasModel, negotiateServer, negotiateLocal } from './negotiator.js';

const $ = (id) => document.getElementById(id);
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };
const ledger = JSON.parse(localStorage.getItem('ledger') || '[]');
let alarmAt = null, ringing = false, audio = null, timer = null, beepTimer = null;
let snoozeCount = 0, pending = null, busy = false;
const recent = [];
let mode = 'server'; // 'server' | 'device'
const BRAINS = { 'gemma-server': '☁️ Gemma 4 (Workers AI)', 'gemma-on-device': '📱 Gemma 2 on-device (WebLLM)', fallback: '📜 Offline line bank' };

function say(who, text) {
  const p = document.createElement('div'); p.className = `msg ${who}`; p.textContent = text;
  $('chat').append(p); $('chat').scrollTop = 1e9;
}
function setMood(mood) { $('mood').textContent = `${MOOD_EMOJI[mood] ?? '🐣'} ${mood}`; }
function setBrain(b, note = '') { $('brain').textContent = `Brain: ${BRAINS[b] ?? b}${note}`; }
function typing(on) { $('typing').hidden = !on; $('chat').scrollTop = 1e9; }
function chips(on) { $('chips').hidden = !on; }
function renderLedger() {
  const { won, lost } = ledgerTotals(ledger);
  $('totals').textContent = `Won ${won} min · Lost ${lost} min · Snoozes this morning: ${snoozeCount}/3`;
  $('ledger').innerHTML = ledger.slice(-8).reverse().map((e) => `<li>${e.when}: asked ${e.requested}, got ${e.granted} (${e.verdict}${e.quest ? `, quest: ${e.quest}` : ''})</li>`).join('');
}
function record(requested, granted, verdict, quest) {
  ledger.push({ when: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), requested, granted, verdict, quest });
  localStorage.setItem('ledger', JSON.stringify(ledger)); renderLedger();
}
function beep(dramatic) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'square'; o.frequency.value = 880; g.gain.value = dramatic ? 0.15 : 0.08; o.connect(g); g.connect(ctx.destination); o.start();
    beepTimer = setInterval(() => { o.frequency.value = o.frequency.value === 880 ? (dramatic ? 440 : 660) : 880; }, dramatic ? 150 : 300);
    return ctx;
  } catch { return null; }
}
function ring(dramatic = false, quiet = false) {
  stopRing(); ringing = true;
  $('status').textContent = dramatic ? '🚨 RE-RING! Negotiations are OVER. Get up.' : '⏰ RING RING. Negotiate or get up.';
  document.body.classList.toggle('alarm', true);
  audio = beep(dramatic);
  navigator.vibrate?.(dramatic ? [300, 100, 300, 100, 600] : [200, 100, 200]);
  if (window.Notification?.permission === 'granted') new Notification('Meep: wake up!', { body: dramatic ? 'No more snoozes!' : 'Snooze? You will have to negotiate.' });
  if (!quiet) { setMood(snoozeCount ? 'suspicious' : 'sassy'); say('meep', snoozeCount ? `Snooze ${snoozeCount + 1}?? I'm listening... barely. 🤨` : 'WAKE UP! Want more sleep? Make your case. 🎤'); }
}
function stopRing() { ringing = false; clearInterval(beepTimer); audio?.close?.(); audio = null; document.body.classList.remove('alarm'); }
function schedule(min) {
  alarmAt = min; $('status').textContent = `Alarm set for ${formatTime(min)}`;
  clearInterval(timer);
  timer = setInterval(() => { if (!ringing && Math.floor(nowMin()) === Math.floor(alarmAt) % 1440) ring(); }, 1000);
}
function leaveMin() { return parseTime($('leave').value); }
function syncLeave(alarmMin) {
  const { leaveBy, moved } = alignLeave(alarmMin, leaveMin());
  if (moved) { $('leave').value = formatTime(leaveBy); say('meep', `Psst: your leave time wasn't after this alarm, so I set it to ${formatTime(leaveBy)}. Change it if that's wrong!`); }
  return leaveBy;
}
function payload(action, excuse = '') {
  return { action, excuse, snoozeCount, nowMin: Math.floor(nowMin()), leaveBy: leaveMin(), readyMinutes: Number($('ready').value), bufferMinutes: Number($('buffer').value), pending, recent };
}
async function send(action, excuse = '') {
  if (busy) return; busy = true;
  let body; try { body = payload(action, excuse); } catch (e) { say('meep', e.message); busy = false; return; }
  typing(true);
  let r, note = '';
  try {
    if (mode === 'device' && hasModel()) r = await negotiateLocal(body);
    else { try { r = await negotiateServer(body); } catch (e) { note = ` (server: ${e.message})`; r = await negotiateLocal(body); } }
  } finally { typing(false); busy = false; }
  apply(r, note);
}
function apply(r, note) {
  setBrain(r.brain, note); setMood(r.mood);
  $('cat').textContent = [r.category && `excuse: ${r.category}`, `latest get-up ${r.latestGetUp}`, `max snooze ${r.maxSnooze} min`].filter(Boolean).join(' · ');
  say('meep', r.reply); recent.push(r.reply); if (recent.length > 6) recent.shift();
  if (r.grant) {
    record(pending?.requested ?? r.requested, r.granted, r.verdict, r.quest);
    snoozeCount++; pending = null; chips(false); stopRing(); schedule(nowMin() + r.granted);
  } else if (r.pending) {
    pending = r.pending; chips(true); clearInterval(beepTimer); audio?.close?.(); audio = null; // quiet while you decide
  } else {
    if (r.lost) record(r.requested, 0, r.verdict, null);
    pending = null;
    if (r.verdict === 'triumphant') { chips(false); stopRing(); snoozeCount = 0; $('status').textContent = 'Awake. 🏆'; }
    else { chips(true); if (r.ring || r.verdict === 'rejected' || snoozeCount >= 3) ring(true, true); }
  }
  $('chipAccept').hidden = $('chipCounter').hidden = !pending;
  renderLedger();
}

$('set').onclick = () => {
  try { const a = parseTime($('alarm').value); syncLeave(a); schedule(a); window.Notification?.requestPermission?.(); }
  catch (e) { $('status').textContent = e.message; }
};
$('test').onclick = () => { try { syncLeave(Math.floor(nowMin())); } catch {} ring(); };
$('up').onclick = $('chipUp').onclick = () => { say('me', "Fine, I'm up."); send('up'); };
$('chipAccept').onclick = () => { if (!pending) return; say('me', `Deal${pending.quest ? `, I'll ${pending.quest}` : ''}.`); send('accept'); };
$('chipReject').onclick = () => { say('me', 'No deal.'); send('reject'); };
$('chipCounter').onclick = () => { $('excuse').value = `How about ${(pending?.granted ?? 2) + 3} minutes?`; $('excuse').focus(); };
$('brainToggle').onchange = async (e) => {
  if (!e.target.checked) { mode = 'server'; setBrain('gemma-server'); return; }
  if (!navigator.gpu) { e.target.checked = false; $('model').textContent = 'No WebGPU on this device (iPhone Safari, etc.). Staying on cloud Gemma.'; return; }
  try { await loadModel((t) => ($('model').textContent = t)); mode = 'device'; $('model').textContent = 'Gemma 2 2B loaded on-device ✅'; setBrain('gemma-on-device'); }
  catch (err) { e.target.checked = false; $('model').textContent = 'On-device load failed: ' + err.message + '. Staying on cloud Gemma.'; }
};
$('form').onsubmit = (ev) => {
  ev.preventDefault();
  const excuse = $('excuse').value.trim().slice(0, 200); if (!excuse) return;
  say('me', excuse); $('excuse').value = ''; send('excuse', excuse);
};
if (!navigator.gpu) { $('brainToggle').disabled = true; $('model').textContent = 'On-device needs WebGPU (desktop Chrome/Edge). Using cloud Gemma.'; }
renderLedger(); setMood('generous'); setBrain('gemma-server');
