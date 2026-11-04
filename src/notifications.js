// The 48-hour "Still want it?" reminder for "Sleep on it" verdicts.
// These are local notifications: the phone schedules them itself, no server involved.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const SLEEP_ON_IT_HOURS = 48;

// Show reminders even if the app happens to be open when they fire.
export function setUpNotifications() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// iPhone asks "Allow notifications?" once; after that this just checks the answer.
async function ensurePermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const result = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true } });
  return result.granted;
}

// Schedules the reminder and returns its id (so it can be cancelled), or null if
// notifications are off or unsupported (the web preview).
export async function scheduleSleepOnItReminder(entry) {
  if (Platform.OS === 'web') return null;
  try {
    if (!(await ensurePermission())) return null;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `Still want the ${entry.product.name}?`,
        body: `${SLEEP_ON_IT_HOURS} hours are up. Tap to say whether you bought it or skipped it.`,
        data: { entryId: entry.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: SLEEP_ON_IT_HOURS * 60 * 60 },
    });
  } catch {
    return null;
  }
}

export async function cancelReminder(reminderId) {
  if (!reminderId || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderId);
  } catch {
    // already fired or gone: nothing to cancel
  }
}
