// Impulsify backend: a Cloudflare Worker with one endpoint.
//
//   POST /friend
//   headers: x-app-key: <APP_KEY>
//   body:    { tone, product, result, profile, history }
//   returns: { reply }
//
// The app never sees the Anthropic API key; it lives in this Worker's secrets.
// `history` is the chat so far (starting with the friend's first reply). An empty
// history means "give me your first take on the verdict".

import Anthropic from '@anthropic-ai/sdk';
import { buildContextMessage, buildSystemPrompt, TONE_IDS } from './prompt.js';

// Haiku: fast and very cheap, plenty for short replies. Change here to switch models.
const MODEL = 'claude-haiku-5-5';

// Limits that keep a single request (and the bill) small.
const MAX_HISTORY = 20; // messages in one conversation
const MAX_MESSAGE_CHARS = 1000; // per chat message

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-app-key',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

    const url = new URL(request.url);
    if (url.pathname !== '/friend' || request.method !== 'POST') {
      return json({ error: 'Not found' }, 404);
    }

    if (!env.APP_KEY || request.headers.get('x-app-key') !== env.APP_KEY) {
      return json({ error: 'Unauthorized' }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Body must be JSON' }, 400);
    }

    const problem = validate(body);
    if (problem) return json({ error: problem }, 400);

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: buildSystemPrompt(body.tone),
        // Short casual replies don't need deep thinking: low effort = faster and cheaper.
        output_config: { effort: 'low' },
        messages: [
          { role: 'user', content: buildContextMessage(body.product, body.result, body.profile) },
          ...body.history,
        ],
      });

      if (response.stop_reason === 'refusal') {
        return json({ reply: "I can't help with that one. Ask me something about this purchase." });
      }

      const reply = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')
        .trim();

      return json({ reply });
    } catch (error) {
      // Log the real reason for `wrangler tail`, but don't leak details to the app.
      if (error instanceof Anthropic.APIError) {
        console.error(`Claude API error ${error.status}: ${error.message}`);
      } else {
        console.error(error);
      }
      return json({ error: 'Your friend is unavailable right now' }, 502);
    }
  },
};

// Returns a description of what's wrong with the request body, or null if it's fine.
function validate(body) {
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

  return null;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  });
}
