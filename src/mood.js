// Negotiation brain: excuse categories, moods, side quests, haggling. All deterministic.

export const CATEGORIES = ['tired', 'sick', 'cold', 'weekendish', 'lame', 'creative'];
export const CATEGORY_SCORE = { sick: 0.95, tired: 0.8, creative: 0.75, cold: 0.6, weekendish: 0.45, lame: 0.2 };

const KEYWORDS = {
  sick: ['sick', 'migraine', 'headache', 'fever', 'cough', 'throat', 'nausea', 'cramps', 'flu', 'cold sore'],
  tired: ['sleepy', 'late', 'tired', 'insomnia', "couldn't sleep", 'couldnt sleep', 'up all night', 'baby', 'kid', 'shift', 'nightmare', 'exhausted', 'dog', 'storm'],
  cold: ['cold', 'freezing', 'chilly', 'blanket', 'warm', 'cozy', 'heater'],
  weekendish: ['weekend', 'saturday', 'sunday', 'holiday', 'day off', 'no rush', 'meeting got moved', 'nothing till'],
  lame: ['just because', 'meh', 'nah', "don't want", 'dont want', 'lazy', 'pls', 'please', 'bed is', 'ugh', 'no'],
};
/** Fast heuristic classifier (used when Gemma is not loaded, or as a fallback for bad JSON). */
export function classifyExcuse(text) {
  const t = ` ${String(text).toLowerCase()} `;
  for (const cat of ['sick', 'tired', 'weekendish', 'cold', 'lame']) {
    if (KEYWORDS[cat].some((k) => t.includes(k))) return cat;
  }
  const words = t.trim().split(/\s+/).length;
  return words >= 8 ? 'creative' : 'lame';
}
/** Validate a model-produced category; anything weird falls back to the heuristic. */
export function normalizeCategory(raw, text) {
  const c = String(raw ?? '').toLowerCase().replace(/[^a-z]/g, '');
  const alias = { weekend: 'weekendish', weekendlike: 'weekendish', lazy: 'lame', ill: 'sick', funny: 'creative' };
  const v = alias[c] ?? c;
  return CATEGORIES.includes(v) ? v : classifyExcuse(text);
}

/**
 * Meep's attitude. Priority: got up > budget near zero > repeat asks > first ask quality.
 */
export function pickMood({ gotUp = false, snoozeCount = 0, maxSnooze = 30, category = 'tired' }) {
  if (gotUp) return 'triumphant';
  if (maxSnooze <= 3) return 'dramatic';
  if (snoozeCount >= 2) return 'exasperated';
  if (snoozeCount >= 1) return 'suspicious';
  if (category === 'lame') return 'sassy';
  if (category === 'creative') return 'amused';
  return 'generous';
}
export const MOOD_EMOJI = { generous: '🥰', sassy: '💅', amused: '😂', suspicious: '🤨', exasperated: '😤', dramatic: '😱', triumphant: '🏆' };

/** Each repeat snooze shrinks the share of the budget Meep will hand over. */
export function repeatFactor(snoozeCount) {
  return Math.max(0.25, 1 - 0.2 * snoozeCount);
}

export const SIDE_QUESTS = [
  'drink a full glass of water first',
  'open the curtains right now',
  'put one foot on the floor and keep it there',
  'skip the second episode of doom-scrolling',
  'say "good morning" out loud to the ceiling',
  'turn the bedroom light on',
  'stretch your arms over your head ten times',
  'put your phone across the room',
  'sit up (just sit, like a person)',
  'text yourself "I am awake" so there is evidence',
];
export function pickQuest(seed) {
  return SIDE_QUESTS[Math.abs(Math.floor(seed)) % SIDE_QUESTS.length];
}

/** Hard ceiling per snooze round: offers always shrink. */
export const ROUND_CAPS = [10, 5, 2];
export const MAX_SNOOZES = 3; // on the 4th ask (snoozeCount >= 3) Meep refuses outright

/**
 * Opening offer for an excuse. Meep fights back:
 * - full grant only for a small ask with a sick/tired excuse on the very first snooze
 * - otherwise a lower counteroffer (~60% of the ask) with a side quest, which must be answered
 * - lame excuses: tiny offer on round 1, refusal after that
 * - snooze 3 = FINAL OFFER (tiny), snooze 4+ = refusal + re-ring
 * verdict: accepted | countered | final | denied
 */
export function openingOffer({ requested, maxSnooze, category, snoozeCount = 0, seed = 0 }) {
  const quest = pickQuest(seed + snoozeCount);
  if (maxSnooze <= 0 || snoozeCount >= MAX_SNOOZES) return { verdict: 'denied', granted: 0, quest: null, ring: snoozeCount >= MAX_SNOOZES };
  if (category === 'lame' && snoozeCount >= 1) return { verdict: 'denied', granted: 0, quest: null, ring: false };
  const base = CATEGORY_SCORE[category] ?? 0.5;
  const cap = Math.min(ROUND_CAPS[snoozeCount], maxSnooze, Math.max(1, Math.floor(maxSnooze * base * repeatFactor(snoozeCount))));
  if (snoozeCount === MAX_SNOOZES - 1) return { verdict: 'final', granted: Math.max(1, Math.min(cap, requested - 1 || 1)), quest };
  if (category === 'lame') return { verdict: 'countered', granted: Math.min(2, cap), quest };
  if (snoozeCount === 0 && (category === 'sick' || category === 'tired') && requested <= Math.floor(cap / 2)) {
    return { verdict: 'accepted', granted: requested, quest: null };
  }
  const granted = Math.max(1, Math.min(cap, Math.floor(requested * 0.6)));
  return { verdict: 'countered', granted, quest };
}

/**
 * User counters a pending offer with `ask` minutes.
 * <= offer: accept. Over budget / round cap or second try: hold firm. Else meet halfway once.
 */
export function counterDecision({ ask, offer, maxSnooze, rounds = 0, snoozeCount = 0 }) {
  const cap = Math.min(maxSnooze, ROUND_CAPS[snoozeCount] ?? 0);
  if (ask <= offer) return { verdict: 'accepted', granted: ask };
  if (ask > cap || rounds >= 1) return { verdict: 'holding', granted: offer };
  const mid = Math.min(cap, Math.floor((ask + offer) / 2));
  return { verdict: mid >= ask ? 'accepted' : 'countered', granted: mid };
}
