# 🐣 Sleep Bargain

Don't hit snooze. **Negotiate.** Tell the alarm "5 more minutes, I was up late" and Meep, a tiny alarm creature powered by **Gemma running entirely in your browser**, bargains with you. It grants exactly as many minutes as your morning can afford, teases weak excuses, and makes counteroffers. Every deal goes in the **Snooze Ledger**.

Built for the DEV Hacktoberfest Open-Source AI Challenge, Week 3 ("Slow and Steady").

## How it works
- **You enter:** alarm time, when you must leave, how long getting ready takes, and a safety buffer.
- **Code does the math** (`src/budget.js`): max snooze = time until leaving − ready time − buffer. A simple excuse score (good excuse = full budget, meh = 75%, bad = 50%) sets the deal. That part is deterministic and unit-tested.
- **Gemma does the talking** (`src/negotiator.js`): it gets the deal that was already decided and writes Meep's reply. A guardrail rejects any reply that mentions a different number of minutes and swaps in a template line.
- **Alarm:** browser timer + Web Audio beep + notification (keep the tab open).
- **No WebGPU?** The math still works and Meep uses built-in lines.

## Run it (Windows PowerShell)
```powershell
cd sleep-bargain
npm.cmd install
npm.cmd test        # unit tests for the time-budget logic
npm.cmd run dev     # open the printed http://localhost:5173
npm.cmd run build   # static site in dist/ (deploy anywhere static)
npx.cmd vite preview
```
Use a recent Chrome or Edge (WebGPU). Click **Load Gemma** once, about 1.5 GB, cached after that.

## Open source inside
- [Gemma 2 2B IT](https://ai.google.dev/gemma) (open-weight, Google), MLC build `gemma-2-2b-it-q4f16_1-MLC`
- [WebLLM](https://github.com/mlc-ai/web-llm) (Apache-2.0): in-browser WebGPU inference
- [Vite](https://vitejs.dev) (MIT)

## License
MIT
