// A wrap-around row of tappable "chips".
//
// multi = false: `value` is one option value (or null); tapping picks it.
// multi = true:  `value` is an array; tapping toggles an option in/out.
// max:           most options allowed at once (multi only).
// disabledValues: options that can't be picked (shown faded).

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { selectionHaptic } from '../haptics';
import { colors, radius, spacing, type } from '../theme';

export default function ChipGroup({ options, value, onChange, multi = false, max, disabledValues = [] }) {
  const selected = multi ? value : value === null ? [] : [value];
  const atMax = multi && max !== undefined && selected.length >= max;

  function handlePress(optionValue) {
    selectionHaptic();
    if (!multi) {
      onChange(optionValue);
      return;
    }
    if (selected.includes(optionValue)) {
      onChange(selected.filter((v) => v !== optionValue));
    } else if (!atMax) {
      onChange([...selected, optionValue]);
    }
  }

  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        const isDisabled = disabledValues.includes(option.value) || (atMax && !isSelected);
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => handlePress(option.value)}
            disabled={isDisabled}
            style={({ pressed }) => [
              styles.chip,
              isSelected && styles.chipSelected,
              isDisabled && styles.chipDisabled,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.surfaceRaised,
  },
  chipSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipDisabled: { opacity: 0.3 },
  chipPressed: { opacity: 0.75 },
  label: { ...type.small, fontWeight: '600', color: colors.textSecondary },
  labelSelected: { color: colors.text },
});
