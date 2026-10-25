// Gemma (via WebLLM) writes the words + classifies excuses. Numbers come from code and are enforced.
import { fallbackLine } from './lines.js';
import { normalizeCategory, classifyExcuse } from './mood.js';

export const MODEL_ID = 'gemma-2-2b-it-q4f16_1-MLC';

export const SYSTEM = `You are Meep, a tiny, sassy, dramatic, deeply lovable alarm-clock creature. You negotiate snoozes with a sleepy human.
Rules:
- Reply in 2-4 short sentences. Funny, warm, a little theatrical. One emoji max.
- React to the human's EXACT excuse: quote it or riff on it.
- Mention their real schedule: leave time, latest get-up time, or how long until they leave.
- The deal is ALREADY decided by the clock math. State exactly the granted minutes and NO other minute numbers.
- If there is a condition (side quest), make them promise it.
- End with a clear verdict: "Deal?", "Granted.", or "Zero minutes. Up!"
- Match your MOOD: generous=soft, sassy=roasting, amused=delighted, suspicious=eyebrow raised about repeat snoozes, exasperated=out of patience, dramatic=panicking because there is no time, triumphant=celebrating.`;

const SHOTS = [
  ['MOOD=generous VERDICT=accepted GRANTED=8 EXCUSE="I was up late with a sick puppy" LEAVE=8:15 AM LATEST=7:35 AM SNOOZE#=1 QUEST=none',
    'A sick puppy?! Oh, you saint. Take 8 minutes, I\'ll guard the clock. Latest get-up is 7:35, so I\'m back at 7:30 sharp. Granted. 🐶'],
  ['MOOD=sassy VERDICT=countered GRANTED=6 ASKED=20 EXCUSE="bed is too comfy" LEAVE=8:15 AM LATEST=7:35 AM SNOOZE#=1 QUEST=skip the second episode of doom-scrolling',
    '"Bed is too comfy" is not an excuse, it\'s a confession. 20 is a dream; I\'ll give you 6 minutes if you skip the second episode of doom-scrolling. You leave at 8:15. Deal?'],
  ['MOOD=dramatic VERDICT=denied GRANTED=0 EXCUSE="5 more mins pls" LEAVE=8:15 AM LATEST=7:35 AM SNOOZE#=3 QUEST=none',
    '"Pls"?! It is PAST 7:35, you leave at 8:15, and there is no time left! Zero minutes. Up! 😱'],
];

export function buildMessages(ctx) {
  const { mood, verdict, granted, requested, excuse, leaveByText, budget, snoozeCount, quest, category } = ctx;
  const user = `MOOD=${mood} VERDICT=${verdict} GRANTED=${granted} ASKED=${requested} EXCUSE="${String(excuse).slice(0, 200)}" CATEGORY=${category} LEAVE=${leaveByText} LATEST=${budget.latestGetUp} MINUTES_UNTIL_LEAVE=${budget.untilLeave} SNOOZE#=${snoozeCount + 1} QUEST=${quest ?? 'none'}`;
  const msgs = [{ role: 'system', content: SYSTEM }];
  for (const [u, a] of SHOTS) msgs.push({ role: 'user', content: u }, { role: 'assistant', content: a });
  msgs.push({ role: 'user', content: user });
  return msgs;
}

/** Guardrail: every "N min" in the reply must be the granted number (or the real minutes-until-leave). */
export function guard(text, granted, ctx = {}) {
  const allowed = new Set([granted, ctx.untilLeave].filter((n) => n !== undefined));
  const nums = [...String(text ?? '').matchAll(/(\d+)\s*(?:more\s*|extra\s*)?(?:min|minute)/gi)].map((m) => Number(m[1]));
  if (!text || !String(text).trim() || nums.some((n) => !allowed.has(n))) return null;
  if (granted > 0 && !nums.includes(granted) && !new RegExp(`\\b${granted}\\b`).test(text)) return null;
  return String(text).trim();
}

let engine = null;
export const hasModel = () => !!engine;
export async function loadModel(onProgress) {
  const webllm = await import('@mlc-ai/web-llm');
  engine = await webllm.CreateMLCEngine(MODEL_ID, { initProgressCallback: (p) => onProgress?.(p.text) });
  return engine;
}

/** Ask Gemma for a structured category; fall back to heuristics on any failure. */
export async function classify(excuse) {
  if (!engine) return classifyExcuse(excuse);
  try {
    const r = await engine.chat.completions.create({
      messages: [{ role: 'user', content: `Classify this snooze excuse into exactly one category: tired, sick, cold, weekendish, lame, creative.\nExcuse: "${String(excuse).slice(0, 200)}"\nAnswer as JSON like {"category":"tired"} and nothing else.` }],
      temperature: 0, max_tokens: 20,
    });
    const raw = r.choices[0].message.content;
    const m = raw.match(/"category"\s*:\s*"(\w+)"/) || raw.match(/\b(tired|sick|cold|weekendish|lame|creative)\b/i);
    return normalizeCategory(m?.[1], excuse);
  } catch { return classifyExcuse(excuse); }
}

/** Talk. Uses Gemma if loaded, otherwise the line bank. Always guarded. */
export async function speak(ctx, { key, seed = Math.random() * 1000 } = {}) {
  const slots = {
    excuse: ctx.excuse, min: ctx.granted, leave: ctx.leaveByText, latest: ctx.budget?.latestGetUp,
    left: ctx.budget ? `${ctx.budget.untilLeave} min` : '', quest: ctx.quest ?? 'get up a little', count: (ctx.snoozeCount ?? 0) + 1, ask: ctx.requested,
  };
  const fb = () => fallbackLine({ mood: ctx.mood, verdict: ctx.verdict, key, slots, seed });
  if (!engine || key) return fb();
  try {
    const r = await engine.chat.completions.create({ messages: buildMessages(ctx), temperature: 1.0, top_p: 0.95, max_tokens: 160 });
    return guard(r.choices[0].message.content, ctx.granted, { untilLeave: ctx.budget?.untilLeave }) ?? fb();
  } catch { return fb(); }
}

/** Back-compat: guarded text, or a safe template line that states the right number. */
export function enforce(text, granted, ctx = {}) {
  return guard(text, granted, ctx) ?? (granted === 0 ? 'Zero minutes. Feet on the floor, superstar. ☀️' : `Fine. ${granted} minutes. I'll be watching. 👀`);
}
