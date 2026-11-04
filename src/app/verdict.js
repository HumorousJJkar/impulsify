// A saved verdict (/verdict?id=...&from=judge|history): big score, what you did
// about it, Impulsify's take (with chat), and the factor-by-factor math.
//
// The score shown is the one saved when you judged it, so editing your profile
// later doesn't rewrite history.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChipGroup from '../components/ChipGroup';
import FriendChat from '../components/FriendChat';
import PrimaryButton from '../components/PrimaryButton';
import { recentForMemory } from '../history/stats';
import { requestJudgeFormReset } from '../judgeFormReset';
import { cancelReminder, scheduleSleepOnItReminder, SLEEP_ON_IT_HOURS } from '../notifications';
import { CATEGORIES, USAGE_OPTIONS } from '../questions';
import { loadHistory, updateEntry } from '../storage/historyStorage';
import { loadProfile } from '../storage/profileStorage';
import { colors, font, radius, spacing, verdictColors } from '../theme';

const STATUS_OPTIONS = [
  { value: 'bought', label: 'Bought it' },
  { value: 'skipped', label: 'Skipped it' },
];

export default function Verdict() {
  const { id, from } = useLocalSearchParams(); // from: 'judge' (just judged) or 'history'
  const [entry, setEntry] = useState(null);
  const [answers, setAnswers] = useState(null);
  const [recent, setRecent] = useState([]); // Impulsify's memory of your other items

  useEffect(() => {
    (async () => {
      const [profile, history] = await Promise.all([loadProfile(), loadHistory()]);
      if (!profile) return router.replace('/questionnaire');

      let found = history.find((e) => e.id === id);
      if (!found) return router.replace('/history'); // e.g. history was cleared

      // Just judged as "Sleep on it": schedule the 48-hour "still want it?" reminder.
      if (from === 'judge' && found.result.verdict.id === 'sleep_on_it' && found.status === 'undecided' && !found.reminderId) {
        const reminderId = await scheduleSleepOnItReminder(found);
        if (reminderId) found = await updateEntry(found.id, { reminderId });
      }

      setAnswers(profile.answers);
      setRecent(recentForMemory(history, found.id));
      setEntry(found);
    })();
  }, [id]);

  if (!entry) return <View style={styles.screen} />;

  const { result } = entry;
  const color = verdictColors[result.verdict.id];
  const product = {
    ...entry.product,
    // Readable versions for Impulsify.
    categoryLabel: CATEGORIES.find((c) => c.value === entry.product.category)?.label ?? entry.product.category,
    usageLabel: USAGE_OPTIONS.find((u) => u.value === entry.product.usage)?.label ?? entry.product.usage,
  };

  // Bought or skipped: record it, and the reminder is no longer needed.
  async function handleStatus(status) {
    await cancelReminder(entry.reminderId);
    setEntry(await updateEntry(entry.id, { status, decidedAt: new Date().toISOString(), regret: null, reminderId: null }));
  }

  function handleDone() {
    requestJudgeFormReset(); // the Judge form clears itself when you land back on it
    router.back();
  }

  function handleBack() {
    // Opened from a notification on a cold start there may be nothing to go back to.
    if (router.canGoBack()) router.back();
    else router.replace('/history');
  }

  return (
    <SafeAreaView style={styles.screen}>
      {/* automaticallyAdjustKeyboardInsets (iOS) keeps the chat box visible above the keyboard. */}
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productPrice}>
          ${product.price.toLocaleString('en-US')} · judged {new Date(entry.createdAt).toLocaleDateString()}
        </Text>

        <View style={[styles.verdictCard, { borderColor: color }]}>
          <Text style={[styles.score, { color }]}>{result.score}</Text>
          <Text style={styles.outOf}>out of 100</Text>
          <Text style={[styles.verdictLabel, { color }]}>{result.verdict.label}</Text>
        </View>

        <View style={[styles.card, styles.statusCard]}>
          <Text style={styles.cardTitle}>Did you buy it?</Text>
          <ChipGroup
            options={STATUS_OPTIONS}
            value={entry.status === 'undecided' ? null : entry.status}
            onChange={handleStatus}
          />
          {entry.status === 'skipped' && (
            <Text style={styles.note}>Nice. That's ${product.price.toLocaleString('en-US')} still in your pocket.</Text>
          )}
          {entry.status === 'undecided' && entry.reminderId && (
            <Text style={styles.note}>I'll check back in {SLEEP_ON_IT_HOURS} hours.</Text>
          )}
        </View>

        {/* key: a different entry gets a fresh chat component */}
        <FriendChat
          key={entry.id}
          product={product}
          result={result}
          answers={answers}
          recent={recent}
          initialMessages={entry.chat}
          onMessagesChange={(chat) => updateEntry(entry.id, { chat })}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>The math</Text>

          <Row label="Starting score" points={result.baseScore} isBase />
          {result.factors.map((f) => (
            <Row key={f.id} label={f.label} detail={f.detail} points={f.points} />
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Final score</Text>
            <Text style={[styles.totalPoints, { color }]}>{result.score}</Text>
          </View>

          <Text style={styles.note}>
            Your strictness is x{result.strictness}: it multiplies every negative number above
            {result.strictness > 1 ? ', because you regret purchases or return stuff a lot' : ''}. Scores are
            rounded and kept between 0 and 100.
          </Text>
        </View>

        {from === 'judge' ? (
          <>
            {/* Back keeps the form filled in, so you can try "what if I used it weekly?" */}
            <PrimaryButton title="Tweak the details" variant="secondary" onPress={() => router.back()} style={styles.button} />
            <PrimaryButton title="Done" onPress={handleDone} style={styles.button} />
          </>
        ) : (
          <PrimaryButton title="Back" variant="secondary" onPress={handleBack} style={styles.button} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, detail, points, isBase = false }) {
  const pointColor = isBase || points === 0 ? colors.textMuted : points > 0 ? colors.accent : colors.danger;
  const pointText = isBase ? String(points) : points > 0 ? `+${points}` : String(points);

  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail && <Text style={styles.rowDetail}>{detail}</Text>}
      </View>
      <Text style={[styles.rowPoints, { color: pointColor }]}>{pointText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: { padding: spacing.lg },
  productName: { color: colors.text, fontSize: font.heading, fontWeight: '800' },
  productPrice: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.xs },
  verdictCard: {
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    marginVertical: spacing.lg,
    backgroundColor: colors.surface,
  },
  score: { fontSize: 72, fontWeight: '900', lineHeight: 80 },
  outOf: { color: colors.textMuted, fontSize: font.small },
  verdictLabel: { fontSize: font.heading, fontWeight: '800', marginTop: spacing.md, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLabel: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  rowDetail: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  rowPoints: { fontSize: font.heading, fontWeight: '800', minWidth: 56, textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  totalLabel: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  totalPoints: { fontSize: font.heading, fontWeight: '900' },
  statusCard: { marginBottom: spacing.lg },
  note: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.md, lineHeight: 18 },
  button: { marginTop: spacing.md },
});
