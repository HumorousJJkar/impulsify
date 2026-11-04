// The first screen the app opens. It shows nothing itself: it checks whether a
// profile is saved and sends you to the questionnaire (new user) or the Judge tab.

import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { loadProfile } from '../storage/profileStorage';
import { colors } from '../theme';

export default function Index() {
  // undefined = still loading, null = no profile saved, object = saved profile
  const [profile, setProfile] = useState(undefined);

  useEffect(() => {
    loadProfile().then(setProfile);
  }, []);

  if (profile === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <Redirect href={profile ? '/judge' : '/questionnaire'} />;
}
