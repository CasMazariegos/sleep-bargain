# 🐣 Sleep Bargain

Don't hit snooze. **Negotiate.** Tell the alarm "5 more minutes, I was up late" and Meep, a tiny alarm creature powered by **Gemma running entirely in your browser**, bargains with you. It grants exactly as many minutes as your morning can afford, teases weak excuses, and makes counteroffers. Every deal goes in the **Snooze Ledger**.

Built for the DEV Hacktoberfest Open-Source AI Challenge, Week 3 ("Slow and Steady").

Live: https://sleep-bargain.casmazariegos.workers.dev

## How it works
- **Two Gemma brains, one rulebook.**
  - **Default: ☁️ Gemma 4 on Cloudflare Workers AI** (`@cf/google/gemma-4-26b-a4b-it`, thinking off), via `POST /api/negotiate` in `src/worker.js`. Works on every device, iPhone Safari included.
  - **Optional: 📱 on-device Gemma 2 2B with WebLLM**: a toggle that only appears when WebGPU exists (desktop Chrome/Edge). Nothing leaves the device.
  - **Offline: 📜 line bank** if the server can't be reached. The UI always shows which brain answered.
- **Code decides the minutes** (`src/engine.js`, `src/mood.js`, `src/budget.js`), the same logic on server and client. Budget = minutes until leave − ready time − buffer. Leave time stays tied to the real alarm (a stale leave time gets moved to alarm + 75 min).
- **Meep fights back:**
  - Snooze 1: usually a counteroffer around 60% of your ask, capped at 10 min. Full grants only for small asks with a sick or tired excuse.
  - Snooze 2: capped at 5. Snooze 3: a FINAL OFFER capped at 2. Snooze 4 and later: refusal plus a dramatic re-ring.
  - Lame excuses get 2 minutes at most the first time and a flat no after that.
  - Side quests ("drink a full glass of water first") come with almost every offer.
- **You must answer a counteroffer** with the chips: ✅ Accept deal / 🤝 Counter / ❌ No deal / ☀️ Fine, I'm up. Meep meets a counter halfway once, then holds firm. Rejections and overasks count as **Lost** minutes in the ledger.
- **Gemma's jobs:** it classifies the excuse as JSON (tired/sick/cold/weekendish/lame/creative) and writes Meep's reply from a system prompt with few-shot examples. The reply quotes your excuse, mentions your schedule and ends with a verdict.
- **Guardrail:** if Gemma states any minute count other than the granted one, the reply is replaced with a fallback line.
- **Fallback bank:** 80 lines, never repeated in a session. Once they run out, they get remixed with openers.
- **Abuse protection:** excuses are capped at 200 characters, request bodies at 4 KB, and there's a best-effort limit of 30 requests per minute per IP.
- **Alarm:** browser timer + Web Audio beep + vibration/notification (keep the tab open).

## Run it (Windows PowerShell)
```powershell
cd sleep-bargain
npm.cmd install
npm.cmd test        # unit tests for the time-budget logic
npm.cmd run dev     # open the printed http://localhost:5173
npm.cmd run build   # static site in dist/
npx.cmd wrangler deploy   # Worker + static assets + Workers AI binding (wrangler.jsonc)
npx.cmd wrangler dev      # local Worker (AI binding runs remotely)
npx.cmd vite preview
```
Use a recent Chrome or Edge (WebGPU). Click **Load Gemma** once, about 1.5 GB, cached after that.

## Open source inside
- [Gemma 4 26B A4B IT](https://ai.google.dev/gemma) (open-weight, Google) on Cloudflare Workers AI
- [Gemma 2 2B IT](https://ai.google.dev/gemma) (open-weight, Google), MLC build `gemma-2-2b-it-q4f16_1-MLC`
- [WebLLM](https://github.com/mlc-ai/web-llm) (Apache-2.0): in-browser WebGPU inference
- [Vite](https://vitejs.dev) (MIT)

## License
MIT
