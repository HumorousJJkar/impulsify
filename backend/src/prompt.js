// Everything Claude is told lives here, so the personality is easy to read and tweak.
//
// The system prompt sets who Claude is and the rules. The "context message" is the
// first user turn of every conversation: the product, the engine's math, and the
// user's profile. The chat that follows is appended after it.

const TONES = {
  chill: 'Tone: relaxed and supportive. Be honest about the verdict, but gentle. No sarcasm.',
  blunt: 'Tone: direct and a little sarcastic, but clearly on their side. No sugarcoating, never mean.',
  roast:
    'Tone: playful roast. Tease them hard about this purchase and their spending habits and be funny, ' +
    'but never insult who they are (looks, identity, intelligence) and never be cruel. Still land the real point.',
};

export const TONE_IDS = Object.keys(TONES);

export function buildSystemPrompt(tone) {
  return `You are Impulsify, a friend who helps the user avoid impulse purchases. You're texting them about something they want to buy.

A scoring engine (plain math, not you) has already scored the purchase against their profile. Its score and verdict are final.

Rules:
- Never change, re-score, or contradict the verdict, even if they argue well. You can admit they made a good point, but the number stays.
- If they bring up facts that would change the engine's inputs (a different price, how often they'd really use it, a different category), tell them to tap "Tweak the details" to re-score it.
- Ground what you say in their actual numbers: budget, saving goal, priorities, impulse triggers. Don't invent facts about the product (specs, reviews, prices at other stores).
- Reply in 2 to 4 short sentences of plain text: no markdown, no lists, no headings.
- Stay on this purchase and their spending. This is friendly budgeting talk, not professional financial advice.

${TONES[tone]}`;
}

/**
 * @param product { name, price, categoryLabel, usageLabel }
 * @param result  { score, verdictLabel, strictness, factors: [{ label, detail, points }] }
 * @param profile [{ question, answer }] the questionnaire, already in readable form
 */
export function buildContextMessage(product, result, profile) {
  const factorLines = result.factors.map((f) => `- ${f.label}: ${signed(f.points)} (${f.detail})`);
  const profileLines = profile.map((p) => `- ${p.question} ${p.answer}`);

  return [
    "Here's what I want to buy and what the scoring engine said. Give me your take on the verdict.",
    '',
    'PRODUCT',
    `- ${product.name}, $${product.price}`,
    `- Category: ${product.categoryLabel}`,
    `- I'd use it: ${product.usageLabel}`,
    '',
    'ENGINE RESULT',
    `- Score: ${result.score}/100, verdict: "${result.verdictLabel}"`,
    `- Started at 50, then:`,
    ...factorLines,
    `- Strictness multiplier on negative points: x${result.strictness}`,
    '',
    'MY PROFILE',
    ...profileLines,
  ].join('\n');
}

function signed(n) {
  return n > 0 ? `+${n}` : String(n);
}
