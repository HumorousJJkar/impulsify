// Saves and loads the user's profile on the phone.
//
// AsyncStorage is a simple key -> string store that survives app restarts
// (think of it as a tiny HashMap<String, String> written to disk).
// We store the whole profile as one JSON string under one key.

import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'impulsify.profile';

// Bump this if the shape of the saved profile ever changes, so old saves can be migrated.
const PROFILE_VERSION = 1;

// Returns the saved profile, or null if the questionnaire hasn't been done yet.
export async function loadProfile() {
  const json = await AsyncStorage.getItem(PROFILE_KEY);
  if (json === null) return null;

  try {
    return JSON.parse(json);
  } catch {
    // Corrupted save: treat it like a new user rather than crashing.
    return null;
  }
}

// Saves the questionnaire answers. Keeps the original createdAt when editing.
export async function saveProfile(answers) {
  const existing = await loadProfile();
  const now = new Date().toISOString();

  const profile = {
    version: PROFILE_VERSION,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    answers,
  };

  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export async function clearProfile() {
  await AsyncStorage.removeItem(PROFILE_KEY);
}
