// The big score on the verdict screen. When `animate` is on, the number counts up
// from 0, a meter fills in the verdict's color, then the verdict label fades in and
// the phone buzzes to match (see haptics.js).
//
// Animated.Value is React Native's animation number: we tell it "go from 0 to 42
// over 900ms" and it updates every frame. A listener copies it into state so the
// <Text> shows whole numbers as it climbs.

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { verdictHaptic } from '../haptics';
import { colors, radius, spacing, type, verdictColors, verdictSoftColors } from '../theme';

const COUNT_UP_MS = 900;
const LABEL_FADE_MS = 250;

export default function ScoreReveal({ score, verdictId, verdictLabel, animate = true }) {
  const progress = useRef(new Animated.Value(animate ? 0 : score)).current;
  const labelOpacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const [shown, setShown] = useState(animate ? 0 : score);
  const color = verdictColors[verdictId];

  useEffect(() => {
    if (!animate) return;
    const listener = progress.addListener(({ value }) => setShown(Math.round(value)));
    Animated.sequence([
      // useNativeDriver: false because we animate a width, which only JS can do.
      Animated.timing(progress, { toValue: score, duration: COUNT_UP_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(labelOpacity, { toValue: 1, duration: LABEL_FADE_MS, useNativeDriver: false }),
    ]).start(({ finished }) => {
      if (finished) verdictHaptic(verdictId);
    });
    return () => progress.removeListener(listener);
  }, []);

  const meterWidth = progress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.card}>
      <Text style={[styles.score, { color }]}>{shown}</Text>
      <Text style={styles.outOf}>out of 100</Text>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: meterWidth, backgroundColor: color }]} />
      </View>

      <Animated.View style={[styles.pill, { backgroundColor: verdictSoftColors[verdictId], opacity: labelOpacity }]}>
        <Text style={[styles.pillText, { color }]}>{verdictLabel}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  score: { ...type.display, fontVariant: ['tabular-nums'] }, // equal-width digits so it doesn't jiggle
  outOf: { ...type.small, color: colors.textTertiary, marginTop: spacing.xs },
  track: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
    marginTop: spacing.lg,
  },
  fill: { height: '100%', borderRadius: radius.pill },
  pill: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  pillText: { ...type.bodyStrong, textAlign: 'center' },
});
