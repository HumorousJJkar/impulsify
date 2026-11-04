import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme';

// A wrap-around row of tappable "chips".
//
// multi = false: `value` is one option value (or null); tapping picks it.
// multi = true:  `value` is an array; tapping toggles an option in/out.
// max:           most options allowed at once (multi only).
// disabledValues: options that can't be picked (shown greyed out).
export default function ChipGroup({ options, value, onChange, multi = false, max, disabledValues = [] }) {
  const selected = multi ? value : value === null ? [] : [value];
  const atMax = multi && max !== undefined && selected.length >= max;

  function handlePress(optionValue) {
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
            key={option.value}
            onPress={() => handlePress(option.value)}
            disabled={isDisabled}
            style={[styles.chip, isSelected && styles.chipSelected, isDisabled && styles.chipDisabled]}
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
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipDisabled: { opacity: 0.3 },
  label: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  labelSelected: { color: colors.accentText },
});
