// Realistic sample history for demos and screenshots ("Load demo data" is hidden
// behind a long-press on the History title).
//
// The products are made up, but every score is computed by the real scoring
// engine against YOUR current profile, so the verdicts and math are genuine.

import { scoreProduct } from '../scoring/scoreProduct.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// daysAgo: when it was judged. decidedDaysAgo: when you marked bought/skipped.
const SAMPLES = [
  { name: 'AirPods Pro 2', price: 189, category: 'tech', usage: 'daily', daysAgo: 1, status: 'undecided' },
  { name: 'Nintendo Switch 2', price: 449, category: 'gaming', usage: 'weekly', daysAgo: 3, status: 'skipped', decidedDaysAgo: 2 },
  { name: 'Concert tickets', price: 120, category: 'experiences', usage: 'rarely', daysAgo: 5, status: 'skipped', decidedDaysAgo: 4 },
  { name: 'Nike Dunk Low', price: 115, category: 'shoes', usage: 'weekly', daysAgo: 9, status: 'bought', decidedDaysAgo: 8 },
  { name: 'Stanley Quencher 40oz', price: 45, category: 'home', usage: 'daily', daysAgo: 14, status: 'bought', decidedDaysAgo: 13, regret: 'glad' },
  { name: 'Oversized wool blazer', price: 89, category: 'clothes', usage: 'rarely', daysAgo: 20, status: 'skipped', decidedDaysAgo: 18 },
  { name: 'Lululemon belt bag', price: 38, category: 'fitness', usage: 'weekly', daysAgo: 27, status: 'bought', decidedDaysAgo: 26, regret: 'regret' },
  // Older rated purchases, so "What I've learned" has something to show:
  // clothing keeps ending in regret, tech and fitness basics don't.
  { name: 'Graphic tee', price: 35, category: 'clothes', usage: 'weekly', daysAgo: 33, status: 'bought', decidedDaysAgo: 32, regret: 'regret' },
  { name: 'Cargo pants', price: 70, category: 'clothes', usage: 'weekly', daysAgo: 40, status: 'bought', decidedDaysAgo: 39, regret: 'regret' },
  { name: 'Bluetooth speaker', price: 60, category: 'tech', usage: 'weekly', daysAgo: 46, status: 'bought', decidedDaysAgo: 45, regret: 'glad' },
  { name: 'Running shorts', price: 30, category: 'fitness', usage: 'weekly', daysAgo: 52, status: 'bought', decidedDaysAgo: 51, regret: 'glad' },
];

// One short Impulsify line per verdict, so the saved chats look real.
const SAMPLE_REPLY = {
  worth_it: "Honestly? You'd use it all the time and it fits your money. Go for it.",
  sleep_on_it: 'Not a crazy buy, but it takes a real bite out of this month. Give it two days.',
  dont: "That's way more than it's worth to you right now. Skip it.",
};

export function buildDemoHistory(answers, now = new Date()) {
  const ago = (days) => new Date(now.getTime() - days * DAY_MS).toISOString();

  return SAMPLES.map((sample, i) => {
    const product = { name: sample.name, price: sample.price, category: sample.category, usage: sample.usage };
    // Score as if judged in the afternoon of that day, so "late night" never kicks in.
    const judgedAt = new Date(now.getTime() - sample.daysAgo * DAY_MS);
    judgedAt.setHours(15, 0, 0, 0);
    const result = scoreProduct(product, answers, judgedAt);

    return {
      id: `demo-${i + 1}`,
      createdAt: ago(sample.daysAgo),
      product,
      result,
      chat: [{ role: 'assistant', content: SAMPLE_REPLY[result.verdict.id] }],
      status: sample.status,
      decidedAt: sample.decidedDaysAgo !== undefined ? ago(sample.decidedDaysAgo) : null,
      regret: sample.regret ?? null,
      reminderId: null,
    };
  });
}
