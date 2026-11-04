// POST /extract: turn a product link or a description into { name, price, category }.
//
// body:    { url } or { description }, plus { categories: [{ value, label }] } from the app
// returns: { product: { name, price, category }, currency, image, source, pageRead, missing }
//
// Links are handled in two steps:
//   1. Code (extract.js) downloads the page and reads the store's embedded product
//      data. This is where the PRICE comes from; the AI is never allowed to supply
//      a price for a link, so it can't make one up.
//   2. Claude cleans up the name ("Sony WH-1000XM5 Wireless... : Amazon.com" ->
//      "Sony WH-1000XM5 Headphones") and picks a category.
// If any step fails, we return whatever we have and the app asks you for the rest.

import { extractFromHtml } from './extract.js';

const PAGE_TIMEOUT_MS = 8000;
const MAX_HTML_CHARS = 3_000_000;

// An honest User-Agent. Some stores (Amazon especially) block automated requests;
// when that happens the app simply asks the user to fill in the details.
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; ImpulsifyLinkReader/1.0)',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

const SYSTEM_PROMPT =
  'You turn messy product information into a clean record for a personal budgeting app. ' +
  'Only use the information you are given. Never invent prices, specs, or details.';

export async function handleExtract(body, { client, model }) {
  const allowed = body.categories.map((c) => c.value);
  if (body.url) return fromUrl(body.url, body.categories, allowed, client, model);
  return fromDescription(body.description, body.categories, allowed, client, model);
}

async function fromUrl(url, categories, allowed, client, model) {
  const page = await fetchPage(url);
  const finalUrl = page?.finalUrl ?? url; // short links like amzn.to redirect to the real page
  const found = page ? extractFromHtml(page.html) : {};
  const source = new URL(finalUrl).hostname.replace(/^www\./, '');

  let name = found.name ?? null;
  let category = null;
  try {
    const ai = await askClaude(client, model, pagePrompt(found, finalUrl, categories), schema(allowed, { withPrice: false }));
    name = ai.name; // null here means "can't tell what this is", e.g. a robot-check page
    category = allowed.includes(ai.category) ? ai.category : null;
  } catch (error) {
    // Claude unavailable: keep the raw page title so the user still gets something.
    console.error('extract (url) AI step failed:', error.message);
  }

  return response({
    name,
    price: found.price ?? null,
    category,
    currency: found.currency ?? null,
    image: found.image ?? null,
    source,
    pageRead: Boolean(found.name || found.price),
  });
}

async function fromDescription(description, categories, allowed, client, model) {
  const ai = await askClaude(client, model, descriptionPrompt(description, categories), schema(allowed, { withPrice: true }));
  return response({
    name: ai.name,
    price: typeof ai.price === 'number' && ai.price > 0 ? Math.round(ai.price * 100) / 100 : null,
    category: allowed.includes(ai.category) ? ai.category : null,
    currency: null,
    image: null,
    source: 'description',
    pageRead: false,
  });
}

function response({ name, price, category, currency, image, source, pageRead }) {
  const product = { name: name ? name.slice(0, 60) : null, price, category };
  const missing = Object.keys(product).filter((key) => product[key] === null);
  return { product, currency, image, source, pageRead, missing };
}

// ---------------- Fetching ----------------

// Returns { html, finalUrl }, or null if the page couldn't be read (blocked, timeout, not HTML).
async function fetchPage(url) {
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, redirect: 'follow', signal: AbortSignal.timeout(PAGE_TIMEOUT_MS) });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('html')) {
      // Visible in `npx.cmd wrangler tail`: tells you why a store couldn't be read.
      console.warn(`fetchPage: ${res.status} (${type}) for ${new URL(url).hostname}`);
      return null;
    }
    const html = await res.text();
    return { html: html.slice(0, MAX_HTML_CHARS), finalUrl: res.url || url };
  } catch (error) {
    console.warn(`fetchPage: ${error.name} for ${new URL(url).hostname}: ${error.message}`);
    return null;
  }
}

// ---------------- Claude ----------------

async function askClaude(client, model, content, jsonSchema) {
  const res = await client.messages.create({
    model,
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    // Structured output: Claude must answer with JSON matching the schema.
    output_config: { effort: 'low', format: { type: 'json_schema', schema: jsonSchema } },
    messages: [{ role: 'user', content }],
  });
  if (res.stop_reason === 'refusal') throw new Error('refused');

  const text = res.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
  return JSON.parse(text);
}

// { name: string|null, category: one of the allowed values|null, price?: number|null }
function schema(allowed, { withPrice }) {
  const nullable = (type) => ({ anyOf: [type, { type: 'null' }] });
  const properties = {
    name: nullable({ type: 'string' }),
    category: nullable({ type: 'string', enum: allowed }),
  };
  if (withPrice) properties.price = nullable({ type: 'number' });

  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}

function categoryList(categories) {
  return categories.map((c) => `${c.value} (${c.label})`).join(', ');
}

function pagePrompt(found, url, categories) {
  const { pathname } = new URL(url);
  let path;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    path = pathname;
  }

  return `Product data read from a store page (fields may be null or messy):
${JSON.stringify({ name: found.name, brand: found.brand, description: found.description, siteName: found.siteName }, null, 2)}

Page address: ${new URL(url).hostname}${path.slice(0, 200)}

Return:
- name: a short, clear product name (brand + model + what it is), at most 60 characters. Use the page data first. If it's empty or useless (like "Robot Check" or just the store's name), you may use words from the page address. Use null if you can't tell what the product is.
- category: the best fit from these values: ${categoryList(categories)}. Use null if none fits or you can't tell.`;
}

function descriptionPrompt(description, categories) {
  return `The user described something they want to buy:
"""${description}"""

Return:
- name: a short, clear product name based on what they wrote, at most 60 characters. Use null if it isn't clear what the product is.
- price: the price in US dollars only if they stated one ("like $180" -> 180). Otherwise null. Never guess a price.
- category: the best fit from these values: ${categoryList(categories)}. Use null if none fits or you can't tell.`;
}

// ---------------- Validation ----------------

export function validateExtract(body) {
  const { url, description, categories } = body ?? {};

  if (!Array.isArray(categories) || categories.length === 0 || categories.length > 20) return 'Invalid categories';
  for (const c of categories) {
    if (typeof c?.value !== 'string' || typeof c?.label !== 'string' || c.value.length > 30 || c.label.length > 30) {
      return 'Invalid categories';
    }
  }

  if ((url === undefined) === (description === undefined)) return 'Send either url or description';

  if (url !== undefined) {
    if (typeof url !== 'string' || url.length > 2000) return 'Invalid url';
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return 'Invalid url';
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return 'Only http(s) links';
  } else if (typeof description !== 'string' || description.trim().length < 2 || description.length > 500) {
    return 'Invalid description';
  }

  return null;
}
