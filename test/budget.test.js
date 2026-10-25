import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTime, snoozeBudget, parseRequest, decide, scoreExcuse, ledgerTotals, formatTime } from '../src/budget.js';
import { enforce } from '../src/negotiator.js';

test('parseTime handles formats', () => {
  assert.equal(parseTime('8:15'), 495);
  assert.equal(parseTime('8:15 pm'), 1215);
  assert.equal(parseTime('12am'), 0);
  assert.throws(() => parseTime('25:00'));
  assert.equal(formatTime(495), '8:15 AM');
});
test('budget: 7:00 alarm, leave 8:15, 35 ready, 5 buffer => 35 min', () => {
  const b = snoozeBudget({ nowMin: 420, leaveBy: 495, readyMinutes: 35, bufferMinutes: 5 });
  assert.equal(b.maxSnooze, 35); assert.equal(b.latestGetUp, '7:35 AM');
});
test('budget is zero when already late', () => {
  const b = snoozeBudget({ nowMin: 480, leaveBy: 495, readyMinutes: 35 });
  assert.equal(b.maxSnooze, 0); assert.equal(b.late, true);
});
test('budget rolls over midnight', () => {
  assert.equal(snoozeBudget({ nowMin: 1430, leaveBy: 60, readyMinutes: 30, bufferMinutes: 0 }).maxSnooze, 40);
});
test('parseRequest reads numbers and words', () => {
  assert.equal(parseRequest('5 more minutes'), 5);
  assert.equal(parseRequest('ten mins pls'), 10);
  assert.equal(parseRequest('ugh'), 9);
});
test('decide never exceeds budget', () => {
  assert.deepEqual(decide({ requested: 60, maxSnooze: 20, excuseScore: 1 }), { granted: 20, counter: 20, verdict: 'countered' });
  assert.equal(decide({ requested: 5, maxSnooze: 20, excuseScore: 0.9 }).verdict, 'accepted');
  assert.equal(decide({ requested: 15, maxSnooze: 20, excuseScore: 0.1 }).granted, 10);
  assert.equal(decide({ requested: 5, maxSnooze: 0 }).verdict, 'denied');
});
test('excuse scoring', () => {
  assert.ok(scoreExcuse('I was up late with the baby') > scoreExcuse('bed is cozy pls'));
});
test('ledger totals', () => {
  assert.deepEqual(ledgerTotals([{ requested: 10, granted: 5 }, { requested: 5, granted: 5 }]), { won: 10, lost: 5 });
});
test('enforce rejects model text with wrong minutes', () => {
  assert.match(enforce('Okay, 30 minutes!', 10), /10 minutes/);
  assert.equal(enforce('Fine, 10 minutes, sleepyhead.', 10), 'Fine, 10 minutes, sleepyhead.');
});

import { pickMood, repeatFactor, openingOffer, counterDecision, classifyExcuse, normalizeCategory } from '../src/mood.js';
import { fillSlots, fallbackLine, lineCount, LINES } from '../src/lines.js';
import { guard, buildMessages } from '../src/negotiator.js';

test('mood shifts with repeat count and budget', () => {
  assert.equal(pickMood({ snoozeCount: 0, maxSnooze: 30, category: 'tired' }), 'generous');
  assert.equal(pickMood({ snoozeCount: 0, maxSnooze: 30, category: 'lame' }), 'sassy');
  assert.equal(pickMood({ snoozeCount: 1, maxSnooze: 30, category: 'tired' }), 'suspicious');
  assert.equal(pickMood({ snoozeCount: 3, maxSnooze: 30 }), 'exasperated');
  assert.equal(pickMood({ snoozeCount: 0, maxSnooze: 2 }), 'dramatic');
  assert.equal(pickMood({ gotUp: true, maxSnooze: 0 }), 'triumphant');
});
test('repeat snoozes shrink the offer, never above budget', () => {
  assert.ok(repeatFactor(2) < repeatFactor(0));
  const first = openingOffer({ requested: 30, maxSnooze: 20, category: 'tired', snoozeCount: 0 });
  const third = openingOffer({ requested: 30, maxSnooze: 20, category: 'tired', snoozeCount: 2 });
  assert.ok(third.granted < first.granted && first.granted <= 20);
  assert.equal(openingOffer({ requested: 5, maxSnooze: 20, category: 'sick' }).verdict, 'accepted');
  assert.equal(openingOffer({ requested: 5, maxSnooze: 0, category: 'sick' }).verdict, 'denied');
  assert.ok(openingOffer({ requested: 15, maxSnooze: 20, category: 'lame', seed: 3 }).quest);
});
test('counter haggling: accept lower, halfway once, then hold', () => {
  assert.deepEqual(counterDecision({ ask: 4, offer: 6, maxSnooze: 20 }), { verdict: 'accepted', granted: 4 });
  assert.deepEqual(counterDecision({ ask: 10, offer: 6, maxSnooze: 20 }), { verdict: 'countered', granted: 8 });
  assert.deepEqual(counterDecision({ ask: 10, offer: 8, maxSnooze: 20, rounds: 1 }), { verdict: 'holding', granted: 8 });
  assert.deepEqual(counterDecision({ ask: 30, offer: 6, maxSnooze: 20 }), { verdict: 'holding', granted: 6 });
});
test('excuse classification + normalizing model output', () => {
  assert.equal(classifyExcuse('I have a migraine'), 'sick');
  assert.equal(classifyExcuse('was up late'), 'tired');
  assert.equal(classifyExcuse("it's freezing in here"), 'cold');
  assert.equal(classifyExcuse('meh'), 'lame');
  assert.equal(classifyExcuse('a raccoon stole my socks and I must negotiate their return'), 'creative');
  assert.equal(normalizeCategory('Weekend', 'x'), 'weekendish');
  assert.equal(normalizeCategory('banana', 'I have a fever'), 'sick');
});
test('fallback slot filling', () => {
  assert.equal(fillSlots('"{excuse}" gets {min} min, leave {leave}', { excuse: 'cozy', min: 6, leave: '8:15 AM' }), '"cozy" gets 6 min, leave 8:15 AM');
  assert.equal(fillSlots('{unknown} stays', {}), '{unknown} stays');
  const slots = { excuse: 'bed is comfy', min: 6, ask: 20, leave: '8:15 AM', latest: '7:35 AM', left: '75 min', quest: 'drink water', count: 2 };
  for (const [mood, bank] of Object.entries(LINES)) {
    const verdicts = Array.isArray(bank) ? { [mood]: bank } : bank;
    for (const [v, arr] of Object.entries(verdicts)) arr.forEach((_, i) => {
      const line = Array.isArray(bank) ? fallbackLine({ key: mood, slots, seed: i }) : fallbackLine({ mood, verdict: v, slots, seed: i });
      assert.doesNotMatch(line, /\{\w+\}/, `${mood}/${v}/${i}`);
    });
  }
  assert.ok(lineCount() >= 60, `line bank has ${lineCount()}`);
});
test('guard: only the granted number (or real minutes-until-leave) may appear', () => {
  assert.equal(guard('I give you 20 minutes', 6), null);
  assert.equal(guard('You leave in 75 minutes. 6 minutes, deal?', 6, { untilLeave: 75 }), 'You leave in 75 minutes. 6 minutes, deal?');
  assert.equal(guard('Sure, have a nap!', 6), null);
  assert.equal(buildMessages({ mood: 'sassy', verdict: 'countered', granted: 6, requested: 20, excuse: 'x', leaveByText: '8:15 AM', budget: { latestGetUp: '7:35 AM', untilLeave: 75 }, snoozeCount: 0 })[0].role, 'system');
});
