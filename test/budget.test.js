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
