// Fallback line bank. Slots: {excuse} {min} {leave} {latest} {left} {quest} {count} {ask}
export const LINES = {
  generous: {
    accepted: [
      '"{excuse}"? Oh, sweet sleepy bean. Take your {min} minutes. You leave at {leave}, so I\'m back at you before {latest}. Deal sealed with a tiny Meep kiss. 💤',
      'Honestly? Valid. "{excuse}" hits my heart right in the gears. {min} minutes, granted. Latest get-up is {latest}, and I WILL be loud.',
      'Okay okay, I\'m soft today. {min} minutes because "{excuse}" sounds rough. You\'ve got {left} until {leave}, so we\'re fine. Verdict: approved. 🥰',
      'The Meep council has reviewed "{excuse}" and voted yes. {min} minutes. Dream fast. Out the door by {leave}.',
      'Fine, you earned it. {min} minutes of blanket burrito time. I\'ll ring before {latest}, no exceptions. Approved! 🌙',
      '"{excuse}"... say less. {min} minutes are yours. {leave} is still the boss of us though. Granted.',
    ],
    countered: [
      'Aww, "{excuse}" is cute, but {ask} minutes? Your {leave} departure says no. I can do {min} if you {quest}. Deal?',
      'I love you, but the math doesn\'t. Latest get-up is {latest}. Counteroffer: {min} minutes, and you {quest}. 🤝',
      'Mmm, "{excuse}". Sympathetic! Still not {ask} minutes sympathetic. {min}, plus you {quest}. Take it?',
    ],
  },
  sassy: {
    accepted: [
      '"{excuse}". Wow. Groundbreaking. Fine, {min} minutes, but only because I\'m a professional. Latest get-up: {latest}. 💅',
      'That excuse wouldn\'t pass a kindergarten review. {min} minutes anyway. Don\'t make me regret this. Leave by {leave}.',
    ],
    countered: [
      '"{excuse}"?? That\'s not an excuse, that\'s a vibe. I\'ll give you {min} minutes, not {ask}, and you {quest}. Final-ish offer.',
      'Bestie. "{excuse}" is weak. {ask} minutes is a fantasy. Counteroffer: {min}, and you {quest}. Clock\'s ticking toward {leave}.',
      'I\'ve heard better excuses from a toaster. {min} minutes. Condition: {quest}. Yes or no, sleepyhead? 💅',
      'Let me get this straight: "{excuse}" is your whole argument? {min} minutes, take it or I start playing kazoo at {latest}.',
      'Nope, not {ask}. You leave at {leave}. I can spare {min}, IF you {quest}. Clock\'s running.',
    ],
  },
  amused: {
    accepted: [
      '"{excuse}" 😂 Okay, that\'s the best one I\'ve heard all week. {min} minutes for creativity. Latest get-up is {latest}.',
      'I\'m laughing too hard to argue. {min} minutes, granted for artistic merit. You still leave at {leave}.',
      'Points for storytelling! "{excuse}" earns you {min} minutes. Gold star. Now hush and sleep. ⭐',
    ],
    countered: [
      'Ha! "{excuse}" is pure fiction and I respect it. Not {ask} though. {min} minutes if you {quest}.',
      'Okay novelist, "{excuse}" is gorgeous prose. The budget says {min} minutes. Condition: {quest}. Deal?',
      'I\'d give you an award for "{excuse}", but you leave at {leave}. {min} minutes and you {quest}. 🎭',
    ],
  },
  suspicious: {
    accepted: [
      'Snooze number {count}, hmm? "{excuse}" again-ish. Fine. {min} minutes. I\'m writing this down. Latest get-up: {latest}. 🤨',
      'I see you. Round {count}. {min} minutes, and that\'s me being nice. You leave at {leave}.',
    ],
    countered: [
      'Wait. This is snooze {count}. And now it\'s "{excuse}"? Suspicious. {min} minutes, not {ask}, and you {quest}.',
      'Round {count}, huh? My eyebrow is fully raised. {min} minutes if you {quest}. Latest get-up is {latest}.',
      'I\'ve got a ledger, sleepyhead. Snooze {count}. I can do {min} if you {quest}. Otherwise up. 🤨',
      'Funny how "{excuse}" showed up right at snooze {count}. {min} minutes. Condition: {quest}.',
      'Is this a pattern? Snooze {count}. Smells like a pattern. {min}, and you {quest}. Take it.',
    ],
  },
  exasperated: {
    accepted: [
      'Snooze {count}. SNOOZE. {count}. Fine, {min} minutes, but I\'m telling your future self. Leave by {leave}. 😤',
      'I\'m tired too, you know. {min} minutes. LAST one. Latest get-up {latest}.',
    ],
    countered: [
      'I have rung {count} times. "{excuse}" doesn\'t move me anymore. {min} minutes and you {quest}. Last offer.',
      'We are {count} snoozes deep. My patience is a crumb. {min} minutes, condition: {quest}. 😤',
      'Ugh. Snooze {count}! Not {ask}. {min}. And you {quest}. Then UP.',
      'I\'m filing a complaint with the Meep union. {min} minutes, and you {quest}. You leave at {leave}!',
    ],
  },
  dramatic: {
    denied: [
      'NO. Absolutely not. You leave at {leave} and you needed to be up by {latest}. "{excuse}" cannot save you now. ZERO minutes. 😱',
      'The clock is SCREAMING. I am SCREAMING. Zero minutes! Feet on the floor! {leave} waits for no one!',
      '"{excuse}"?! There is no time for "{excuse}"! Zero. Zilch. Up up UP. You leave at {leave}!',
      'Do you hear that? That\'s the sound of you being late. Zero minutes. GO. 🚨',
      'I would love to say yes. I physically cannot. Zero minutes left in the budget. Rise, my sleepy phoenix!',
      'Code red! Code RED! Latest get-up was {latest}. No snooze. Move! 😱',
    ],
    accepted: [
      'This is the LAST crumb of time. {min} minutes. One. More. Tiny. Nap. Then we RUN. Leave at {leave}. 😱',
      'Against my better judgment and all known physics: {min} minutes. Then chaos. Leave at {leave}.',
    ],
    countered: [
      'We are on the EDGE. {min} minutes, MAX, and you {quest}. This is not a drill!',
      'Not {ask}! I can scrape together {min} minutes, and you {quest}. Then we sprint to {leave}!',
    ],
  },

  final: {
    final: [
      'FINAL OFFER. Snooze {count}. I am down to {min} minutes and you {quest}. Take it or rise. 😤',
      'This is it. The last bargain in the history of mornings: {min} minutes, and you {quest}. No more after this!',
      'Snooze {count}?! My final, absolutely final, I-mean-it offer: {min} minutes. Condition: {quest}. Then UP.',
      'Listen closely, because I won\'t say it again. {min} minutes. You {quest}. After that the bed is lava. 🌋',
      'Last crumb on the table: {min} minutes, and you {quest}. You leave at {leave}. Choose wisely.',
      'Meep\'s final offer, sealed in glitter: {min} minutes, and you {quest}. There is no snooze {count}+1.',
    ],
  },
  refuse: {
    denied: [
      'Nope. "{excuse}" doesn\'t get a single minute. Zero. Up you get. ☀️',
      'Absolutely not. You already used that energy. Zero minutes. Feet. On. Floor.',
      '"{excuse}"? Denied. Stamped. Filed. Zero minutes, sleepyhead.',
      'Snooze {count}? We are DONE negotiating. Zero minutes. I\'m ringing again. 🔔',
      'The bargaining table is closed. Zero minutes. You leave at {leave}!',
      'I gave you chances. So many chances. Zero minutes now. UP. 😤',
      'No more deals. The ledger says you owe me a morning. Zero minutes.',
      'Hard no. Even my snooze button is tired of you. Zero minutes. Rise!',
      'Not happening, superstar. Zero minutes. Go drink some water and be a person.',
      'Meep has left the chat... just kidding, Meep is LOUDER now. Zero minutes!',
    ],
  },
  holding: [
    'Nice try. My offer stays at {min} minutes. Accept it or get up. 🙃',
    'I don\'t haggle twice, sweetie. {min} minutes. That\'s the deal.',
    '{ask}? Cute. Still {min}. You leave at {leave}, remember?',
    'Meep has spoken. {min} minutes, or rise and shine. Your choice.',
    'The budget doesn\'t stretch, babe. {min} minutes is the ceiling.',
  ],
  meetHalfway: [
    'Ugh, fine, I\'ll meet you halfway: {min} minutes. Final answer. 🤝',
    'You drive a hard bargain. {min} minutes. Shake my tiny hand.',
    'Halfsies! {min} minutes. Don\'t push your luck.',
  ],
  accepted: [
    'Deal! {min} minutes on the clock. I\'ll ring before {latest}. 😴',
    'Pleasure doing business. {min} minutes, starting now.',
    'Signed, sealed, snoozed. {min} minutes. See you soon.',
  ],
  rejected: [
    'No deal? Then no snooze. Up you go! ☀️',
    'You rejected my generous offer. Bold. That means UP.',
    'Walking away from the table? Then walk to the bathroom. Good morning!',
  ],
  triumphant: [
    'YOU\'RE UP! 🏆 Champion of mornings! You beat {leave} with style.',
    'Look at you, a vertical human! I\'m so proud I could beep.',
    'Victory! The ledger will remember this day. Go be wonderful. ✨',
    'UP! The blankets lose, you win. Leave by {leave}, you legend.',
    'Upright and gorgeous. Meep is retiring for the day. 🏆',
  ],
};

const OPENERS = ['Hmm.', 'Okay, listen.', 'Babe.', 'Ahem.', 'Wow.', 'Oh honey.', 'Right.', 'Real talk:', 'Fun fact:', 'Breaking news:', 'Sigh.', 'Plot twist:'];
const used = new Set();
export function resetUsed() { used.clear(); }

export function fillSlots(tpl, slots) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (slots[k] !== undefined && slots[k] !== null ? String(slots[k]) : m));
}

function pool(mood, verdict, key) {
  if (key) return [LINES[key] ?? LINES.accepted];
  const own = LINES[mood]?.[verdict];
  const shared = verdict === 'denied' ? [LINES.refuse.denied, LINES.dramatic.denied]
    : verdict === 'final' ? [LINES.final.final]
    : Object.values(LINES).filter((v) => !Array.isArray(v) && v[verdict]).map((v) => v[verdict]);
  return [own, ...shared].filter(Boolean);
}

/** Pick a line by mood + verdict (or a flat key), never repeating a line this session. */
export function fallbackLine({ mood, verdict, key, slots, seed = 0 }) {
  const s = { ...slots };
  if (s.excuse) s.excuse = String(s.excuse).slice(0, 60);
  const fill = (t) => fillSlots(t, s).replace(/\b1 minutes\b/g, '1 minute');
  const banks = pool(mood, verdict, key);
  for (const bank of banks) {
    for (let i = 0; i < bank.length; i++) {
      const tpl = bank[(Math.abs(Math.floor(seed)) + i) % bank.length];
      const line = fill(tpl);
      if (!used.has(line)) { used.add(line); return line; }
    }
  }
  // Everything used: remix with an opener so wording still varies.
  for (let n = 0; n < 200; n++) {
    const bank = banks[n % banks.length];
    const line = `${OPENERS[(Math.floor(seed) + n) % OPENERS.length]} ${fill(bank[(Math.floor(seed) + n) % bank.length])}`;
    if (!used.has(line)) { used.add(line); return line; }
  }
  return fill(banks[0][0]);
}

export function lineCount() {
  let n = 0;
  const walk = (o) => (Array.isArray(o) ? (n += o.length) : Object.values(o).forEach(walk));
  walk(LINES);
  return n;
}
