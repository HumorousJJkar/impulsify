import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, font, radius, spacing } from '../theme';

// variant: 'primary' (solid green), 'secondary' (outlined) or 'danger' (red text)
export default function PrimaryButton({ title, onPress, disabled = false, variant = 'primary', style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.text, variant === 'primary' ? styles.textOnAccent : styles[`${variant}Text`]]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primary: { backgroundColor: colors.accent },
  secondary: { borderWidth: 1, borderColor: colors.border },
  danger: { borderWidth: 1, borderColor: colors.danger },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.75 },
  text: { fontSize: font.body, fontWeight: '700' },
  textOnAccent: { color: colors.accentText },
  secondaryText: { color: colors.text },
  dangerText: { color: colors.danger },
});
