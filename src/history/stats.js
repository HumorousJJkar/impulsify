// Numbers and summaries computed from your saved history. Pure functions, no
// React or storage, so they're unit-tested in stats.test.js.
//
// A history entry looks like:
//   { id, createdAt, product: { name, price, category, usage }, result: <scoreProduct result>,
//     chat: [...], status: 'undecided' | 'bought' | 'skipped', decidedAt, regret: null | 'glad' | 'regret',
//     reminderId }

import { CATEGORIES } from '../questions.js';

// How long after you mark something Bought before the app asks "still glad?".
// Set to 0 to see the regret check immediately (handy for a demo).
export const REGRET_CHECK_DAYS = 7;

// How many recent items Impulsify gets to "remember" when it talks to you.
export const MEMORY_SIZE = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

export function summarize(entries) {
  const bought = entries.filter((e) => e.status === 'bought');
  const skipped = entries.filter((e) => e.status === 'skipped');
  const answeredRegret = bought.filter((e) => e.regret !== null);

  return {
    total: entries.length,
    boughtCount: bought.length,
    skippedCount: skipped.length,
    undecidedCount: entries.length - bought.length - skipped.length,
    moneySaved: roundCents(skipped.reduce((sum, e) => sum + e.product.price, 0)),
    moneySpent: roundCents(bought.reduce((sum, e) => sum + e.product.price, 0)),
    regretAnswered: answeredRegret.length,
    regretCount: answeredRegret.filter((e) => e.regret === 'regret').length,
  };
}

// Bought items old enough for the "still glad you got it?" question, oldest first.
export function dueRegretChecks(entries, now = new Date()) {
  return entries
    .filter((e) => e.status === 'bought' && e.regret === null && e.decidedAt)
    .filter((e) => now - new Date(e.decidedAt) >= REGRET_CHECK_DAYS * DAY_MS)
    .sort((a, b) => new Date(a.decidedAt) - new Date(b.decidedAt));
}

// A short, readable list of your recent items for Impulsify's memory.
// `excludeId` leaves out the item currently being discussed.
export function recentForMemory(entries, excludeId, now = new Date()) {
  return entries
    .filter((e) => e.id !== excludeId)
    .slice(0, MEMORY_SIZE) // entries are stored newest first
    .map((e) => ({
      name: e.product.name,
      price: e.product.price,
      category: CATEGORIES.find((c) => c.value === e.product.category)?.label ?? e.product.category,
      verdict: e.result.verdict.label,
      status: e.status,
      regret: e.regret,
      daysAgo: Math.floor((now - new Date(e.createdAt)) / DAY_MS),
    }));
}

function roundCents(n) {
  return Math.round(n * 100) / 100;
}
