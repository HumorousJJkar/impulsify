// The History tab: money you've kept, "still glad you bought it?" checks, and every
// item you've judged. Tap an item to see its verdict and chat; long-press to delete.
// Long-press the "History" title for demo tools.

import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Card from '../../components/Card';
import LogoMark from '../../components/LogoMark';
import PrimaryButton from '../../components/PrimaryButton';
import Screen from '../../components/Screen';
import { buildDemoHistory } from '../../history/demoData';
import { dueRegretChecks, summarize } from '../../history/stats';
import { cancelReminder } from '../../notifications';
import { clearHistory, deleteEntry, loadHistory, replaceHistory, updateEntry } from '../../storage/historyStorage';
import { loadProfile } from '../../storage/profileStorage';
import { colors, radius, spacing, type, verdictColors, verdictSoftColors } from '../../theme';

const STATUS_TEXT = { bought: 'Bought', skipped: 'Skipped', undecided: 'Deciding' };

export default function History() {
  const [entries, setEntries] = useState(null); // null while loading

  // Reload whenever the tab comes into view, so new verdicts show up.
  const reload = useCallback(() => {
    loadHistory().then(setEntries);
  }, []);
  useFocusEffect(reload);

  async function answerRegret(entry, regret) {
    await updateEntry(entry.id, { regret });
    reload();
  }

  function confirmDelete(entry) {
    Alert.alert('Delete this item?', `"${entry.product.name}" and its chat will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await cancelReminder(entry.reminderId);
          await deleteEntry(entry.id);
          reload();
        },
      },
    ]);
  }

  async function cancelAllReminders() {
    await Promise.all(entries.map((e) => cancelReminder(e.reminderId)));
  }

  function confirmClear() {
    Alert.alert('Clear history?', 'This deletes every saved verdict and chat. Your profile stays.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await cancelAllReminders();
          await clearHistory();
          reload();
        },
      },
    ]);
  }

  // Hidden: long-press the title.
  function openDemoTools() {
    Alert.alert('Demo tools', 'Replace your history with realistic sample items, scored against your profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Load demo data',
        onPress: async () => {
          const profile = await loadProfile();
          await cancelAllReminders();
          await replaceHistory(buildDemoHistory(profile.answers));
          reload();
        },
      },
    ]);
  }

  if (entries === null) return <View style={styles.blank} />;

  if (entries.length === 0) {
    return (
      <Screen tab title="History" onTitleLongPress={openDemoTools}>
        <View style={styles.empty}>
          <LogoMark size={56} />
          <Text style={styles.emptyTitle}>Nothing judged yet</Text>
          <Text style={styles.emptyText}>Everything you run by me shows up here, along with how much you've kept.</Text>
          <PrimaryButton title="Judge something" onPress={() => router.navigate('/judge')} style={styles.emptyButton} />
        </View>
      </Screen>
    );
  }

  const stats = summarize(entries);
  const regretChecks = dueRegretChecks(entries);

  return (
    <Screen tab title="History" onTitleLongPress={openDemoTools}>
      <View style={styles.hero}>
        <Text style={styles.heroAmount}>${stats.moneySaved.toLocaleString('en-US')}</Text>
        <Text style={styles.heroLabel}>kept in your pocket</Text>
        <View style={styles.statsRow}>
          <Stat value={stats.boughtCount} label="Bought" />
          <View style={styles.statDivider} />
          <Stat value={stats.skippedCount} label="Skipped" />
          <View style={styles.statDivider} />
          <Stat value={stats.undecidedCount} label="Deciding" />
        </View>
        {stats.regretAnswered > 0 && (
          <Text style={styles.regretLine}>
            You regretted {stats.regretCount} of {stats.regretAnswered} thing{stats.regretAnswered === 1 ? '' : 's'} you
            bought.
          </Text>
        )}
      </View>

      {regretChecks.map((entry) => (
        <Card key={entry.id} title="Quick check" style={styles.regretCard}>
          <Text style={styles.regretQuestion}>Still glad you got the {entry.product.name}?</Text>
          <View style={styles.regretButtons}>
            <PrimaryButton title="Glad I did" variant="secondary" size="sm" onPress={() => answerRegret(entry, 'glad')} style={styles.flex} />
            <PrimaryButton title="Regret it" variant="secondary" size="sm" onPress={() => answerRegret(entry, 'regret')} style={styles.flex} />
          </View>
        </Card>
      ))}

      <Card title="Everything you've judged" right={<Text style={styles.count}>{entries.length}</Text>}>
        {entries.map((entry, i) => (
          <Pressable
            key={entry.id}
            onPress={() => router.push({ pathname: '/verdict', params: { id: entry.id, from: 'history' } })}
            onLongPress={() => confirmDelete(entry)}
            style={({ pressed }) => [styles.row, i > 0 && styles.rowBorder, pressed && styles.rowPressed]}
          >
            <View style={[styles.badge, { backgroundColor: verdictSoftColors[entry.result.verdict.id] }]}>
              <Text style={[styles.badgeText, { color: verdictColors[entry.result.verdict.id] }]}>{entry.result.score}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.itemName} numberOfLines={1}>
                {entry.product.name}
              </Text>
              <Text style={styles.itemMeta} numberOfLines={1}>
                ${entry.product.price.toLocaleString('en-US')} · {STATUS_TEXT[entry.status]}
                {entry.regret === 'regret' ? ' · regretted' : ''} · {new Date(entry.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        ))}
      </Card>
      <Text style={styles.hint}>Long-press an item to delete it.</Text>

      <PrimaryButton title="Clear history" icon="trash-outline" variant="danger" size="sm" onPress={confirmClear} />
    </Screen>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  empty: { alignItems: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyTitle: { ...type.heading, color: colors.text, marginTop: spacing.lg },
  emptyText: { ...type.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  emptyButton: { alignSelf: 'stretch', marginTop: spacing.xl },

  hero: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  heroAmount: { ...type.display, fontSize: 56, lineHeight: 62, color: colors.text, fontVariant: ['tabular-nums'] },
  heroLabel: { ...type.small, color: colors.textSecondary, marginTop: spacing.xs },
  statsRow: { flexDirection: 'row', alignSelf: 'stretch', marginTop: spacing.lg },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...type.heading, color: colors.text, fontVariant: ['tabular-nums'] },
  statLabel: { ...type.small, color: colors.textTertiary, marginTop: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  regretLine: { ...type.small, color: colors.textSecondary, marginTop: spacing.lg, textAlign: 'center' },

  regretCard: { borderColor: colors.warning },
  regretQuestion: { ...type.bodyStrong, color: colors.text },
  regretButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },

  count: { ...type.small, fontWeight: '600', color: colors.textTertiary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowPressed: { opacity: 0.6 },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  badgeText: { ...type.bodyStrong, fontVariant: ['tabular-nums'] },
  itemName: { ...type.bodyStrong, color: colors.text },
  itemMeta: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  hint: { ...type.small, color: colors.textTertiary, textAlign: 'center', marginBottom: spacing.lg },
});
