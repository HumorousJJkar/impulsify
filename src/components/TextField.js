// A labeled text input. `warning` turns the border amber and shows a note under it
// (used when "Fill it in for me" couldn't find something). Any other props
// (value, onChangeText, keyboardType, ...) go straight to the TextInput.

import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, type } from '../theme';

const TextField = forwardRef(function TextField({ label, warning, style, ...inputProps }, ref) {
  return (
    <View style={[styles.field, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        ref={ref}
        style={[styles.input, warning && styles.inputWarning]}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.accent}
        {...inputProps}
      />
      {warning && <Text style={styles.warning}>{warning}</Text>}
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: { ...type.small, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
  input: {
    ...type.body,
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  inputWarning: { borderColor: colors.warning },
  warning: { ...type.small, color: colors.warning, marginTop: spacing.xs },
});
