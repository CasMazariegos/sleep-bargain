// Gemma (via WebLLM) writes the words. Numbers come from budget.js and are enforced after generation.
export const MODEL_ID = 'gemma-2-2b-it-q4f16_1-MLC';

export function buildPrompt({ excuse, requested, deal, budget, leaveByText }) {
  return `You are Meep, a tiny, sassy-but-kind alarm clock creature. The human wants to snooze.
Human said: "${excuse}"
They asked for ${requested} minutes. They must leave by ${leaveByText}; latest sane get-up time is ${budget.latestGetUp}.
THE DEAL IS ALREADY DECIDED: verdict=${deal.verdict}, granted=${deal.granted} minutes.
Write 1-3 short playful sentences as Meep. Mention exactly ${deal.granted} minutes. ${deal.verdict === 'countered' ? `Make it a counteroffer of ${deal.granted} minutes and tease the excuse a little.` : ''}${deal.verdict === 'denied' ? 'Refuse warmly: zero minutes, they must get up NOW.' : ''}
Never offer any other number of minutes.`;
}

/** Guardrail: if the model mentions a different minute count, fall back to template text. */
export function enforce(text, granted) {
  const nums = [...String(text).matchAll(/(\d+)\s*(?:more\s*)?min/gi)].map((m) => Number(m[1]));
  if (!text || nums.some((n) => n !== granted)) return fallbackLine(granted);
  return text.trim();
}

export function fallbackLine(granted, verdict) {
  if (granted === 0) return 'Meep says no. Zero minutes. Feet on the floor, superstar. ☀️';
  if (verdict === 'countered') return `Counteroffer: ${granted} minutes. Take it or I start singing.`;
  return `Fine. ${granted} minutes. I'll be watching. 👀`;
}

let engine = null;
export async function loadModel(onProgress) {
  const webllm = await import('@mlc-ai/web-llm');
  engine = await webllm.CreateMLCEngine(MODEL_ID, { initProgressCallback: (p) => onProgress?.(p.text) });
  return engine;
}

export async function negotiate(ctx) {
  if (!engine) return fallbackLine(ctx.deal.granted, ctx.deal.verdict);
  const r = await engine.chat.completions.create({
    messages: [{ role: 'user', content: buildPrompt(ctx) }],
    temperature: 0.9, max_tokens: 120,
  });
  return enforce(r.choices[0].message.content, ctx.deal.granted);
}
