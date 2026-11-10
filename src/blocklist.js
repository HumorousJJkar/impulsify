// Things Impulsify won't judge at all, checked before the scoring engine runs.
// Plain JS, no AI, so it's instant and works offline. Like the engine, it has no
// React imports, so `npm test` can run it (see blocklist.test.js).
//
// This only catches the obvious cases by word. The AI catches the rest: when it
// refuses to treat an item as a real purchase, the backend flags it and the
// verdict screen hides the score (see `blocked` in backend/src/friend.js).

// Each pattern is a regular expression, /i makes it ignore case, and \b means
// "word boundary": /\bslaves?\b/ matches "kevin the slave" and "2 slaves" but not
// a word that merely contains it.
const BLOCKED_PATTERNS = [
  /\bslaves?\b/i,
  /\bslavery\b/i,
  /\btraffick(ed|ing)?\b/i,
  /\bhuman beings?\b/i,
  /\b(buy|sell|own)(ing)? (a |an )?(person|people|human|kid|child|girl|boy|woman|man)\b/i,
];

// Harmless things that contain a blocked word. Removed from the name before checking.
// "master/slave" is an old technical name for camera flash triggers and hard drives;
// "12 Years a Slave" is a movie.
const ALLOWED_PHRASES = [/\bmaster[\s/-]*slave\b/gi, /\b(twelve|12) years a slave\b/gi];

export function isBlockedProduct(name) {
  let text = String(name ?? '');
  for (const phrase of ALLOWED_PHRASES) text = text.replace(phrase, '');
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
}

export const BLOCKED_MESSAGE = "I'm not judging that. People aren't products. Try something you'd actually buy.";
