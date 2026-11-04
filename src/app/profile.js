// Shows the saved profile, grouped by questionnaire section, with options to
// edit the answers or wipe the profile and start over.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrimaryButton from '../components/PrimaryButton';
import { describeAnswer, QUESTIONS } from '../questions';
import { clearProfile, loadProfile } from '../storage/profileStorage';
import { colors, font, radius, spacing } from '../theme';

// ['Budget & income', 'Priorities', 'Regret habits'], in questionnaire order
const SECTIONS = [...new Set(QUESTIONS.map((q) => q.section))];

export default function Profile() {
  const [profile, setProfile] = useState(null);

  // Reload every time this screen comes into view, so edits show up right away.
  useFocusEffect(
    useCallback(() => {
      loadProfile().then((saved) => {
        if (saved) setProfile(saved);
        else router.replace('/questionnaire');
      });
    }, [])
  );

  function handleStartOver() {
    Alert.alert('Start over?', 'This deletes your profile and runs the questionnaire again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await clearProfile();
          router.replace('/questionnaire');
        },
      },
    ]);
  }

  if (!profile) return <View style={styles.screen} />;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Your profile</Text>
        <Text style={styles.subtitle}>This is what I'll judge your purchases against.</Text>

        {SECTIONS.map((section) => (
          <View key={section} style={styles.card}>
            <Text style={styles.cardTitle}>{section}</Text>
            {QUESTIONS.filter((q) => q.section === section).map((q) => (
              <View key={q.id} style={styles.row}>
                <Text style={styles.question}>{q.title}</Text>
                <Text style={styles.answer}>{describeAnswer(q, profile.answers[q.id])}</Text>
              </View>
            ))}
          </View>
        ))}

        <PrimaryButton title="Judge a purchase" onPress={() => router.push('/judge')} style={styles.button} />
        <PrimaryButton
          title="Edit answers"
          variant="secondary"
          onPress={() => router.push('/questionnaire')}
          style={styles.button}
        />
        <PrimaryButton title="Start over" variant="danger" onPress={handleStartOver} style={styles.button} />

        <Text style={styles.meta}>Last updated {new Date(profile.updatedAt).toLocaleString()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg },
  title: { color: colors.text, fontSize: font.title, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    color: colors.accent,
    fontSize: font.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  row: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  question: { color: colors.textMuted, fontSize: font.small },
  answer: { color: colors.text, fontSize: font.body, fontWeight: '600', marginTop: 2 },
  button: { marginTop: spacing.md },
  meta: { color: colors.textMuted, fontSize: font.small, textAlign: 'center', marginTop: spacing.lg },
});
