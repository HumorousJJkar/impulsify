// Pulls product details out of a store page's HTML. Plain JS, no AI.
//
// Most online stores embed machine-readable product data in their pages so that
// Google can show prices in search results. We read the same data, from two places:
//
//   1. JSON-LD: <script type="application/ld+json"> blocks containing a schema.org
//      "Product" object, e.g. { "@type": "Product", "name": "...", "offers": { "price": "149.99" } }
//   2. Meta tags: <meta property="og:title" content="...">, <meta property="product:price:amount" ...>
//
// JSON-LD wins when both exist, since it's the more structured of the two.
// Everything here is a pure function, so it's unit-tested in extract.test.js.

/**
 * @param html the page's HTML as a string
 * @returns { name, price, currency, image, brand, description, siteName } - any may be null
 */
export function extractFromHtml(html) {
  const ld = findJsonLdProduct(html);
  const meta = readMetaTags(html);

  const ldOffer = firstOffer(ld?.offers);

  return {
    name: clean(ld?.name) ?? clean(meta['og:title']) ?? clean(meta['twitter:title']) ?? clean(readTitle(html)),
    price:
      parsePrice(ldOffer?.price ?? ldOffer?.lowPrice ?? ldOffer?.priceSpecification?.price) ??
      parsePrice(meta['product:price:amount'] ?? meta['og:price:amount'] ?? meta['price']),
    currency:
      clean(ldOffer?.priceCurrency ?? ldOffer?.priceSpecification?.priceCurrency) ??
      clean(meta['product:price:currency'] ?? meta['og:price:currency'] ?? meta['pricecurrency']),
    image: firstImage(ld?.image) ?? clean(meta['og:image']),
    brand: clean(typeof ld?.brand === 'string' ? ld.brand : ld?.brand?.name),
    description: truncate(clean(ld?.description) ?? clean(meta['og:description']) ?? clean(meta['description']), 300),
    siteName: clean(meta['og:site_name']),
  };
}

/** "$1,299.99" -> 1299.99, "149" -> 149, junk -> null */
export function parsePrice(value) {
  if (value === null || value === undefined) return null;
  const digits = String(value).replace(/[^0-9.]/g, '');
  const number = Number.parseFloat(digits);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : null;
}

// ---------------- JSON-LD ----------------

function findJsonLdProduct(html) {
  const scripts = html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const [, body] of scripts) {
    let data;
    try {
      data = JSON.parse(body.trim());
    } catch {
      continue; // some sites ship broken JSON-LD; skip it
    }
    const product = flattenNodes(data).find((node) => isType(node, 'Product') || isType(node, 'ProductGroup'));
    if (product) return product;
  }
  return null;
}

// JSON-LD can be one object, an array of objects, or { "@graph": [...] }. Flatten to a list.
function flattenNodes(data) {
  if (Array.isArray(data)) return data.flatMap(flattenNodes);
  if (data && typeof data === 'object') {
    return data['@graph'] ? [data, ...flattenNodes(data['@graph'])] : [data];
  }
  return [];
}

// "@type" can be "Product" or ["Product", "Thing"].
function isType(node, type) {
  const t = node?.['@type'];
  return Array.isArray(t) ? t.includes(type) : t === type;
}

function firstOffer(offers) {
  if (!offers) return null;
  if (Array.isArray(offers)) return offers[0] ?? null;
  // An AggregateOffer may nest a list of offers.
  if (!offers.price && !offers.lowPrice && Array.isArray(offers.offers)) return offers.offers[0] ?? null;
  return offers;
}

function firstImage(image) {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return firstImage(image[0]);
  return image.url ?? null;
}

// ---------------- Meta tags ----------------

// Returns { 'og:title': '...', 'product:price:amount': '...', ... } (keys lowercased).
function readMetaTags(html) {
  const tags = {};
  for (const [tag] of html.matchAll(/<meta\s[^>]*>/gi)) {
    const attrs = readAttributes(tag);
    const key = (attrs.property ?? attrs.name ?? attrs.itemprop)?.toLowerCase();
    if (key && attrs.content !== undefined && !(key in tags)) tags[key] = decodeEntities(attrs.content);
  }
  return tags;
}

function readAttributes(tag) {
  const attrs = {};
  for (const [, name, , doubleQuoted, singleQuoted] of tag.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    attrs[name.toLowerCase()] = doubleQuoted ?? singleQuoted;
  }
  return attrs;
}

function readTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]) : null;
}

// ---------------- Text helpers ----------------

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

// Trim and collapse whitespace; empty -> null so `??` falls through to the next source.
function clean(value) {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length ? text : null;
}

function truncate(text, max) {
  return text && text.length > max ? `${text.slice(0, max)}...` : text;
}
