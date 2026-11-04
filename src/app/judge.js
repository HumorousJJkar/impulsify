// Manual product entry: name, price, category, how often you'd use it.
// "Judge it" sends the product to the verdict screen as route params
// (like query-string parameters on a web page: /verdict?name=...&price=...).

import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChipGroup from '../components/ChipGroup';
import PrimaryButton from '../components/PrimaryButton';
import { CATEGORIES, USAGE_OPTIONS } from '../questions';
import { colors, font, radius, spacing } from '../theme';

export default function Judge() {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(''); // kept as text while typing, e.g. "19.9"
  const [category, setCategory] = useState(null);
  const [usage, setUsage] = useState(null);

  const priceNumber = Number(price);
  const canJudge = name.trim().length > 0 && priceNumber > 0 && category !== null && usage !== null;

  // Digits and at most one decimal point, max 2 decimal places.
  function handlePriceChange(text) {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const [whole, ...rest] = cleaned.split('.');
    setPrice(rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole);
  }

  function handleJudge() {
    router.push({
      pathname: '/verdict',
      params: { name: name.trim(), price: String(priceNumber), category, usage },
    });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>What do you want to buy?</Text>
          <Text style={styles.subtitle}>Be honest. I'll tell you if it's worth it.</Text>

          <Text style={styles.label}>What is it?</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Sony WH-1000XM6 headphones"
            placeholderTextColor={colors.textMuted}
            maxLength={60}
          />

          <Text style={styles.label}>Price ($)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={handlePriceChange}
            placeholder="e.g. 149.99"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            maxLength={9}
          />

          <Text style={styles.label}>Category</Text>
          <ChipGroup options={CATEGORIES} value={category} onChange={setCategory} />

          <Text style={styles.label}>How often would you actually use it?</Text>
          <ChipGroup options={USAGE_OPTIONS} value={usage} onChange={setUsage} />
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton title="Back" variant="secondary" onPress={() => router.back()} style={styles.backButton} />
          <PrimaryButton title="Judge it" onPress={handleJudge} disabled={!canJudge} style={styles.flex} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: { padding: spacing.lg },
  title: { color: colors.text, fontSize: font.title, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.xs },
  label: {
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text,
    fontSize: font.body,
    padding: spacing.md,
  },
  footer: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  backButton: { minWidth: 100 },
});
