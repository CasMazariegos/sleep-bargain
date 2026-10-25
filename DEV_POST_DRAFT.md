---
title: "I Taught My Alarm Clock to Negotiate (and It Runs Gemma On-Device)"
published: false
tags: devchallenge, hf26challenge, gemma, opensource
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge: Week 3](https://dev.to/challenges/hacktoberfest-week3-2026-10-19).*

## What I Built

I'm a snoozer. A serial, unapologetic snoozer. The trouble is that the snooze button is dumb. It gives me 9 minutes whether I can afford them or not.

So I built **Sleep Bargain**. When the alarm rings, you don't smash a button. You *bargain*. "5 more minutes, I was up late." Meep, a tiny sassy alarm creature, checks your morning and answers.

If you can afford it, you get it. If your excuse is "my bed is cozy," Meep counteroffers. If you're already cutting it close, Meep says no, warmly but firmly. Every deal lands in a **Snooze Ledger**, so you can see how many minutes you won (and lost) this week.

## Demo

<!-- TODO: deployed link + GIF/video of a ring → negotiate → counteroffer -->

## Code

<!-- TODO: {% github CasMazariegos/sleep-bargain %} -->

## How I Built It

It's a tiny static site: plain JavaScript, Vite, and **WebLLM** running **Gemma 2 2B** right in the browser over WebGPU. No server, no API key, no account. It's served as static assets on Cloudflare Workers.

The most important rule: **the model never picks the number.** Plain code does the minutes. Max snooze = time until you leave − getting-ready time − a safety buffer. That logic has unit tests, because nobody should be late to work because an AI felt generous.

Gemma gets two jobs instead.

**Job one: judge your excuse.** Gemma sorts it into a category (tired, sick, cold, weekend-ish, lame, or creative) and returns it as tiny JSON. The code turns that into a share of your budget. Sick gets almost all of it. "My bed is comfy" gets a fifth. If Gemma's JSON comes back weird, a keyword classifier steps in.

**Job two: be Meep.** I gave Gemma a system prompt and a few example replies. Meep has to quote your actual excuse, mention your real leave time, and end with a clear verdict. Then a guardrail reads the reply. If Gemma mentions any minute count except the one the code decided, the reply gets tossed.

Meep also has moods. She's generous on your first good excuse, suspicious by snooze two 🤨, fed up by snooze three 😤, and dramatic when there's no time left 😱. When you finally get up, she's triumphant 🏆.

And you can **haggle**. Meep makes counteroffers with side quests: "I'll give you 6 if you skip the second episode of doom-scrolling." Tap *Accept deal*, *Counter*, or *Fine, I'm up*. She'll meet you halfway once. After that, she holds the line.

No WebGPU? Meep still works with a bank of 70+ handwritten lines, sorted by mood and verdict, that fill in your excuse and your times. It's fun either way.

## Why Does Open Innovation Matter?

An alarm lives in your bedroom. It hears your excuses at your sleepiest. That should stay on *your* device.

Because Gemma is open-weight and WebLLM is open source, Meep runs locally, works without sending a thing to a server, and costs nothing to use. Anyone can fork it, change Meep's personality, or swap in a different open model. Open tools let a small, silly idea like this exist without a cloud bill.

## My Agent Session

<!-- TODO (Cassandra): notes from my Claude Code / ChatGPT session -->

## The Lazy Payoff

I get to stay in bed and *feel* productive. I negotiated! I won 7 minutes! And because the math is honest, those 7 minutes are actually free. No guilt, no sprinting to the car.

Slow and steady wins the race. Slow and *strategic* wins the snooze.

## Prize Categories

**Best Use of Gemma.** Gemma 2 2B runs fully on-device through WebLLM and powers every one of Meep's negotiation replies.
