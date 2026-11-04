// The frame every screen is built in, so margins, titles, and the bottom button
// area are identical everywhere.
//
//   <Screen title="History" subtitle="..." footer={<PrimaryButton .../>}>
//     ...content...
//   </Screen>
//
// tab:      true for the bottom-tab screens (the tab bar handles the bottom edge)
// keyboard: true for screens with text inputs (keeps them above the keyboard)
// onTitleLongPress: optional hidden action on the title

import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, type } from '../theme';

export default function Screen({
  title,
  subtitle,
  eyebrow,
  children,
  footer,
  tab = false,
  keyboard = false,
  onTitleLongPress,
  scrollRef,
}) {
  const content = (
    <>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets // iOS: keeps the focused input above the keyboard
        showsVerticalScrollIndicator={false}
      >
        {(title || eyebrow) && (
          <View style={styles.header}>
            {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
            {title && (
              <Pressable onLongPress={onTitleLongPress} disabled={!onTitleLongPress} delayLongPress={600}>
                <Text style={styles.title}>{title}</Text>
              </Pressable>
            )}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        )}
        {children}
      </ScrollView>
      {footer && <View style={styles.footer}>{footer}</View>}
    </>
  );

  return (
    <SafeAreaView style={styles.screen} edges={tab ? ['top'] : ['top', 'bottom']}>
      {keyboard ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.lg },
  eyebrow: { ...type.caption, color: colors.accent, marginBottom: spacing.sm },
  title: { ...type.title, color: colors.text },
  subtitle: { ...type.body, color: colors.textSecondary, marginTop: spacing.sm },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
