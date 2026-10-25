// Cloudflare Worker: static assets + POST /api/negotiate powered by Gemma on Workers AI.
import { turn } from './engine.js';
import { buildMessages, CLASSIFY_PROMPT, extractText } from './prompt.js';

export const MODEL = '@cf/google/gemma-4-26b-a4b-it';
// Gemma 4 is a reasoning model; turn thinking off so replies are snappy and land in `content`.
export const OPTS = { chat_template_kwargs: { enable_thinking: false } };
const hits = new Map(); // best-effort per-isolate rate limit
const LIMIT = 30, WINDOW = 60_000;

export function rateLimited(ip, now = Date.now()) {
  const h = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  h.push(now); hits.set(ip, h);
  if (hits.size > 5000) hits.clear();
  return h.length > LIMIT;
}
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function negotiate(body, env) {
  const ai = env?.AI;
  const debug = { errors: [], raw: null };
  const res = await turn(body, {
    brain: 'gemma-server',
    classify: ai ? async (excuse) => {
      let r; try { r = await ai.run(MODEL, { messages: [{ role: 'user', content: CLASSIFY_PROMPT(excuse) }], temperature: 0, max_tokens: 30, ...OPTS }); }
      catch (e) { debug.errors.push('classify: ' + String(e?.message ?? e).slice(0, 200)); throw e; }
      const t = extractText(r); debug.classifyRaw = String(t).slice(0, 100);
      return (t.match(/"category"\s*:\s*"(\w+)"/) || t.match(/\b(tired|sick|cold|weekendish|lame|creative)\b/i))?.[1] ?? null;
    } : null,
    talk: ai ? async (ctx) => {
      try { const t = extractText(await ai.run(MODEL, { messages: buildMessages(ctx), temperature: 0.95, max_tokens: 220, ...OPTS })); debug.raw = String(t).slice(0, 400); return t; }
      catch (e) { debug.errors.push('talk: ' + String(e?.message ?? e).slice(0, 200)); throw e; }
    } : null,
  });
  if (body?.debug === true) res.debug = debug;
  return res;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/negotiate') {
      if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
      const ip = request.headers.get('cf-connecting-ip') ?? 'anon';
      if (rateLimited(ip)) return json({ error: 'Meep needs a breather. Try again in a minute.' }, 429);
      const len = Number(request.headers.get('content-length') ?? 0);
      if (len > 4000) return json({ error: 'Too long' }, 413);
      let body;
      try { const text = await request.text(); if (text.length > 4000) return json({ error: 'Too long' }, 413); body = JSON.parse(text); }
      catch { return json({ error: 'Bad JSON' }, 400); }
      try { return json(await negotiate(body, env)); }
      catch (e) { return json({ error: 'Meep tripped', detail: String(e?.message ?? e).slice(0, 200) }, 500); }
    }
    return env.ASSETS.fetch(request);
  },
};
