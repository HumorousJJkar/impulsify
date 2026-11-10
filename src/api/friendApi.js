// Asks the blunt friend (backend POST /friend) for a reply.

import { describeAnswer, QUESTIONS } from '../questions';
import { isBackendConfigured, postToBackend } from './backend';

export const isFriendConfigured = isBackendConfigured;

/**
 * @param product  { name, price, categoryLabel, usageLabel }
 * @param result   the scoring engine's result (scoreProduct)
 * @param answers  the saved questionnaire answers
 * @param history  the chat so far: [{ role: 'assistant' | 'user', content }]
 *                 Empty = ask for the first take on the verdict.
 * @param recent   your other recent items (history/stats.js recentForMemory)
 * @returns { reply, blocked }  blocked: the AI says this isn't a real product (e.g. a person)
 */
export async function askFriend(product, result, answers, history, recent = []) {
  const data = await postToBackend('/friend', {
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
    recent,
  });
  return { reply: data.reply, blocked: data.blocked === true };
}
