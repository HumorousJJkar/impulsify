// Small phone vibrations that make taps and verdicts feel physical.
// No-ops in the web preview, and failures are ignored: haptics are a nice-to-have.

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

function run(effect) {
  if (Platform.OS === 'web') return;
  effect().catch(() => {});
}

// A tiny tick, for picking a chip.
export function selectionHaptic() {
  run(() => Haptics.selectionAsync());
}

// A soft tap, for buttons.
export function tapHaptic() {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

// Matches the verdict: a happy buzz for "worth it", a warning for "sleep on it",
// an error buzz for "don't".
export function verdictHaptic(verdictId) {
  const feel = {
    worth_it: Haptics.NotificationFeedbackType.Success,
    sleep_on_it: Haptics.NotificationFeedbackType.Warning,
    dont: Haptics.NotificationFeedbackType.Error,
  }[verdictId];
  if (feel) run(() => Haptics.notificationAsync(feel));
}
