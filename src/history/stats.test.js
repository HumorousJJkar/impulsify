// Tests for history stats. Run with: npm test

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dueRegretChecks, MEMORY_SIZE, recentForMemory, REGRET_CHECK_DAYS, summarize } from './stats.js';

const NOW = new Date('2026-11-20T12:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

function entry(id, overrides = {}) {
  return {
    id,
    createdAt: daysAgo(1),
    product: { name: `Item ${id}`, price: 100, category: 'shoes', usage: 'weekly' },
    result: { score: 50, verdict: { id: 'sleep_on_it', label: 'Sleep on it (wait 48h)' } },
    chat: [],
    status: 'undecided',
    decidedAt: null,
    regret: null,
    reminderId: null,
    ...overrides,
  };
}

test('summarize counts statuses and totals skipped money as saved', () => {
  const s = summarize([
    entry('a', { status: 'skipped', product: { name: 'A', price: 120.5, category: 'tech', usage: 'daily' } }),
    entry('b', { status: 'skipped', product: { name: 'B', price: 79.5, category: 'tech', usage: 'daily' } }),
    entry('c', { status: 'bought', regret: 'regret' }),
    entry('d', { status: 'bought', regret: 'glad' }),
    entry('e', { status: 'bought' }),
    entry('f'),
  ]);

  assert.equal(s.total, 6);
  assert.equal(s.skippedCount, 2);
  assert.equal(s.boughtCount, 3);
  assert.equal(s.undecidedCount, 1);
  assert.equal(s.moneySaved, 200);
  assert.equal(s.moneySpent, 300);
  assert.equal(s.regretAnswered, 2);
  assert.equal(s.regretCount, 1);
});

test('summarize of an empty history is all zeros', () => {
  assert.deepEqual(summarize([]), {
    total: 0, boughtCount: 0, skippedCount: 0, undecidedCount: 0,
    moneySaved: 0, moneySpent: 0, regretAnswered: 0, regretCount: 0,
  });
});

test('regret check is due only for unanswered purchases old enough', () => {
  const due = dueRegretChecks(
    [
      entry('new', { status: 'bought', decidedAt: daysAgo(REGRET_CHECK_DAYS - 1) }),
      entry('old', { status: 'bought', decidedAt: daysAgo(REGRET_CHECK_DAYS + 3) }),
      entry('older', { status: 'bought', decidedAt: daysAgo(REGRET_CHECK_DAYS + 10) }),
      entry('answered', { status: 'bought', decidedAt: daysAgo(30), regret: 'glad' }),
      entry('skipped', { status: 'skipped', decidedAt: daysAgo(30) }),
    ],
    NOW,
  );
  assert.deepEqual(
    due.map((e) => e.id),
    ['older', 'old'],
  );
});

test('memory leaves out the current item, keeps the newest, and uses readable labels', () => {
  const entries = Array.from({ length: MEMORY_SIZE + 3 }, (_, i) => entry(`e${i}`, { createdAt: daysAgo(i) }));
  const memory = recentForMemory(entries, 'e0', NOW);

  assert.equal(memory.length, MEMORY_SIZE);
  assert.equal(memory[0].name, 'Item e1');
  assert.equal(memory[0].category, 'Shoes');
  assert.equal(memory[0].verdict, 'Sleep on it (wait 48h)');
  assert.equal(memory[0].daysAgo, 1);
});
