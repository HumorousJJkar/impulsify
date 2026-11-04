// The scoring engine. Plain math, no AI, no network.
//
// scoreProduct(product, answers, now) is a pure function: same inputs always
// give the same output, and it changes nothing outside itself. That makes it
// easy to test (see scoreProduct.test.js) and easy to reason about.
//
// How a score is built:
//   1. buildWeights() turns questionnaire answers into numbers the engine uses.
//   2. Each factor function looks at one thing (budget, category, ...) and
//      returns some points, or null if it doesn't apply to you.
//   3. Negative points are multiplied by your strictness.
//   4. score = BASE_SCORE + sum of points, rounded and clamped to 0-100.
//   5. The score is mapped to a verdict.
//
// Imports use explicit ".js" endings so Node's test runner can load this file too.

import {
  BASE_SCORE,
  BUDGET_FIT_TIERS,
  CATEGORY_POINTS,
  COST_PER_USE_TIERS,
  LATE_NIGHT,
  SAVING_GOAL_TIERS,
  STRICTNESS_BY_REGRET,
  STRICTNESS_RETURNS_OFTEN,
  STRICTNESS_UNSTEADY_INCOME,
  USES_PER_YEAR,
  VERDICTS,
} from './scoringConfig.js';

/**
 * @param product { name, price, category, usage }  e.g. usage = 'daily'
 * @param answers the saved questionnaire answers (profile.answers)
 * @param now     the current time; a parameter so tests can fake "11:30pm"
 * @returns { score, verdict, factors, strictness, baseScore }
 */
export function scoreProduct(product, answers, now = new Date()) {
  const weights = buildWeights(answers);

  const factors = [budgetFit, categoryFit, costPerUse, savingGoal, lateNight]
    .map((factor) => factor(product, weights, now))
    .filter((result) => result !== null)
    .map((result) => ({
      ...result,
      // Strictness only makes bad news worse; it never shrinks good points.
      points: result.rawPoints < 0 ? round1(result.rawPoints * weights.strictness) : result.rawPoints,
    }));

  const total = BASE_SCORE + factors.reduce((sum, f) => sum + f.points, 0);
  const score = clamp(Math.round(total), 0, 100);
  const verdict = VERDICTS.find((v) => score >= v.minScore);

  return { score, verdict, factors, strictness: weights.strictness, baseScore: BASE_SCORE };
}

/**
 * Turns raw questionnaire answers into the numbers the factors need.
 * This is the "answers -> personal weights" step from the project plan.
 */
export function buildWeights(answers) {
  let strictness = STRICTNESS_BY_REGRET[answers.regretLevel] ?? 1.0;
  if (answers.returnFrequency === 'often') strictness += STRICTNESS_RETURNS_OFTEN;
  if (answers.incomeStability === 'irregular' || answers.incomeStability === 'none') {
    strictness += STRICTNESS_UNSTEADY_INCOME;
  }

  const goal = answers.savingGoal;
  return {
    monthlyBudget: answers.monthlyBudget,
    priorities: answers.priorities ?? [],
    cutBack: answers.cutBack ?? [],
    savingTarget: goal?.active ? Number(goal.target) : null,
    savingItem: goal?.active ? goal.item : null,
    lateNightTrigger: (answers.triggers ?? []).includes('late_night'),
    strictness: round2(strictness),
  };
}

// ---------------- Factors ----------------
// Each returns { id, label, rawPoints, detail } or null if it doesn't apply.

function budgetFit(product, weights) {
  // A $0 budget makes any purchase "over budget" (division gives Infinity).
  const percent = weights.monthlyBudget > 0 ? (product.price / weights.monthlyBudget) * 100 : Infinity;
  const tier = BUDGET_FIT_TIERS.find((t) => percent <= t.maxPercent);

  const detail =
    percent === Infinity
      ? 'You set your fun-money budget to $0'
      : `${money(product.price)} is ${Math.round(percent)}% of your ${money(weights.monthlyBudget)} monthly budget`;

  return { id: 'budget', label: 'Budget fit', rawPoints: tier.points, detail };
}

function categoryFit(product, weights) {
  if (weights.priorities.includes(product.category)) {
    return { id: 'category', label: 'Category', rawPoints: CATEGORY_POINTS.priority, detail: 'One of your priorities' };
  }
  if (weights.cutBack.includes(product.category)) {
    return {
      id: 'category',
      label: 'Category',
      rawPoints: CATEGORY_POINTS.cutBack,
      detail: "You said you're cutting back on this",
    };
  }
  return { id: 'category', label: 'Category', rawPoints: CATEGORY_POINTS.neutral, detail: 'Not one of your priorities' };
}

function costPerUse(product) {
  const usesPerYear = USES_PER_YEAR[product.usage];
  const dollarsPerUse = product.price / usesPerYear;
  const tier = COST_PER_USE_TIERS.find((t) => dollarsPerUse <= t.maxDollars);

  return {
    id: 'costPerUse',
    label: 'Cost per use',
    rawPoints: tier.points,
    detail: `About ${money(dollarsPerUse)} per use over a year (${usesPerYear} uses)`,
  };
}

function savingGoal(product, weights) {
  if (!weights.savingTarget) return null;

  const percent = (product.price / weights.savingTarget) * 100;
  const tier = SAVING_GOAL_TIERS.find((t) => percent >= t.minPercent);

  return {
    id: 'savingGoal',
    label: 'Saving goal',
    rawPoints: tier.points,
    detail: `${Math.round(percent)}% of your ${money(weights.savingTarget)} ${weights.savingItem} goal`,
  };
}

function lateNight(product, weights, now) {
  if (!weights.lateNightTrigger) return null;

  const hour = now.getHours();
  // The window wraps past midnight, so it's "after start OR before end".
  const isLate = hour >= LATE_NIGHT.startHour || hour < LATE_NIGHT.endHour;
  if (!isLate) return null;

  return { id: 'lateNight', label: 'Late night', rawPoints: LATE_NIGHT.points, detail: "It's late and you said that's when you slip" };
}

// ---------------- Helpers ----------------

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function money(n) {
  return n < 10 && !Number.isInteger(n) ? `$${n.toFixed(2)}` : `$${Math.round(n).toLocaleString('en-US')}`;
}
