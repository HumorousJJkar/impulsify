// POST /friend: Impulsify's take on a verdict, and the argue-back chat.
//
// body:    { tone, product, result, profile, history, recent? }
// returns: { reply }
//
// `history` is the chat so far (starting with Impulsify's first reply). An empty
// history means "give me your first take on the verdict". `recent` is a short list
// of the user's other recently judged items, Impulsify's memory.

import { buildContextMessage, buildReplyReminder, buildSystemPrompt, TONE_IDS } from './prompt.js';

// Limits that keep a single request (and the bill) small.
const MAX_HISTORY = 20; // messages in one conversation
const MAX_MESSAGE_CHARS = 1000; // per chat message
const MAX_RECENT = 10; // remembered items
const STATUSES = ['undecided', 'bought', 'skipped'];

export async function handleFriend(body, { client, model }) {
  const response = await client.messages.create({
    model,
    max_tokens: 2000,
    system: buildSystemPrompt(body.tone),
    // Short casual replies don't need deep thinking: low effort = faster and cheaper.
    output_config: { effort: 'low' },
    messages: [
      { role: 'user', content: buildContextMessage(body.product, body.result, body.profile, body.recent ?? []) },
      ...body.history,
      // A system message at the end (after the latest user turn) restates the reply rules.
      { role: 'system', content: buildReplyReminder(body.tone) },
    ],
  });

  if (response.stop_reason === 'refusal') {
    return { reply: "I can't help with that one. Ask me something about this purchase." };
  }

  const reply = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  return { reply };
}

// Returns a description of what's wrong with the request body, or null if it's fine.
export function validateFriend(body) {
  const { tone, product, result, profile, history } = body ?? {};

  if (!TONE_IDS.includes(tone)) return 'Invalid tone';
  if (!product || typeof product.name !== 'string' || typeof product.price !== 'number') return 'Invalid product';
  if (product.name.length > 100) return 'Product name too long';
  if (!result || typeof result.score !== 'number' || !Array.isArray(result.factors)) return 'Invalid result';
  if (result.factors.length > 10) return 'Too many factors';
  if (!Array.isArray(profile) || profile.length > 20) return 'Invalid profile';
  if (!Array.isArray(history) || history.length > MAX_HISTORY) return 'Invalid history';

  // The API needs turns to alternate user/assistant. The context message is the first
  // user turn, so history must start with the assistant and alternate from there.
  for (let i = 0; i < history.length; i++) {
    const message = history[i];
    const expectedRole = i % 2 === 0 ? 'assistant' : 'user';
    if (message?.role !== expectedRole || typeof message.content !== 'string') return 'Invalid history order';
    if (message.content.length > MAX_MESSAGE_CHARS) return 'Message too long';
  }
  // A non-empty history must end with the user's new message.
  if (history.length > 0 && history.at(-1).role !== 'user') return 'History must end with a user message';

  // `recent` is optional (older app versions don't send it).
  const { recent } = body;
  if (recent !== undefined) {
    if (!Array.isArray(recent) || recent.length > MAX_RECENT) return 'Invalid recent';
    for (const item of recent) {
      const ok =
        typeof item?.name === 'string' && item.name.length <= 100 &&
        typeof item.price === 'number' &&
        typeof item.category === 'string' && item.category.length <= 30 &&
        typeof item.verdict === 'string' && item.verdict.length <= 40 &&
        STATUSES.includes(item.status) &&
        [null, 'glad', 'regret'].includes(item.regret) &&
        Number.isInteger(item.daysAgo);
      if (!ok) return 'Invalid recent item';
    }
  }

  return null;
}
