// The one place that knows how to reach the Impulsify backend (backend/src/index.js).
//
// The app only knows the backend's URL and a shared app key, both read from
// .env.local. The Anthropic API key never leaves the backend.

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const APP_KEY = process.env.EXPO_PUBLIC_APP_KEY;

export function isBackendConfigured() {
  return Boolean(API_URL && APP_KEY);
}

// POSTs JSON to a backend path ('/friend', '/extract') and returns the JSON reply.
// Throws an Error with the backend's message if the request fails.
export async function postToBackend(path, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-app-key': APP_KEY },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
  return data;
}
