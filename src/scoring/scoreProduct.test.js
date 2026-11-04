// Tests for the scoring engine. Run with: npm test
//
// Uses Node's built-in test runner (node:test), so no extra libraries.
// It works like JUnit: each test() is one case, and assert.equal(actual, expected)
// fails the test if they don't match.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWeights, scoreProduct } from './scoreProduct.js';

// A fixed afternoon time so the late-night factor never kicks in by accident.
const AFTERNOON = new Date(2026, 0, 1, 14, 0);

// The test profile from the Round 2 design discussion.
function baseAnswers(overrides = {}) {
  return {
    monthlyBudget: 200,
    savingGoal: { active: true, item: 'Car', target: '3000' },
    incomeStability: 'part_time',
    priorities: ['tech', 'fitness', 'gaming'],
    cutBack: ['clothes'],
    regretLevel: 3,
    triggers: ['late_night', 'sales'],
    returnFrequency: 'often',
    ...overrides,
  };
}

function product(overrides = {}) {
  return { name: 'Headphones', price: 150, category: 'tech', usage: 'daily', ...overrides };
}

function pointsFor(result, id) {
  return result.factors.find((f) => f.id === id)?.points;
}

test('worked example from the design: $150 daily-use headphones -> 42, sleep on it', () => {
  const result = scoreProduct(product(), baseAnswers(), AFTERNOON);

  assert.equal(result.strictness, 1.1);
  assert.equal(pointsFor(result, 'budget'), -27.5); // -25 x 1.1
  assert.equal(pointsFor(result, 'category'), 15);
  assert.equal(pointsFor(result, 'costPerUse'), 15);
  assert.equal(pointsFor(result, 'savingGoal'), -11); // -10 x 1.1
  assert.equal(result.score, 42); // 50 + 30 - 38.5 = 41.5, rounds to 42
  assert.equal(result.verdict.id, 'sleep_on_it');
});

test('cheap, priority, used daily -> worth it', () => {
  const result = scoreProduct(product({ price: 15 }), baseAnswers(), AFTERNOON);
  // budget 7.5% -> +15, priority +15, $0.04/use -> +15, 0.5% of goal -> 0
  assert.equal(result.score, 95);
  assert.equal(result.verdict.id, 'worth_it');
});

test('over budget, cut-back category, rarely used -> do not buy, clamped at 0', () => {
  const result = scoreProduct(product({ price: 500, category: 'clothes', usage: 'rarely' }), baseAnswers(), AFTERNOON);
  // budget -40, category -20, $166/use -> -20, 16.7% of goal -> -10; all x 1.1 = -99
  assert.equal(result.score, 0);
  assert.equal(result.verdict.id, 'dont');
});

test('tier boundaries are inclusive: exactly 10% of budget still gets +15', () => {
  const result = scoreProduct(product({ price: 20 }), baseAnswers(), AFTERNOON);
  assert.equal(pointsFor(result, 'budget'), 15);
});

test('a $0 budget makes everything over budget', () => {
  const result = scoreProduct(product({ price: 5 }), baseAnswers({ monthlyBudget: 0 }), AFTERNOON);
  assert.equal(pointsFor(result, 'budget'), -44); // -40 x 1.1
});

test('category that is neither priority nor cut-back scores 0', () => {
  const result = scoreProduct(product({ category: 'home' }), baseAnswers(), AFTERNOON);
  assert.equal(pointsFor(result, 'category'), 0);
});

test('saving goal factor only appears when you are saving', () => {
  const answers = baseAnswers({ savingGoal: { active: false, item: '', target: '' } });
  const result = scoreProduct(product(), answers, AFTERNOON);
  assert.equal(pointsFor(result, 'savingGoal'), undefined);
});

test('late night applies 11pm-3:59am, only if late-night is a trigger', () => {
  const at = (hour, minute = 0) => new Date(2026, 0, 1, hour, minute);

  assert.equal(pointsFor(scoreProduct(product(), baseAnswers(), at(23, 30)), 'lateNight'), -11);
  assert.equal(pointsFor(scoreProduct(product(), baseAnswers(), at(3, 59)), 'lateNight'), -11);
  assert.equal(pointsFor(scoreProduct(product(), baseAnswers(), at(22, 59)), 'lateNight'), undefined);
  assert.equal(pointsFor(scoreProduct(product(), baseAnswers(), at(4, 0)), 'lateNight'), undefined);

  const noTrigger = baseAnswers({ triggers: ['sales'] });
  assert.equal(pointsFor(scoreProduct(product(), noTrigger, at(23, 30)), 'lateNight'), undefined);
});

test('strictness multiplies negative points only', () => {
  const lenient = scoreProduct(product(), baseAnswers({ regretLevel: 1, returnFrequency: 'never' }), AFTERNOON);
  assert.equal(lenient.strictness, 0.8);
  assert.equal(pointsFor(lenient, 'budget'), -20); // -25 x 0.8
  assert.equal(pointsFor(lenient, 'category'), 15); // positive: unchanged
});

test('buildWeights adds strictness for returns and unsteady income', () => {
  const weights = buildWeights(baseAnswers({ regretLevel: 5, returnFrequency: 'often', incomeStability: 'none' }));
  assert.equal(weights.strictness, 1.5); // 1.3 + 0.1 + 0.1
});

test('verdict thresholds: 65 is worth it, 64 sleep on it, 40 sleep on it, 39 do not', async () => {
  const { VERDICTS } = await import('./scoringConfig.js');
  const verdictFor = (score) => VERDICTS.find((v) => score >= v.minScore).id;
  assert.equal(verdictFor(65), 'worth_it');
  assert.equal(verdictFor(64), 'sleep_on_it');
  assert.equal(verdictFor(40), 'sleep_on_it');
  assert.equal(verdictFor(39), 'dont');
});
