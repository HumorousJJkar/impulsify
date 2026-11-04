// Talks to the Impulsify backend (backend/src/index.js), which talks to Claude.
//
// The app only knows the backend's URL and a shared app key, both read from
// .env.local. The Anthropic API key never leaves the backend.

import { describeAnswer, QUESTIONS } from '../questions';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const APP_KEY = process.env.EXPO_PUBLIC_APP_KEY;

export function isFriendConfigured() {
  return Boolean(API_URL && APP_KEY);
}

/**
 * Ask the friend for a reply.
 *
 * @param product  { name, price, categoryLabel, usageLabel }
 * @param result   the scoring engine's result (scoreProduct)
 * @param answers  the saved questionnaire answers
 * @param history  the chat so far: [{ role: 'assistant' | 'user', content }]
 *                 Empty = ask for the first take on the verdict.
 * @returns the friend's reply text
 */
export async function askFriend(product, result, answers, history) {
  const response = await fetch(`${API_URL}/friend`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-app-key': APP_KEY },
    body: JSON.stringify({
      tone: answers.tone ?? 'blunt',
      product,
      result: {
        score: result.score,
        verdictLabel: result.verdict.label,
        strictness: result.strictness,
        factors: result.factors.map(({ label, detail, points }) => ({ label, detail, points })),
      },
      // Send the profile as readable question/answer pairs, so the backend
      // doesn't need to know how the questionnaire stores things.
      profile: QUESTIONS.filter((q) => q.id !== 'tone').map((q) => ({
        question: q.title,
        answer: describeAnswer(q, answers[q.id]),
      })),
      history,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
  return data.reply;
}
