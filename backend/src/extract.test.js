// Tests for the page extractor. Run from backend/ with: npm test

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractFromHtml, parsePrice } from './extract.js';

const page = (head) => `<!doctype html><html><head>${head}</head><body>...</body></html>`;

test('reads a schema.org Product from JSON-LD', () => {
  const html = page(`
    <title>Ignored title</title>
    <script type="application/ld+json">
      { "@context": "https://schema.org", "@type": "Product", "name": "Sony WH-1000XM5",
        "brand": { "@type": "Brand", "name": "Sony" }, "image": ["https://img/1.jpg"],
        "offers": { "@type": "Offer", "price": "348.00", "priceCurrency": "USD" } }
    </script>`);

  const result = extractFromHtml(html);
  assert.equal(result.name, 'Sony WH-1000XM5');
  assert.equal(result.price, 348);
  assert.equal(result.currency, 'USD');
  assert.equal(result.brand, 'Sony');
  assert.equal(result.image, 'https://img/1.jpg');
});

test('finds the Product inside an @graph and an offers array', () => {
  const html = page(`
    <script type="application/ld+json">
      { "@graph": [ { "@type": "WebPage", "name": "Shop" },
                    { "@type": ["Product", "Thing"], "name": "Trail Shoe",
                      "offers": [ { "price": 129.95, "priceCurrency": "USD" } ] } ] }
    </script>`);

  const result = extractFromHtml(html);
  assert.equal(result.name, 'Trail Shoe');
  assert.equal(result.price, 129.95);
});

test('AggregateOffer uses lowPrice', () => {
  const html = page(`<script type="application/ld+json">
    {"@type":"Product","name":"Hoodie","offers":{"@type":"AggregateOffer","lowPrice":"45","highPrice":"60"}}
  </script>`);
  assert.equal(extractFromHtml(html).price, 45);
});

test('skips broken JSON-LD and falls back to meta tags', () => {
  const html = page(`
    <script type="application/ld+json">{ "broken": </script>
    <meta property="og:title" content="Desk Lamp &amp; Charger">
    <meta property="product:price:amount" content="39.99">
    <meta property="product:price:currency" content="USD">
    <meta property="og:site_name" content="LampCo">`);

  const result = extractFromHtml(html);
  assert.equal(result.name, 'Desk Lamp & Charger');
  assert.equal(result.price, 39.99);
  assert.equal(result.currency, 'USD');
  assert.equal(result.siteName, 'LampCo');
});

test('meta attributes work in any order and with single quotes', () => {
  const html = page(`<meta content='Blue Mug' property='og:title'>`);
  assert.equal(extractFromHtml(html).name, 'Blue Mug');
});

test('only a <title>: name from title, no price', () => {
  const result = extractFromHtml(page('<title>  Amazon.com : Some Gadget  </title>'));
  assert.equal(result.name, 'Amazon.com : Some Gadget');
  assert.equal(result.price, null);
});

test('blocked / empty page gives all nulls', () => {
  const result = extractFromHtml('<html><body>Robot check</body></html>');
  assert.equal(result.name, null);
  assert.equal(result.price, null);
});

test('parsePrice handles symbols, commas, and junk', () => {
  assert.equal(parsePrice('$1,299.99'), 1299.99);
  assert.equal(parsePrice(149), 149);
  assert.equal(parsePrice('free'), null);
  assert.equal(parsePrice('0.00'), null);
  assert.equal(parsePrice(undefined), null);
});
