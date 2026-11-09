// A saved verdict (/verdict?id=...&from=judge|history): the score, what you did
// about it, Impulsify's take (with chat), and the factor-by-factor math.
//
// The score shown is the one saved when you judged it, so editing your profile
// later doesn't rewrite history.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Card from '../components/Card';
import ChipGroup from '../components/ChipGroup';
import FriendChat from '../components/FriendChat';
import PrimaryButton from '../components/PrimaryButton';
import Screen from '../components/Screen';
import ScoreReveal from '../components/ScoreReveal';
import { recentForMemory } from '../history/stats';
import { requestKeepJudgeForm } from '../judgeFormKeep';
import { cancelReminder, scheduleSleepOnItReminder, SLEEP_ON_IT_HOURS } from '../notifications';
import { CATEGORIES, USAGE_OPTIONS } from '../questions';
import { deleteEntry, loadHistory, updateEntry } from '../storage/historyStorage';
import { loadProfile } from '../storage/profileStorage';
import { colors, spacing, type } from '../theme';

const STATUS_OPTIONS = [
  { value: 'bought', label: 'Bought it' },
  { value: 'skipped', label: 'Skipped it' },
];

// Same answers as the 7-day "still glad?" check; either one feeds the learning model.
const FEELING_OPTIONS = [
  { value: 'glad', label: 'Glad I got it' },
  { value: 'regret', label: 'Regret it' },
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

  if (!entry) return <View style={styles.blank} />;

  const { result } = entry;
  const product = {
    ...entry.product,
    // Readable versions for Impulsify.
    categoryLabel: CATEGORIES.find((c) => c.value === entry.product.category)?.label ?? entry.product.category,
    usageLabel: USAGE_OPTIONS.find((u) => u.value === entry.product.usage)?.label ?? entry.product.usage,
  };
  const price = `$${product.price.toLocaleString('en-US')}`;
  const hasTrackRecord = result.factors.some((f) => f.id === 'trackRecord');

  // Bought or skipped: record it, and the reminder is no longer needed.
  async function handleStatus(status) {
    await cancelReminder(entry.reminderId);
    setEntry(await updateEntry(entry.id, { status, decidedAt: new Date().toISOString(), regret: null, reminderId: null }));
  }

  async function handleFeeling(regret) {
    setEntry(await updateEntry(entry.id, { regret }));
  }

  function handleTweak() {
    requestKeepJudgeForm(); // the Judge form keeps your values instead of clearing
    router.back();
  }

  function handleBack() {
    // Opened from a notification on a cold start there may be nothing to go back to.
    if (router.canGoBack()) router.back();
    else router.replace('/history');
  }

  function handleDelete() {
    Alert.alert('Delete this item?', `"${product.name}" and its chat will be removed from your history.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await cancelReminder(entry.reminderId);
          await deleteEntry(entry.id);
          handleBack();
        },
      },
    ]);
  }

  const footer =
    from === 'judge' ? (
      <View style={styles.footerRow}>
        {/* Tweak keeps the form filled in, so you can try "what if I used it weekly?" */}
        <PrimaryButton title="Tweak" icon="create-outline" variant="secondary" onPress={handleTweak} style={styles.flex} />
        {/* Going back any other way (this, or swiping) gives you a fresh form. */}
        <PrimaryButton title="Done" onPress={() => router.back()} style={styles.flex} />
      </View>
    ) : (
      <PrimaryButton title="Back" icon="chevron-back" variant="secondary" onPress={handleBack} />
    );

  return (
    <Screen
      keyboard
      title={product.name}
      subtitle={`${price} · ${product.categoryLabel} · judged ${new Date(entry.createdAt).toLocaleDateString()}`}
      footer={footer}
    >
      <ScoreReveal
        score={result.score}
        verdictId={result.verdict.id}
        verdictLabel={result.verdict.label}
        animate={from === 'judge'} // count up only for a fresh verdict, not when browsing history
      />

      <Card title="Did you buy it?">
        <ChipGroup options={STATUS_OPTIONS} value={entry.status === 'undecided' ? null : entry.status} onChange={handleStatus} />
        {entry.status === 'skipped' && <Text style={styles.note}>Nice. That's {price} still in your pocket.</Text>}
        {entry.status === 'undecided' && entry.reminderId && (
          <Text style={styles.note}>I'll check back in {SLEEP_ON_IT_HOURS} hours.</Text>
        )}
        {entry.status === 'bought' && (
          <View style={styles.feeling}>
            <Text style={styles.feelingLabel}>How do you feel about it now?</Text>
            <ChipGroup options={FEELING_OPTIONS} value={entry.regret} onChange={handleFeeling} />
            <Text style={styles.note}>This teaches me what you regret, so future verdicts fit you better.</Text>
          </View>
        )}
      </Card>

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

      <Card title="The math">
        <Row label="Starting score" points={result.baseScore} isBase />
        {result.factors.map((f) => (
          <Row key={f.id} label={f.label} detail={f.detail} points={f.points} />
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Final score</Text>
          <Text style={styles.totalPoints}>{result.score}</Text>
        </View>
        <Text style={styles.note}>
          Your strictness is ×{result.strictness}. It multiplies the negative numbers from your answers
          {result.strictness > 1 ? ', because you regret purchases or return stuff a lot' : ''}
          {hasTrackRecord ? ', but not your track record, which already comes from your regrets' : ''}. Scores are
          rounded and kept between 0 and 100.
        </Text>
      </Card>

      {from !== 'judge' && (
        <PrimaryButton title="Delete from history" icon="trash-outline" variant="danger" size="sm" onPress={handleDelete} />
      )}
    </Screen>
  );
}

function Row({ label, detail, points, isBase = false }) {
  const pointColor = isBase || points === 0 ? colors.textSecondary : points > 0 ? colors.success : colors.danger;
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
  blank: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  footerRow: { flexDirection: 'row', gap: spacing.sm },
  note: { ...type.small, color: colors.textSecondary, marginTop: spacing.md },
  feeling: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  feelingLabel: { ...type.small, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowLabel: { ...type.bodyStrong, color: colors.text },
  rowDetail: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  rowPoints: { ...type.heading, minWidth: 60, textAlign: 'right', fontVariant: ['tabular-nums'] },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: { ...type.bodyStrong, color: colors.text },
  totalPoints: { ...type.heading, color: colors.text, fontVariant: ['tabular-nums'] },
});
