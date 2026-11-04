// Root layout: wraps every screen in the app.
//
// Expo Router uses the files in src/app/ as screens (like pages on a website):
//   src/app/index.js         -> "/"              decides where to send you
//   src/app/questionnaire.js -> "/questionnaire"
//   src/app/(tabs)/...       -> "/judge", "/history", "/profile" (the bottom tabs)
//   src/app/verdict.js       -> "/verdict?id=..." slides in over the tabs
// A Stack navigator means new screens slide in on top of the old ones.

import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { setUpNotifications } from '../notifications';
import { colors } from '../theme';

setUpNotifications();

export default function RootLayout() {
  return (
    <>
      {/* Notifications only exist on a phone; the web preview skips this. */}
      {Platform.OS !== 'web' && <OpenVerdictOnNotificationTap />}
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false, // each screen draws its own title
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      />
    </>
  );
}

// Draws nothing: tapping a "Still want it?" reminder opens that item's verdict.
function OpenVerdictOnNotificationTap() {
  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const entryId = lastResponse?.notification.request.content.data?.entryId;
    if (typeof entryId === 'string') {
      router.push({ pathname: '/verdict', params: { id: entryId, from: 'history' } });
    }
  }, [lastResponse]);
  return null;
}
