// The Impulsify mark: a red circle with a white "pause" sign. Pause before you pay.
// Drawn with plain Views, so it's crisp at any size and needs no image file.

import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export default function LogoMark({ size = 48 }) {
  const barWidth = size * 0.13;
  const barHeight = size * 0.38;
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, gap: size * 0.12 }]}>
      <View style={[styles.bar, { width: barWidth, height: barHeight, borderRadius: barWidth / 2 }]} />
      <View style={[styles.bar, { width: barWidth, height: barHeight, borderRadius: barWidth / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  bar: { backgroundColor: colors.onAccent },
});
