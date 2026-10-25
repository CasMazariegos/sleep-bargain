// One negotiation turn. Pure logic + injected classify/talk so the Worker and browser share it.
import { snoozeBudget, parseRequest, formatTime } from './budget.js';
import { pickMood, openingOffer, counterDecision, classifyExcuse, normalizeCategory, MAX_SNOOZES } from './mood.js';
import { fallbackLine } from './lines.js';
import { guard } from './prompt.js';

export const MAX_INPUT = 200;
const FLAT = { holding: 'holding', deal: 'accepted', meet: 'meetHalfway', rejected: 'rejected', triumphant: 'triumphant' };

export function clampInput(body = {}) {
  const n = (v, d, lo, hi) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Math.round(Number(v)))) : d);
  const p = body.pending && typeof body.pending === 'object' ? body.pending : null;
  return {
    action: ['excuse', 'accept', 'reject', 'up'].includes(body.action) ? body.action : 'excuse',
    excuse: String(body.excuse ?? '').slice(0, MAX_INPUT),
    snoozeCount: n(body.snoozeCount, 0, 0, 20),
    nowMin: n(body.nowMin, 0, 0, 1439),
    leaveBy: n(body.leaveBy, 495, 0, 1439),
    readyMinutes: n(body.readyMinutes, 30, 0, 240),
    bufferMinutes: n(body.bufferMinutes, 5, 0, 60),
    pending: p ? { granted: n(p.granted, 0, 0, 60), requested: n(p.requested, 0, 0, 600), rounds: n(p.rounds, 0, 0, 10), quest: p.quest ? String(p.quest).slice(0, 80) : null, category: String(p.category ?? '').slice(0, 20) } : null,
    recent: Array.isArray(body.recent) ? body.recent.slice(-4).map((r) => String(r).slice(0, 160)) : [],
  };
}

/**
 * deps.classify(excuse) -> raw category string | null
 * deps.talk(ctx) -> text | null   (model output; guarded here)
 */
export async function turn(raw, deps = {}) {
  const inp = clampInput(raw);
  const budget = snoozeBudget({ nowMin: inp.nowMin, leaveBy: inp.leaveBy, readyMinutes: inp.readyMinutes, bufferMinutes: inp.bufferMinutes });
  const base = { budget, leaveByText: formatTime(inp.leaveBy), snoozeCount: inp.snoozeCount, excuse: inp.excuse, recent: inp.recent };
  let out;

  if (inp.action === 'up') {
    out = { ...base, mood: 'triumphant', verdict: 'triumphant', granted: 0, requested: 0, flat: 'triumphant' };
  } else if (inp.action === 'accept' && inp.pending) {
    out = { ...base, mood: 'generous', verdict: 'deal', granted: inp.pending.granted, requested: inp.pending.requested, quest: inp.pending.quest, flat: 'deal', grant: true };
  } else if (inp.action === 'reject' || (inp.action === 'accept' && !inp.pending)) {
    out = { ...base, mood: 'sassy', verdict: 'rejected', granted: 0, requested: inp.pending?.requested ?? 0, flat: 'rejected', lost: true };
  } else if (inp.pending && /\d|more|how about|counter|ten|five|fifteen|twenty/i.test(inp.excuse)) {
    const ask = parseRequest(inp.excuse, inp.pending.granted + 3);
    const d = counterDecision({ ask, offer: inp.pending.granted, maxSnooze: budget.maxSnooze, rounds: inp.pending.rounds, snoozeCount: Math.min(inp.snoozeCount, 2) });
    const verdict = d.verdict === 'accepted' ? 'deal' : d.verdict === 'holding' ? 'holding' : 'countered';
    out = { ...base, mood: d.verdict === 'holding' ? 'sassy' : 'amused', verdict, granted: d.granted, requested: ask, quest: inp.pending.quest, category: inp.pending.category,
      flat: verdict === 'deal' ? 'deal' : verdict === 'holding' ? 'holding' : 'meet', grant: verdict === 'deal', pending: verdict !== 'deal' ? { ...inp.pending, granted: d.granted, rounds: inp.pending.rounds + 1 } : null };
  } else {
    const requested = parseRequest(inp.excuse);
    let category = classifyExcuse(inp.excuse);
    try { const c = await deps.classify?.(inp.excuse); if (c) category = normalizeCategory(c, inp.excuse); } catch { /* heuristic */ }
    const offer = openingOffer({ requested, maxSnooze: budget.maxSnooze, category, snoozeCount: inp.snoozeCount, seed: inp.excuse.length + inp.nowMin });
    let mood = pickMood({ snoozeCount: inp.snoozeCount, maxSnooze: budget.maxSnooze, category });
    if (offer.verdict === 'final') mood = 'exasperated';
    if (offer.verdict === 'denied' && (offer.ring || budget.maxSnooze <= 3)) mood = 'dramatic';
    out = { ...base, mood, verdict: offer.verdict, granted: offer.granted, requested, quest: offer.quest, category, ring: !!offer.ring,
      grant: offer.verdict === 'accepted', lost: offer.verdict === 'denied',
      pending: offer.verdict === 'countered' || offer.verdict === 'final' ? { granted: offer.granted, requested, rounds: 0, quest: offer.quest, category } : null };
  }

  let reply = null, brain = 'fallback';
  try {
    const t = await deps.talk?.(out);
    const haggle = ['countered', 'holding', 'deal'].includes(out.verdict);
    reply = guard(t, out.granted, { untilLeave: budget.untilLeave, also: haggle ? [out.requested, inp.pending?.granted] : [] });
    if (reply) brain = deps.brain ?? 'model';
  } catch { /* fallback */ }
  if (!reply) {
    const slots = { excuse: inp.excuse || 'that', min: out.granted, leave: out.leaveByText, latest: budget.latestGetUp, left: `${budget.untilLeave} min`,
      quest: out.quest ?? 'get up a little', count: inp.snoozeCount + 1, ask: out.requested };
    const seed = inp.nowMin + inp.excuse.length + inp.snoozeCount * 7;
    const flatOK = out.flat && !(out.flat === 'meet' && false);
    reply = out.verdict === 'denied' ? fallbackLine({ mood: out.mood === 'dramatic' ? 'dramatic' : 'refuse', verdict: 'denied', slots, seed })
      : out.verdict === 'final' ? fallbackLine({ mood: 'final', verdict: 'final', slots, seed })
      : flatOK ? fallbackLine({ key: FLAT[out.flat], slots, seed })
      : fallbackLine({ mood: out.mood, verdict: out.verdict, slots, seed });
  }
  return {
    reply, brain, mood: out.mood, verdict: out.verdict, category: out.category ?? null, granted: out.granted, requested: out.requested,
    quest: out.quest ?? null, ring: !!out.ring, grant: !!out.grant, lost: !!out.lost, pending: out.pending ?? null,
    needsResponse: !!out.pending, latestGetUp: budget.latestGetUp, maxSnooze: budget.maxSnooze, leaveByText: out.leaveByText, maxSnoozes: MAX_SNOOZES,
  };
}
