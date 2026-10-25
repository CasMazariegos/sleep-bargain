import test from 'node:test';
import assert from 'node:assert/strict';
import { openingOffer, CATEGORIES } from '../src/mood.js';
import { fallbackLine, resetUsed } from '../src/lines.js';
import { turn } from '../src/engine.js';
import worker, { negotiate, rateLimited } from '../src/worker.js';
import { alignLeave } from '../src/budget.js';

const base = { nowMin: 420, leaveBy: 495, readyMinutes: 35, bufferMinutes: 5 }; // 7:00, leave 8:15 -> 35 min budget

test('no full-grant streaks: most first asks are countered, not granted', () => {
  let full = 0, total = 0;
  for (const category of CATEGORIES) for (const requested of [5, 9, 10, 15, 20, 30]) {
    total++;
    const o = openingOffer({ requested, maxSnooze: 35, category, snoozeCount: 0, seed: requested });
    if (o.verdict === 'accepted' && o.granted === requested) full++;
    else assert.ok(o.granted < requested, `${category}/${requested}`);
  }
  assert.ok(full / total < 0.15, `full grants ${full}/${total}`);
});

test('offers decrease across snoozes, snooze 3 is a final offer, 4+ refuses and re-rings', () => {
  for (const category of ['tired', 'sick', 'cold', 'creative', 'weekendish']) {
    const offers = [0, 1, 2].map((n) => openingOffer({ requested: 15, maxSnooze: 35, category, snoozeCount: n, seed: 1 }));
    assert.ok(offers[0].granted > offers[1].granted && offers[1].granted > offers[2].granted, `${category}: ${offers.map((o) => o.granted)}`);
    assert.equal(offers[2].verdict, 'final');
    const d = openingOffer({ requested: 5, maxSnooze: 35, category, snoozeCount: 3 });
    assert.equal(d.verdict, 'denied'); assert.equal(d.granted, 0); assert.equal(d.ring, true);
  }
});

test('lame excuses: tiny first offer, flat refusal on repeat', () => {
  const a = openingOffer({ requested: 9, maxSnooze: 35, category: 'lame', snoozeCount: 0 });
  assert.ok(a.granted <= 2 && a.verdict === 'countered' && a.quest);
  assert.equal(openingOffer({ requested: 9, maxSnooze: 35, category: 'lame', snoozeCount: 1 }).verdict, 'denied');
});

test('side quests appear on most counteroffers', () => {
  let q = 0, n = 0;
  for (const c of CATEGORIES) for (let s = 0; s < 3; s++) { const o = openingOffer({ requested: 20, maxSnooze: 35, category: c, snoozeCount: s, seed: s }); if (o.verdict !== 'denied') { n++; if (o.quest) q++; } }
  assert.ok(q / n >= 0.8, `${q}/${n}`);
});

test('counteroffers require a response: no auto-grant; accept grants, reject counts as lost', async () => {
  const r = await turn({ ...base, action: 'excuse', excuse: "I'm sleepy", snoozeCount: 0 });
  assert.equal(r.grant, false); assert.ok(r.needsResponse); assert.ok(r.pending);
  const acc = await turn({ ...base, action: 'accept', pending: r.pending, snoozeCount: 0 });
  assert.equal(acc.grant, true); assert.equal(acc.granted, r.pending.granted);
  const rej = await turn({ ...base, action: 'reject', pending: r.pending, snoozeCount: 0 });
  assert.equal(rej.grant, false); assert.equal(rej.lost, true); assert.equal(rej.granted, 0);
});

test('Cassandra\'s bug: "I\'m sleepy" x5 never gets "asked 9, got 9"', async () => {
  resetUsed();
  let snoozeCount = 0; const replies = [];
  for (let i = 0; i < 5; i++) {
    const r = await turn({ ...base, nowMin: 420 + i * 3, action: 'excuse', excuse: "I'm sleepy", snoozeCount });
    replies.push(r.reply);
    assert.ok(!(r.grant && r.granted === 9), `round ${i}`);
    if (r.pending) { const a = await turn({ ...base, action: 'accept', pending: r.pending, snoozeCount }); replies.push(a.reply); if (a.grant) snoozeCount++; }
  }
  assert.equal(new Set(replies).size, replies.length, 'no repeated lines');
});

test('never repeats a fallback line in a session', () => {
  resetUsed();
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    const line = fallbackLine({ mood: 'suspicious', verdict: 'accepted', slots: { excuse: "I'm sleepy", min: 9, leave: '8:15 AM', latest: '7:35 AM', count: 3, quest: 'drink water' }, seed: 0 });
    assert.ok(!seen.has(line), `repeat at ${i}: ${line}`); seen.add(line);
  }
  for (let i = 0; i < 30; i++) {
    const line = fallbackLine({ key: 'holding', slots: { min: 4, ask: 10, leave: '8:15 AM' }, seed: 1 });
    assert.ok(!seen.has(line)); seen.add(line);
  }
});

test('leave time is tied to the real alarm (stale 8:15 AM vs 1:01 PM alarm)', () => {
  assert.deepEqual(alignLeave(781, 495), { leaveBy: 856, moved: true });
  assert.deepEqual(alignLeave(420, 495), { leaveBy: 495, moved: false });
});

const mockAI = (reply, category = 'lame') => ({ AI: { run: async (model, { messages }) => {
  assert.match(model, /gemma/);
  return messages.length === 1 ? { response: `{"category":"${category}"}` } : { response: reply };
} } });

test('server endpoint returns valid JSON with mocked Gemma', async () => {
  const env = { ...mockAI('"Just five more" is a lullaby, not a reason. 2 minutes if you drink a full glass of water first. You leave at 8:15. Deal?'), ASSETS: { fetch: () => new Response('asset') } };
  const req = new Request('https://x/api/negotiate', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4' }, body: JSON.stringify({ ...base, action: 'excuse', excuse: 'just five more' }) });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.brain, 'gemma-server'); assert.equal(j.category, 'lame'); assert.equal(j.granted, 2); assert.equal(j.verdict, 'countered');
  assert.match(j.reply, /2 minutes/);
  assert.equal((await worker.fetch(new Request('https://x/'), env)).status, 200);
  assert.equal((await worker.fetch(new Request('https://x/api/negotiate'), env)).status, 405);
  assert.equal((await worker.fetch(new Request('https://x/api/negotiate', { method: 'POST', body: 'x'.repeat(5000) }), env)).status, 413);
});

test('server guardrail: Gemma stating other minutes is replaced by fallback', async () => {
  const j = await negotiate({ ...base, action: 'excuse', excuse: 'just five more' }, mockAI('Sure, take 30 minutes!'));
  assert.equal(j.brain, 'fallback'); assert.doesNotMatch(j.reply, /30 minutes/);
});

test('rate limit kicks in', () => {
  let limited = false;
  for (let i = 0; i < 40; i++) limited = rateLimited('9.9.9.9', 1000 + i);
  assert.equal(limited, true);
});
