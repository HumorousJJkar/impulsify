// Tests for the learning model. Run with: npm test

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { learnFromHistory, priceBand, trackRecord } from './learn.js';
import { LEARNING } from './scoringConfig.js';
import { scoreProduct } from './scoreProduct.js';

const AFTERNOON = new Date(2026, 0, 1, 14, 0);

// Regret level 3 ("Sometimes") -> starting guess 30%. Budget $200.
const answers = {
  monthlyBudget: 200,
  savingGoal: { active: false, item: '', target: '' },
  incomeStability: 'part_time',
  priorities: ['tech'],
  cutBack: [],
  regretLevel: 3,
  triggers: [],
  returnFrequency: 'often', // strictness 1.1, so we can check it's NOT applied
};

let nextId = 0;
// A bought item you rated. price 100 = 50% of budget = "medium".
function bought(category, regret, price = 100) {
  nextId += 1;
  return { id: `e${nextId}`, product: { name: 'x', price, category, usage: 'weekly' }, status: 'bought', regret };
}

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('with no rated purchases, the model is just the starting guess', () => {
  const model = learnFromHistory([], answers);
  assert.equal(model.answered, 0);
  close(model.overall, 0.3);
  assert.equal(trackRecord(model, { price: 50, category: 'clothes' }, answers), null);
});

test('one regret cannot swing the overall rate to 100%', () => {
  const model = learnFromHistory([bought('clothes', 'regret')], answers);
  close(model.overall, (1 + 2 * 0.3) / (1 + 2)); // 53%, not 100%
});

test('only bought + rated items count (skipped, undecided, unrated are ignored)', () => {
  const history = [
    bought('clothes', 'regret'),
    bought('clothes', null), // bought, not rated yet
    { ...bought('clothes', 'regret'), status: 'skipped' },
    { ...bought('clothes', 'glad'), status: 'undecided' },
  ];
  assert.equal(learnFromHistory(history, answers).answered, 1);
});

test('no track-record factor until MIN_ANSWERED purchases are rated', () => {
  const two = learnFromHistory([bought('clothes', 'regret'), bought('clothes', 'regret')], answers);
  assert.equal(two.answered, LEARNING.MIN_ANSWERED - 1);
  assert.equal(trackRecord(two, { price: 100, category: 'clothes' }, answers), null);
});

test('worked example: regretted 3 of 4 clothing buys', () => {
  const history = [bought('clothes', 'regret'), bought('clothes', 'regret'), bought('clothes', 'regret'), bought('clothes', 'glad')];
  const model = learnFromHistory(history, answers);

  close(model.overall, (3 + 0.6) / 6); // 60%
  close(model.categories.clothes.rate, (3 + 3 * 0.6) / 7); // ~68.6%

  // A new $100 clothing item: category and price range both ~68.6%, 4 relevant answers.
  const factor = trackRecord(model, { price: 100, category: 'clothes' }, answers);
  close(factor.confidence, 4 / 7);
  assert.equal(factor.rawPoints, -11); // -(0.686 - 0.30) x 50 x 0.571 = -11.0
  assert.equal(factor.detail, 'You regretted 3 of 4 Clothes buys');
});

test('a category you are usually glad about earns positive points', () => {
  const history = [bought('tech', 'glad'), bought('tech', 'glad'), bought('tech', 'glad'), bought('tech', 'glad')];
  const factor = trackRecord(learnFromHistory(history, answers), { price: 100, category: 'tech' }, answers);
  assert.ok(factor.rawPoints > 0);
});

test('the factor is capped at +/- CAP points', () => {
  const history = Array.from({ length: 40 }, () => bought('clothes', 'regret', 300)); // all big + regretted
  const factor = trackRecord(learnFromHistory(history, answers), { price: 300, category: 'clothes' }, answers);
  assert.equal(factor.rawPoints, -LEARNING.CAP);
});

test('no data for this category falls back to price range, then overall', () => {
  const history = [bought('tech', 'regret'), bought('tech', 'regret'), bought('tech', 'glad')];
  const model = learnFromHistory(history, answers);

  // Same price range ($100 = medium), new category.
  assert.equal(trackRecord(model, { price: 100, category: 'home' }, answers).detail, 'You regretted 2 of 3 medium-price buys');
  // Different price range ($20 = small) and new category: overall rate.
  assert.match(trackRecord(model, { price: 20, category: 'home' }, answers).detail, /^About \d+% of your buys end in regret$/);
});

test('the explanation names the group that actually drove the points', () => {
  // Tech: 1 glad. Medium price range: 2 regretted (both clothes).
  const history = [bought('tech', 'glad', 100), bought('clothes', 'regret', 100), bought('clothes', 'regret', 100)];
  const factor = trackRecord(learnFromHistory(history, answers), { price: 100, category: 'tech' }, answers);
  assert.ok(factor.rawPoints < 0);
  assert.equal(factor.detail, 'You regretted 2 of 3 medium-price buys'); // not "0 of 1 Tech"
});

test('price ranges: <=25% small, <=75% medium, more is big; a $0 budget is big', () => {
  assert.equal(priceBand(50, 200), 'small');
  assert.equal(priceBand(150, 200), 'medium');
  assert.equal(priceBand(151, 200), 'big');
  assert.equal(priceBand(5, 0), 'big');
});

test('scoreProduct adds the factor and does NOT multiply it by strictness', () => {
  const history = [bought('clothes', 'regret'), bought('clothes', 'regret'), bought('clothes', 'regret'), bought('clothes', 'glad')];
  const model = learnFromHistory(history, answers);
  const product = { name: 'Jacket', price: 100, category: 'clothes', usage: 'weekly' };

  const withLearning = scoreProduct(product, answers, AFTERNOON, model);
  const without = scoreProduct(product, answers, AFTERNOON);

  const factor = withLearning.factors.find((f) => f.id === 'trackRecord');
  assert.equal(factor.points, -11); // not -12.1 (which would be x1.1)
  assert.equal(without.factors.find((f) => f.id === 'trackRecord'), undefined);
  assert.equal(withLearning.score, without.score - 11);
});
