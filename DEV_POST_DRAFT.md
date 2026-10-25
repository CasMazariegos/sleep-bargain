---
title: "I Taught My Alarm Clock to Negotiate (and It Runs Gemma On-Device)"
published: false
tags: devchallenge, hf26challenge, gemma, opensource
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge: Week 3](https://dev.to/challenges/hacktoberfest-week3-2026-10-19).*

## What I Built

I'm a snoozer. A serial, unapologetic snoozer. The trouble is that the snooze button is dumb. It gives me 9 minutes whether I can afford them or not.

So I built **Meep Snooze Negotiator**. When the alarm rings, you don't smash a button. You *bargain*. "5 more minutes, I was up late." Meep, a tiny sassy alarm creature, checks your morning and answers.

If you can afford it, you get it. If your excuse is "my bed is cozy," Meep counteroffers. If you're already cutting it close, Meep says no, warmly but firmly. Every deal lands in a **Snooze Ledger**, so you can see how many minutes you won (and lost) this week.

## Demo

<!-- TODO: deployed link + GIF/video of a ring → negotiate → counteroffer -->

## Code

<!-- TODO: {% github cassandra/snooze-negotiator %} -->

## How I Built It

It's a tiny static site: plain JavaScript, Vite, and **WebLLM** running **Gemma 2 2B** right in the browser over WebGPU. No server, no API key, no account.

The most important design choice: **the model never picks the number.** The minutes come from plain code. Max snooze = time until you leave − getting-ready time − a safety buffer. A simple excuse score then decides if you get the full budget or a counteroffer. That logic has unit tests, because nobody should be late to work because an AI felt generous.

Gemma gets the deal that's already been decided and does what it's great at: personality. It writes Meep's reply, teases bad excuses, and makes the counteroffer sound fun. Then a small guardrail checks the reply, and if Gemma mentions any other number of minutes, it gets swapped for a safe line.

The alarm itself is just a browser timer, a Web Audio beep, and a notification. Lazy in the best way.

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
