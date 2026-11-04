// The questionnaire: one question per screen, with Back / Next and a progress bar.
// Used both for first launch and for "Edit answers" (it pre-fills saved answers).

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrimaryButton from '../components/PrimaryButton';
import QuestionInput from '../components/QuestionInput';
import { defaultAnswers, isAnswered, QUESTIONS } from '../questions';
import { loadProfile, saveProfile } from '../storage/profileStorage';
import { colors, font, radius, spacing } from '../theme';

export default function Questionnaire() {
  const [step, setStep] = useState(0); // index into QUESTIONS
  const [answers, setAnswers] = useState(null); // null until loaded
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // On open: start from saved answers if there are any, otherwise defaults.
  useEffect(() => {
    loadProfile().then((profile) => {
      if (profile) {
        setAnswers(profile.answers);
        setIsEditing(true);
      } else {
        setAnswers(defaultAnswers());
      }
    });
  }, []);

  if (answers === null) return <View style={styles.screen} />;

  const question = QUESTIONS[step];
  const value = answers[question.id];
  const isLast = step === QUESTIONS.length - 1;
  const canContinue = isAnswered(question, value);

  function setAnswer(newValue) {
    const next = { ...answers, [question.id]: newValue };

    // Keep the two category lists from overlapping if priorities change.
    if (question.id === 'priorities') {
      next.cutBack = next.cutBack.filter((c) => !newValue.includes(c));
    }
    setAnswers(next);
  }

  async function handleNext() {
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    setSaving(true);
    await saveProfile(answers);
    // Editing: the profile tab is underneath us, so just go back to it.
    // First launch: there's nothing underneath, so swap this screen for the Judge tab.
    if (isEditing && router.canGoBack()) router.back();
    else router.replace('/judge');
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
    else if (isEditing && router.canGoBack()) router.back();
  }

  const progress = (step + 1) / QUESTIONS.length;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.section}>{question.section}</Text>
          <Text style={styles.stepCount}>
            {step + 1} of {QUESTIONS.length}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {step === 0 && !isEditing && (
            <Text style={styles.intro}>
              Quick setup so I can tell you when you're about to waste money. Be honest, nobody's watching.
            </Text>
          )}
          <Text style={styles.title}>{question.title}</Text>
          {question.helper && <Text style={styles.helper}>{question.helper}</Text>}

          <View style={styles.input}>
            <QuestionInput question={question} value={value} onChange={setAnswer} answers={answers} />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {(step > 0 || isEditing) && (
            <PrimaryButton
              title={step === 0 ? 'Cancel' : 'Back'}
              variant="secondary"
              onPress={handleBack}
              style={styles.backButton}
            />
          )}
          <PrimaryButton
            title={isLast ? (saving ? 'Saving...' : 'Finish') : 'Next'}
            onPress={handleNext}
            disabled={!canContinue || saving}
            style={styles.flex}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  section: { color: colors.accent, fontSize: font.small, fontWeight: '700', textTransform: 'uppercase' },
  stepCount: { color: colors.textMuted, fontSize: font.small },
  progressTrack: {
    height: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  body: { padding: spacing.lg, paddingTop: spacing.xl },
  intro: { color: colors.textMuted, fontSize: font.body, marginBottom: spacing.lg, lineHeight: 22 },
  title: { color: colors.text, fontSize: font.title, fontWeight: '800', lineHeight: 34 },
  helper: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.sm },
  input: { marginTop: spacing.xl },
  footer: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  backButton: { minWidth: 100 },
});
