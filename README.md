# 🐣 Sleep Bargain

Don't hit snooze. **Negotiate.** Tell the alarm "5 more minutes, I was up late" and Meep, a tiny alarm creature powered by **Gemma running entirely in your browser**, bargains with you. It grants exactly as many minutes as your morning can afford, teases weak excuses, and makes counteroffers. Every deal goes in the **Snooze Ledger**.

Built for the DEV Hacktoberfest Open-Source AI Challenge, Week 3 ("Slow and Steady").

Live: https://sleep-bargain.casmazariegos.workers.dev

## How it works
- **You enter:** alarm time, when you must leave, how long getting ready takes, and a safety buffer.
- **Code does the math** (`src/budget.js`, `src/mood.js`): max snooze = time until leaving − ready time − buffer. The excuse category sets Meep's share of that budget (sick 95%, tired 80%, creative 75%, cold 60%, weekend-ish 45%, lame 20%), and every repeat snooze shrinks it by 20% more. Deterministic and unit-tested.
- **Gemma classifies the excuse** as structured JSON (`tired / sick / cold / weekendish / lame / creative`). Bad output falls back to a keyword classifier.
- **Moods:** generous 🥰, sassy 💅, amused 😂, suspicious 🤨 (repeat snoozes), exasperated 😤 (3+), dramatic 😱 (budget nearly gone), triumphant 🏆 (you got up).
- **Multi-turn haggling:** Meep counteroffers with a side quest ("6 minutes if you skip the second episode of doom-scrolling"). Accept, reject, or counter: Meep meets you halfway once, then holds firm, and never goes over budget.
- **Gemma does the talking** (`src/negotiator.js`): a system prompt with few-shot examples makes Meep react to your exact excuse, mention your real leave time / latest get-up time, and end with a clear verdict (temperature 1.0, 160 tokens max). A guardrail rejects any reply that states a different number of minutes.
- **No WebGPU?** A 70+ line fallback bank (`src/lines.js`), split by mood and verdict with slots for your excuse, times and side quest, keeps Meep fun.
- **UI:** mood indicator, typing indicator, quick-reply chips (Accept deal / Counter / No deal / Fine, I'm up), snooze ledger.
- **Alarm:** browser timer + Web Audio beep + notification (keep the tab open).

## Run it (Windows PowerShell)
```powershell
cd sleep-bargain
npm.cmd install
npm.cmd test        # unit tests for the time-budget logic
npm.cmd run dev     # open the printed http://localhost:5173
npm.cmd run build   # static site in dist/
npx.cmd wrangler deploy   # Cloudflare Workers static assets (wrangler.jsonc)
npx.cmd vite preview
```
Use a recent Chrome or Edge (WebGPU). Click **Load Gemma** once, about 1.5 GB, cached after that.

## Open source inside
- [Gemma 2 2B IT](https://ai.google.dev/gemma) (open-weight, Google), MLC build `gemma-2-2b-it-q4f16_1-MLC`
- [WebLLM](https://github.com/mlc-ai/web-llm) (Apache-2.0): in-browser WebGPU inference
- [Vite](https://vitejs.dev) (MIT)

## License
MIT
