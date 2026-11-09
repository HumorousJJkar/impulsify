// "What I've learned": shows the learning model (scoring/learn.js) in plain words,
// so it's never a black box, plus a switch to turn learning off.

import { StyleSheet, Switch, Text, View } from 'react-native';
import { categoryLabel } from '../scoring/learn';
import { LEARNING } from '../scoring/scoringConfig';
import { colors, radius, spacing, type } from '../theme';
import Card from './Card';

export default function LearnedCard({ model, enabled, onToggle }) {
  const toggle = (
    <Switch
      value={enabled}
      onValueChange={onToggle}
      trackColor={{ false: colors.surfaceRaised, true: colors.accent }}
      thumbColor={colors.text}
      activeThumbColor={colors.text} // web uses this one for the "on" knob
      ios_backgroundColor={colors.surfaceRaised}
    />
  );

  return (
    <Card title="What I've learned" right={toggle}>
      {!enabled ? (
        <Text style={styles.muted}>Learning is off. Verdicts only use your questionnaire answers.</Text>
      ) : model.answered < LEARNING.MIN_ANSWERED ? (
        <Text style={styles.muted}>
          I start learning once you've rated {LEARNING.MIN_ANSWERED} things you bought (you've rated {model.answered}).
          Mark items Bought, then tell me if you're glad or regret it.
        </Text>
      ) : (
        <>
          <Text style={styles.summary}>
            About <Text style={styles.strong}>{percent(model.overall)}</Text> of your buys end in regret, from{' '}
            {model.answered} you've rated.
          </Text>
          {Object.entries(model.categories)
            .sort(([, a], [, b]) => b.rate - a.rate) // most regretted first
            .map(([category, stats]) => (
              <CategoryRow key={category} label={categoryLabel(category)} stats={stats} />
            ))}
          <Text style={styles.muted}>
            Each rate starts near your overall rate and moves toward your real one as you rate more.
          </Text>
        </>
      )}
    </Card>
  );
}

function CategoryRow({ label, stats }) {
  // Red when you usually regret it, amber when it's a coin flip, green when you're usually glad.
  const color = stats.rate >= 0.5 ? colors.danger : stats.rate >= LEARNING.TYPICAL_REGRET ? colors.warning : colors.success;
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowRate, { color }]}>{percent(stats.rate)}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: percent(stats.rate), backgroundColor: color }]} />
      </View>
      <Text style={styles.rowDetail}>
        Regretted {stats.regrets} of {stats.n}
      </Text>
    </View>
  );
}

function percent(rate) {
  return `${Math.round(rate * 100)}%`;
}

const styles = StyleSheet.create({
  muted: { ...type.small, color: colors.textSecondary, marginTop: spacing.xs },
  summary: { ...type.body, color: colors.textSecondary, marginBottom: spacing.sm },
  strong: { fontWeight: '700', color: colors.text },
  row: { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { ...type.bodyStrong, color: colors.text },
  rowRate: { ...type.bodyStrong, fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, overflow: 'hidden', marginTop: spacing.sm },
  fill: { height: '100%', borderRadius: radius.pill },
  rowDetail: { ...type.small, color: colors.textTertiary, marginTop: spacing.xs },
});
