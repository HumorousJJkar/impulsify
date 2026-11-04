// Saves every judged item (product, score, chat, what you did) on the phone.
// Stored as one JSON array under one AsyncStorage key, newest first.
// See src/history/stats.js for the shape of an entry.

import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'impulsify.history';

export async function loadHistory() {
  const json = await AsyncStorage.getItem(HISTORY_KEY);
  if (json === null) return [];
  try {
    return JSON.parse(json);
  } catch {
    return []; // corrupted save: start fresh rather than crash
  }
}

export async function getEntry(id) {
  return (await loadHistory()).find((e) => e.id === id) ?? null;
}

// Adds a newly judged product and returns the saved entry.
export async function addEntry({ product, result }) {
  const entry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    product,
    result,
    chat: [],
    status: 'undecided',
    decidedAt: null,
    regret: null,
    reminderId: null,
  };
  await save([entry, ...(await loadHistory())]);
  return entry;
}

// Merges `changes` into one entry (like an SQL UPDATE ... WHERE id = ?) and returns it.
export async function updateEntry(id, changes) {
  const history = await loadHistory();
  const index = history.findIndex((e) => e.id === id);
  if (index === -1) return null;
  history[index] = { ...history[index], ...changes };
  await save(history);
  return history[index];
}

// Removes one entry (like an SQL DELETE ... WHERE id = ?).
export async function deleteEntry(id) {
  await save((await loadHistory()).filter((e) => e.id !== id));
}

// Replaces the whole history at once (used by "Load demo data").
export async function replaceHistory(entries) {
  await save(entries);
}

export async function clearHistory() {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

async function save(history) {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
