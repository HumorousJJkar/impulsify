// A rounded panel. `title` draws the small uppercase label at the top;
// `right` puts something (like a count) on the other side of that label.

import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, type } from '../theme';

export default function Card({ title, right, children, style }) {
  return (
    <View style={[styles.card, style]}>
      {(title || right) && (
        <View style={styles.titleRow}>
          {title && <Text style={styles.title}>{title}</Text>}
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: { ...type.caption, color: colors.textTertiary },
});
