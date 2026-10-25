// Deterministic time-budget math. The model never decides the numbers; this does.

/** Parse "8:15", "08:15", "8:15 am", "7pm" into minutes since midnight. */
export function parseTime(str) {
  const m = String(str).trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) throw new Error(`Can't read time: "${str}"`);
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (min > 59 || h > 23 || (m[3] && (h < 1 || h > 12))) throw new Error(`Bad time: "${str}"`);
  if (m[3] === 'pm' && h !== 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  return h * 60 + min;
}

export function formatTime(mins) {
  const t = ((Math.round(mins) % 1440) + 1440) % 1440;
  const h = Math.floor(t / 60), m = t % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Minutes from `now` until `target` (both minutes since midnight), rolling past midnight. */
export function minutesUntil(now, target) {
  return (((target - now) % 1440) + 1440) % 1440;
}

/**
 * How many snooze minutes can the schedule afford right now?
 * slack = time until leave - getting-ready time - safety buffer.
 */
export function snoozeBudget({ nowMin, leaveBy, readyMinutes, bufferMinutes = 5 }) {
  const untilLeave = minutesUntil(nowMin, leaveBy);
  const latestGetUp = leaveBy - readyMinutes - bufferMinutes;
  const maxSnooze = Math.max(0, untilLeave - readyMinutes - bufferMinutes);
  return { untilLeave, maxSnooze, latestGetUp: formatTime(latestGetUp), late: untilLeave < readyMinutes };
}

/** Pull a requested minute count out of free text ("5 more minutes", "ten mins pls"). */
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, 'half an hour': 30, hour: 60 };
export function parseRequest(text, fallback = 9) {
  const t = String(text).toLowerCase();
  const num = t.match(/(\d{1,3})\s*(?:more\s*)?(?:min|m\b|minute)/) || t.match(/\b(\d{1,3})\b/);
  if (num) return Number(num[1]);
  for (const [w, v] of Object.entries(WORDS)) if (t.includes(w)) return v;
  return fallback;
}

/**
 * The deal: grant up to the budget, shave a bit for weak excuses.
 * excuseScore is 0..1 (from a simple heuristic; model may only describe it, not change it).
 */
export function decide({ requested, maxSnooze, excuseScore = 0.5 }) {
  if (maxSnooze <= 0) return { granted: 0, counter: 0, verdict: 'denied' };
  const factor = excuseScore >= 0.7 ? 1 : excuseScore >= 0.4 ? 0.75 : 0.5;
  const fair = Math.max(1, Math.floor(maxSnooze * factor));
  const granted = Math.min(requested, fair);
  const verdict = granted >= requested ? 'accepted' : 'countered';
  return { granted, counter: verdict === 'countered' ? granted : 0, verdict };
}

const GOOD = ['late', 'sick', 'baby', 'kid', 'nightmare', 'insomnia', 'shift', 'tired', 'migraine', 'couldn\'t sleep', 'up all night', 'dog', 'storm'];
const BAD = ['just because', 'cozy', 'warm', 'bed is', 'lazy', 'dont want', "don't want", 'meh', 'nah', 'pls', 'please'];
export function scoreExcuse(text) {
  const t = String(text).toLowerCase();
  let s = 0.5;
  for (const g of GOOD) if (t.includes(g)) s += 0.2;
  for (const b of BAD) if (t.includes(b)) s -= 0.15;
  return Math.min(1, Math.max(0, s));
}

/** Ledger: running tally of minutes won and lost. */
export function ledgerTotals(entries) {
  return entries.reduce((a, e) => ({ won: a.won + e.granted, lost: a.lost + Math.max(0, e.requested - e.granted) }), { won: 0, lost: 0 });
}
