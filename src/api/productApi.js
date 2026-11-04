// Turns a pasted link or a typed description into product details (backend POST /extract).

import { CATEGORIES } from '../questions';
import { postToBackend } from './backend';

// Finds the first http(s) link in some text, e.g. "look at this https://amzn.to/abc" -> "https://amzn.to/abc".
export function findLink(text) {
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  return match ? match[0] : null;
}

/**
 * @param text a pasted link (possibly with other text around it) or a description
 * @returns { product: { name, price, category }, currency, image, source, pageRead, missing }
 *          Any of name/price/category may be null; `missing` lists which.
 */
export function fillInProduct(text) {
  const link = findLink(text);
  // The app sends its category list, so the backend never has to keep its own copy.
  const categories = CATEGORIES;
  return postToBackend('/extract', link ? { url: link, categories } : { description: text.trim(), categories });
}
