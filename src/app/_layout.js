// Root layout: wraps every screen in the app.
//
// Expo Router uses the files in src/app/ as screens (like pages on a website):
//   src/app/index.js         -> "/"              decides where to send you
//   src/app/questionnaire.js -> "/questionnaire"
//   src/app/profile.js       -> "/profile"
// A Stack navigator means new screens slide in on top of the old ones.

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <>
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
