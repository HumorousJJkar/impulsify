// Learns what YOU regret, from what you bought and how you felt about it later.
// Plain math, no AI: count regrets, then smooth the counts so a couple of data
// points can't swing things wildly (Bayesian smoothing with a "prior").
//
//   learnFromHistory(history, answers) -> model   (what it learned)
//   trackRecord(model, product, answers) -> factor (the "Your track record" line)
//
// Both are pure functions, tested in learn.test.js. Every number lives in
// scoringConfig.js (LEARNING).

import { CATEGORIES } from '../questions.js';
import { LEARNING } from './scoringConfig.js';

/**
 * @param history the saved history entries (see history/stats.js for their shape)
 * @param answers the questionnaire answers (for the starting guess and budget)
 * @returns { answered, regrets, prior, overall, categories, bands, outcomes }
 *   categories / bands look like { clothes: { n: 4, regrets: 3, rate: 0.69 }, ... }
 */
export function learnFromHistory(history, answers) {
  // Only bought items you've rated count: each one is a single "did I regret it?" data point.
  const outcomes = history
    .filter((e) => e.status === 'bought' && (e.regret === 'glad' || e.regret === 'regret'))
    .map((e) => ({
      category: e.product.category,
      band: priceBand(e.product.price, answers.monthlyBudget),
      regretted: e.regret === 'regret',
    }));

  // Step 1: the starting guess, from your questionnaire answer.
  const prior = LEARNING.PRIOR_BY_REGRET_LEVEL[answers.regretLevel] ?? LEARNING.TYPICAL_REGRET;

  // Step 2: your overall rate. The guess counts as PRIOR_WEIGHT imaginary purchases.
  const regrets = outcomes.filter((o) => o.regretted).length;
  const overall = smooth(regrets, outcomes.length, prior, LEARNING.PRIOR_WEIGHT);

  // Step 3: the same trick one level down. Each group starts from your overall rate.
  const groupBy = (key) => {
    const groups = {};
    for (const o of outcomes) {
      const g = (groups[o[key]] ??= { n: 0, regrets: 0 });
      g.n += 1;
      if (o.regretted) g.regrets += 1;
    }
    for (const g of Object.values(groups)) g.rate = smooth(g.regrets, g.n, overall, LEARNING.GROUP_WEIGHT);
    return groups;
  };

  return {
    answered: outcomes.length,
    regrets,
    prior,
    overall,
    categories: groupBy('category'),
    bands: groupBy('band'),
    outcomes,
  };
}

/**
 * The "Your track record" factor for one product, or null when learning hasn't
 * started yet (fewer than MIN_ANSWERED rated purchases).
 * Returns { id, label, rawPoints, detail, exemptFromStrictness, predicted, confidence }.
 */
export function trackRecord(model, product, answers) {
  if (!model || model.answered < LEARNING.MIN_ANSWERED) return null;

  const band = priceBand(product.price, answers.monthlyBudget);
  const cat = model.categories[product.category];
  const bnd = model.bands[band];

  // Step 4: predicted regret = average of the category rate and the price-range rate.
  // A group you have no data for falls back to your overall rate.
  const predicted = ((cat?.rate ?? model.overall) + (bnd?.rate ?? model.overall)) / 2;

  // Confidence grows with how many rated purchases are like this one
  // (same category or same price range), so thin evidence has a small effect.
  const relevant = model.outcomes.filter((o) => o.category === product.category || o.band === band).length;
  const confidence = relevant / (relevant + LEARNING.CONFIDENCE_WEIGHT);

  const raw = -(predicted - LEARNING.TYPICAL_REGRET) * LEARNING.SCALE * confidence;
  const rawPoints = clamp(Math.round(raw * 10) / 10, -LEARNING.CAP, LEARNING.CAP);

  return {
    id: 'trackRecord',
    label: 'Your track record',
    rawPoints,
    detail: describe(model, product, band, cat, bnd, rawPoints < 0),
    // Strictness already comes from your regret answer; applying it here too would
    // count the same thing twice.
    exemptFromStrictness: true,
    predicted,
    confidence,
  };
}

// "small" / "medium" / "big", by price as % of your monthly budget.
export function priceBand(price, monthlyBudget) {
  const percent = monthlyBudget > 0 ? (price / monthlyBudget) * 100 : Infinity;
  return LEARNING.PRICE_BANDS.find((b) => percent <= b.maxPercent).id;
}

export function categoryLabel(value) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

// (successes + weight x guess) / (count + weight): the guess acts like `weight`
// extra data points, so the result starts at the guess and moves toward the real
// rate as count grows.
function smooth(hits, count, guess, weight) {
  return (hits + weight * guess) / (count + weight);
}

// Explains the points using whichever group (category or price range) pushed them
// the most: for a minus, the group you regret more; for a plus, the one you regret less.
function describe(model, product, band, cat, bnd, isPenalty) {
  const plural = (n) => (n === 1 ? '' : 's');
  const candidates = [
    cat && { stats: cat, name: categoryLabel(product.category) },
    bnd && { stats: bnd, name: `${band}-price` },
  ].filter(Boolean);

  if (candidates.length === 0) return `About ${Math.round(model.overall * 100)}% of your buys end in regret`;

  const pick = candidates.reduce((best, c) =>
    isPenalty ? (c.stats.rate > best.stats.rate ? c : best) : c.stats.rate < best.stats.rate ? c : best
  );
  return `You regretted ${pick.stats.regrets} of ${pick.stats.n} ${pick.name} buy${plural(pick.stats.n)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
