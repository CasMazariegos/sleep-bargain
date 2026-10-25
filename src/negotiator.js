// Browser brains: server Gemma (default), on-device WebLLM Gemma (optional), or offline fallback lines.
import { turn } from './engine.js';
import { buildMessages, CLASSIFY_PROMPT, extractText, guard, SYSTEM } from './prompt.js';
export { guard, buildMessages, SYSTEM };

export const MODEL_ID = 'gemma-2-2b-it-q4f16_1-MLC';
let engine = null;
export const hasModel = () => !!engine;
export async function loadModel(onProgress) {
  const webllm = await import('@mlc-ai/web-llm');
  engine = await webllm.CreateMLCEngine(MODEL_ID, { initProgressCallback: (p) => onProgress?.(p.text) });
  return engine;
}

/** Back-compat helper: guarded text, or a safe line stating the right number. */
export function enforce(text, granted, ctx = {}) {
  return guard(text, granted, ctx) ?? (granted === 0 ? 'Zero minutes. Feet on the floor, superstar. ☀️' : `Fine. ${granted} minutes. I'll be watching. 👀`);
}

export async function negotiateServer(body) {
  const r = await fetch('/api/negotiate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
  return r.json();
}

export function negotiateLocal(body) {
  return turn(body, engine ? {
    brain: 'gemma-on-device',
    classify: async (excuse) => {
      const t = extractText(await engine.chat.completions.create({ messages: [{ role: 'user', content: CLASSIFY_PROMPT(excuse) }], temperature: 0, max_tokens: 20 }));
      return (t.match(/"category"\s*:\s*"(\w+)"/) || t.match(/\b(tired|sick|cold|weekendish|lame|creative)\b/i))?.[1] ?? null;
    },
    // WebLLM's Gemma template has no system role: fold it into the first user turn.
    talk: async (ctx) => {
      const [sys, ...rest] = buildMessages(ctx);
      rest[0] = { role: 'user', content: `${sys.content}\n\n${rest[0].content}` };
      return extractText(await engine.chat.completions.create({ messages: rest, temperature: 0.95, top_p: 0.95, max_tokens: 160 }));
    },
  } : {});
}
