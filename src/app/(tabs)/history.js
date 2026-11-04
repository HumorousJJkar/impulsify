// The History tab: money you've saved, "still glad you bought it?" checks, and
// every item you've judged. Tap an item to see its verdict and chat again.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrimaryButton from '../../components/PrimaryButton';
import { dueRegretChecks, summarize } from '../../history/stats';
import { cancelReminder } from '../../notifications';
import { clearHistory, loadHistory, updateEntry } from '../../storage/historyStorage';
import { colors, font, radius, spacing, verdictColors } from '../../theme';

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

  function handleClear() {
    Alert.alert('Clear history?', 'This deletes every saved verdict and chat. Your profile stays.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await Promise.all(entries.map((e) => cancelReminder(e.reminderId)));
          await clearHistory();
          reload();
        },
      },
    ]);
  }

  if (entries === null) return <View style={styles.screen} />;

  const stats = summarize(entries);
  const regretChecks = dueRegretChecks(entries);

  return (
    // edges={['top']}: the tab bar already handles the bottom of the screen.
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>History</Text>

        {entries.length === 0 ? (
          <Text style={styles.empty}>Nothing judged yet. Head to the Judge tab and run something by me.</Text>
        ) : (
          <>
            <View style={styles.statsCard}>
              <Text style={styles.saved}>${stats.moneySaved.toLocaleString('en-US')}</Text>
              <Text style={styles.savedLabel}>skipped so far</Text>
              <Text style={styles.counts}>
                {stats.boughtCount} bought · {stats.skippedCount} skipped · {stats.undecidedCount} deciding
              </Text>
              {stats.regretAnswered > 0 && (
                <Text style={styles.counts}>
                  You regretted {stats.regretCount} of {stats.regretAnswered} thing{stats.regretAnswered === 1 ? '' : 's'}{' '}
                  you bought.
                </Text>
              )}
            </View>

            {regretChecks.map((entry) => (
              <View key={entry.id} style={styles.regretCard}>
                <Text style={styles.regretQuestion}>Still glad you got the {entry.product.name}?</Text>
                <View style={styles.regretButtons}>
                  <PrimaryButton title="Glad I did" onPress={() => answerRegret(entry, 'glad')} style={styles.flex} />
                  <PrimaryButton
                    title="Regret it"
                    variant="danger"
                    onPress={() => answerRegret(entry, 'regret')}
                    style={styles.flex}
                  />
                </View>
              </View>
            ))}

            {entries.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => router.push({ pathname: '/verdict', params: { id: entry.id, from: 'history' } })}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.flex}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {entry.product.name}
                  </Text>
                  <Text style={styles.itemMeta}>
                    ${entry.product.price.toLocaleString('en-US')} · {new Date(entry.createdAt).toLocaleDateString()} ·{' '}
                    {STATUS_TEXT[entry.status]}
                    {entry.regret === 'regret' ? ' (regretted)' : ''}
                  </Text>
                </View>
                <Text style={[styles.itemScore, { color: verdictColors[entry.result.verdict.id] }]}>
                  {entry.result.score}
                </Text>
              </Pressable>
            ))}

            <PrimaryButton title="Clear history" variant="danger" onPress={handleClear} style={styles.clearButton} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: { padding: spacing.lg },
  title: { color: colors.text, fontSize: font.title, fontWeight: '800', marginBottom: spacing.lg },
  empty: { color: colors.textMuted, fontSize: font.body, lineHeight: 22 },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  saved: { color: colors.accent, fontSize: 48, fontWeight: '900' },
  savedLabel: { color: colors.textMuted, fontSize: font.small, marginBottom: spacing.md },
  counts: { color: colors.text, fontSize: font.small, marginTop: spacing.xs },
  regretCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  regretQuestion: { color: colors.text, fontSize: font.body, fontWeight: '700', marginBottom: spacing.md },
  regretButtons: { flexDirection: 'row', gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: { opacity: 0.6 },
  itemName: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  itemMeta: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  itemScore: { fontSize: font.heading, fontWeight: '900', minWidth: 40, textAlign: 'right' },
  clearButton: { marginTop: spacing.xl },
});
