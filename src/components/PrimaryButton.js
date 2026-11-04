// The app's one button component.
//
// variant: 'primary'   solid red, the main action on a screen (use once per screen)
//          'secondary' dark filled, for alternatives
//          'ghost'     text only, for low-key actions
//          'danger'    red text, for deleting things
// size:    'md' (full height) or 'sm' (compact, for inside cards)
// icon:    optional Ionicons name shown before the title

import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';
import { tapHaptic } from '../haptics';
import { colors, radius, spacing, type } from '../theme';

const TEXT_COLOR = {
  primary: colors.onAccent,
  secondary: colors.text,
  ghost: colors.textSecondary,
  danger: colors.danger,
};

export default function PrimaryButton({ title, onPress, disabled = false, variant = 'primary', size = 'md', icon, style }) {
  const textColor = TEXT_COLOR[variant];

  function handlePress() {
    tapHaptic();
    onPress?.();
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.small : styles.medium,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={textColor} />}
      <Text style={[size === 'sm' ? styles.textSmall : styles.text, { color: textColor }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
  },
  medium: { minHeight: 52, paddingHorizontal: spacing.lg },
  small: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceRaised },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  text: { ...type.bodyStrong },
  textSmall: { ...type.small, fontWeight: '600' },
});
