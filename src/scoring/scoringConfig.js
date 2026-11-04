// Every number the scoring engine uses lives here.
//
// Think of this file like a Java class full of `public static final` constants:
// the logic in scoreProduct.js never hard-codes a number, it reads them from here.
// Change a value, re-run `npm test`, and the whole app follows.
//
// Tier tables are checked top to bottom and the FIRST matching row wins.

// Every product starts at this score before any factor is applied.
export const BASE_SCORE = 50;

// Final score -> verdict. Checked top to bottom; first row whose minScore you reach wins.
export const VERDICTS = [
  { minScore: 65, id: 'worth_it', label: 'Worth it for you' },
  { minScore: 40, id: 'sleep_on_it', label: 'Sleep on it (wait 48h)' },
  { minScore: 0, id: 'dont', label: "Don't, you're wasting money" },
];

// ---- Factor A: budget fit ----
// Price as a percentage of your monthly fun-money budget.
export const BUDGET_FIT_TIERS = [
  { maxPercent: 10, points: 15 },
  { maxPercent: 25, points: 5 },
  { maxPercent: 50, points: -10 },
  { maxPercent: 100, points: -25 },
  { maxPercent: Infinity, points: -40 }, // over budget
];

// ---- Factor B: category ----
export const CATEGORY_POINTS = {
  priority: 15, // one of your top-3 categories
  cutBack: -20, // something you said you're cutting back on
  neutral: 0,
};

// ---- Factor C: cost per use (over one year) ----
export const USES_PER_YEAR = {
  daily: 365,
  weekly: 52,
  monthly: 12,
  rarely: 3,
};

export const COST_PER_USE_TIERS = [
  { maxDollars: 1, points: 15 },
  { maxDollars: 5, points: 5 },
  { maxDollars: 20, points: 0 },
  { maxDollars: 50, points: -10 },
  { maxDollars: Infinity, points: -20 },
];

// ---- Factor D: saving goal ----
// Only applies if you said you're saving for something.
// Price as a percentage of your saving target.
export const SAVING_GOAL_TIERS = [
  { minPercent: 20, points: -20 },
  { minPercent: 5, points: -10 },
  { minPercent: 0, points: 0 },
];

// ---- Factor E: late night ----
// Only applies if you picked "Late-night" as an impulse trigger.
// Hours use the 24-hour clock: 23 = 11pm. The window wraps past midnight.
export const LATE_NIGHT = {
  startHour: 23, // from 11:00pm...
  endHour: 4, // ...until 3:59am
  points: -10,
};

// ---- Strictness ----
// Multiplies ONLY negative points, so people who regret more get judged harder.
export const STRICTNESS_BY_REGRET = {
  1: 0.8,
  2: 0.9,
  3: 1.0,
  4: 1.15,
  5: 1.3,
};
export const STRICTNESS_RETURNS_OFTEN = 0.1;
export const STRICTNESS_UNSTEADY_INCOME = 0.1; // income is 'irregular' or 'none'
