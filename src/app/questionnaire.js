// The questionnaire: a welcome screen (first launch), then one question per screen.
// Used both for first launch and for "Edit answers" (it pre-fills saved answers).

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LogoMark from '../components/LogoMark';
import PrimaryButton from '../components/PrimaryButton';
import QuestionInput from '../components/QuestionInput';
import { defaultAnswers, isAnswered, QUESTIONS } from '../questions';
import { loadProfile, saveProfile } from '../storage/profileStorage';
import { colors, radius, spacing, type } from '../theme';

export default function Questionnaire() {
  // -1 = the welcome screen (first launch only), 0..8 = index into QUESTIONS
  const [step, setStep] = useState(null); // null until loaded
  const [answers, setAnswers] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // On open: start from saved answers if there are any, otherwise defaults + welcome.
  useEffect(() => {
    loadProfile().then((profile) => {
      if (profile) {
        setAnswers(profile.answers);
        setIsEditing(true);
        setStep(0);
      } else {
        setAnswers(defaultAnswers());
        setStep(-1);
      }
    });
  }, []);

  if (step === null) return <View style={styles.screen} />;

  if (step === -1) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.welcome}>
          <LogoMark size={72} />
          <Text style={styles.brand}>Impulsify</Text>
          <Text style={styles.tagline}>Pause before you pay.</Text>
          <Text style={styles.welcomeText}>
            Answer {QUESTIONS.length} quick questions. Then run any purchase by me and I'll tell you, honestly, if it's
            worth it for you.
          </Text>
        </View>
        <View style={styles.footer}>
          <PrimaryButton title="Get started" onPress={() => setStep(0)} style={styles.flex} />
        </View>
      </SafeAreaView>
    );
  }

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
    else setStep(-1); // back to the welcome screen
  }

  const progress = (step + 1) / QUESTIONS.length;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} hitSlop={12} style={styles.backIcon}>
            <Ionicons name={step === 0 && isEditing ? 'close' : 'chevron-back'} size={24} color={colors.text} />
          </Pressable>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.stepCount}>
            {step + 1}/{QUESTIONS.length}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <Text style={styles.section}>{question.section}</Text>
          <Text style={styles.title}>{question.title}</Text>
          {question.helper && <Text style={styles.helper}>{question.helper}</Text>}

          <View style={styles.input}>
            <QuestionInput question={question} value={value} onChange={setAnswer} answers={answers} />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            title={isLast ? (saving ? 'Saving...' : isEditing ? 'Save' : 'Finish') : 'Next'}
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

  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  brand: { ...type.title, fontSize: 36, lineHeight: 42, color: colors.text, marginTop: spacing.lg },
  tagline: { ...type.heading, color: colors.accent, marginTop: spacing.xs },
  welcomeText: { ...type.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backIcon: { width: 28, alignItems: 'flex-start' },
  progressTrack: { flex: 1, height: 6, backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: radius.pill },
  stepCount: { ...type.small, fontWeight: '600', color: colors.textTertiary, width: 32, textAlign: 'right' },

  body: { paddingHorizontal: spacing.screen, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  section: { ...type.caption, color: colors.accent, marginBottom: spacing.sm },
  title: { ...type.title, color: colors.text },
  helper: { ...type.body, color: colors.textSecondary, marginTop: spacing.sm },
  input: { marginTop: spacing.xl },

  footer: { flexDirection: 'row', paddingHorizontal: spacing.screen, paddingTop: spacing.md, paddingBottom: spacing.md },
});