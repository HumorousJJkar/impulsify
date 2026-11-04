// The Profile tab: your saved answers, grouped by questionnaire section, with
// options to edit them or wipe the profile and start over.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Card from '../../components/Card';
import LogoMark from '../../components/LogoMark';
import PrimaryButton from '../../components/PrimaryButton';
import Screen from '../../components/Screen';
import { describeAnswer, QUESTIONS } from '../../questions';
import { clearProfile, loadProfile } from '../../storage/profileStorage';
import { colors, spacing, type } from '../../theme';

// ['Budget & income', 'Priorities', 'Regret habits', 'Tone'], in questionnaire order
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
    Alert.alert('Start over?', 'This deletes your profile and runs the questionnaire again. Your history stays.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start over',
        style: 'destructive',
        onPress: async () => {
          await clearProfile();
          router.replace('/questionnaire');
        },
      },
    ]);
  }

  if (!profile) return <View style={styles.blank} />;

  return (
    <Screen tab title="Your profile" subtitle="What I judge your purchases against.">
      {SECTIONS.map((section) => (
        <Card key={section} title={section}>
          {QUESTIONS.filter((q) => q.section === section).map((q, i) => (
            <View key={q.id} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text style={styles.label}>{q.short}</Text>
              <Text style={styles.answer}>{describeAnswer(q, profile.answers[q.id])}</Text>
            </View>
          ))}
        </Card>
      ))}

      <PrimaryButton
        title="Edit answers"
        icon="create-outline"
        variant="secondary"
        onPress={() => router.push('/questionnaire')}
        style={styles.editButton}
      />
      <PrimaryButton title="Start over" variant="danger" size="sm" onPress={handleStartOver} />

      <View style={styles.footer}>
        <LogoMark size={28} />
        <Text style={styles.footerText}>Impulsify · pause before you pay</Text>
        <Text style={styles.footerMeta}>Profile updated {new Date(profile.updatedAt).toLocaleDateString()}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.bg },
  // Settings-style rows: label on the left, answer on the right.
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: 12 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  label: { ...type.body, color: colors.textSecondary, flexShrink: 0, maxWidth: '55%' }, // natural width
  answer: { ...type.bodyStrong, color: colors.text, flex: 1, textAlign: 'right' }, // takes the rest
  editButton: { marginTop: spacing.sm, marginBottom: spacing.xs },
  footer: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.xs },
  footerText: { ...type.small, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.sm },
  footerMeta: { ...type.small, color: colors.textTertiary },
});
