// The bottom tab bar. Files in this (tabs) folder are its tabs; the parentheses
// mean the folder name isn't part of the URL, so these are /judge, /history, /profile.

import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { selectionHaptic } from '../../haptics';
import { colors } from '../../theme';

// Filled icon when the tab is selected, outline when it isn't (the iOS convention).
const icon =
  (name) =>
  ({ color, focused }) => <Ionicons name={focused ? name : `${name}-outline`} color={color} size={24} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          // On iPhone the bar grows for the home indicator by itself; the web
          // preview needs a little extra room or the labels get clipped.
          ...(Platform.OS === 'web' && { height: 64 }),
        },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
      screenListeners={{ tabPress: selectionHaptic }}
    >
      <Tabs.Screen name="judge" options={{ title: 'Judge', tabBarIcon: icon('pricetag') }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('time') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
