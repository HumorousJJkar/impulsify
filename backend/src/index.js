// Impulsify backend: a Cloudflare Worker. The app never sees the Anthropic API key;
// it lives in this Worker's secrets.
//
//   POST /friend   the blunt friend's take + chat          (friend.js)
//   POST /extract  link or description -> product details  (product.js)
//
// Every request needs the shared x-app-key header.

import Anthropic from '@anthropic-ai/sdk';
import { handleFriend, validateFriend } from './friend.js';
import { handleExtract, validateExtract } from './product.js';

// Haiku: fast and very cheap, plenty for these short tasks. Change here to switch models.
const MODEL = 'claude-haiku-5-5';

// path -> { validate(body) -> error message or null, handle(body, deps) -> response data }
const ROUTES = {
  '/friend': { validate: validateFriend, handle: handleFriend, failMessage: 'Impulsify is unavailable right now' },
  '/extract': { validate: validateExtract, handle: handleExtract, failMessage: "Couldn't read that right now" },
};

// Websites allowed to call this backend from a browser: the web version plus
// local testing. The iPhone app isn't a website, so this rule doesn't apply to it.
const ALLOWED_ORIGINS = [/^https:\/\/impulsify\.jjkar\.workers\.dev$/, /^http:\/\/localhost:\d+$/];

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request);
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...cors } });

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const route = ROUTES[new URL(request.url).pathname];
    if (!route || request.method !== 'POST') return json({ error: 'Not found' }, 404);

    if (!env.APP_KEY || request.headers.get('x-app-key') !== env.APP_KEY) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // At most AI_LIMITER's limit (wrangler.jsonc) requests a minute per person (by IP).
    // The binding only exists once deployed, so local dev skips it.
    if (env.AI_LIMITER) {
      const { success } = await env.AI_LIMITER.limit({ key: request.headers.get('cf-connecting-ip') ?? 'unknown' });
      if (!success) return json({ error: 'Slow down a little and try again in a minute' }, 429);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Body must be JSON' }, 400);
    }

    const problem = route.validate(body);
    if (problem) return json({ error: problem }, 400);

    try {
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
      return json(await route.handle(body, { client, model: MODEL }));
    } catch (error) {
      // Log the real reason for `wrangler tail`, but don't leak details to the app.
      if (error instanceof Anthropic.APIError) {
        console.error(`Claude API error ${error.status}: ${error.message}`);
      } else {
        console.error(error);
      }
      return json({ error: route.failMessage }, 502);
    }
  },
};

// Browsers only let a website read our replies if we name that website here.
function corsHeaders(request) {
  const origin = request.headers.get('origin');
  const allowed = origin && ALLOWED_ORIGINS.some((pattern) => pattern.test(origin));
  return {
    ...(allowed && { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-app-key',
  };
}
