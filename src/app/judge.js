// The product form: name, price, category, how often you'd use it.
// Fill it in yourself, or let "Fill it in for me" read a link / description first.
// "Judge it" sends the product to the verdict screen as route params
// (like query-string parameters on a web page: /verdict?name=...&price=...).

import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChipGroup from '../components/ChipGroup';
import FillInBox from '../components/FillInBox';
import PrimaryButton from '../components/PrimaryButton';
import { CATEGORIES, USAGE_OPTIONS } from '../questions';
import { colors, font, radius, spacing } from '../theme';

export default function Judge() {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(''); // kept as text while typing, e.g. "19.9"
  const [category, setCategory] = useState(null);
  const [usage, setUsage] = useState(null);
  const [missing, setMissing] = useState([]); // fields "Fill it in for me" couldn't find
  const [fillNote, setFillNote] = useState(null); // e.g. "Read from amazon.com..."
  const priceInput = useRef(null); // lets us focus the price box from code

  const priceNumber = Number(price);
  const canJudge = name.trim().length > 0 && priceNumber > 0 && category !== null && usage !== null;

  // Highlight a field only while it's still empty, so it clears once you fill it in.
  const needsName = missing.includes('name') && !name.trim();
  const needsPrice = missing.includes('price') && !price;
  const needsCategory = missing.includes('category') && category === null;

  // Replace the form with what the backend found (a new link is a new product, so
  // nothing from the previous one should linger). Missing fields are left empty.
  function handleFilled(result, wasLink) {
    const { product } = result;
    setName(product.name ?? '');
    setPrice(product.price !== null ? String(product.price) : '');
    setCategory(product.category);
    setMissing(result.missing);

    let note;
    if (!wasLink) note = 'Filled in from your description.';
    else if (result.pageRead) note = `Read from ${result.source}.`;
    else note = `Couldn't read ${result.source} (some stores block apps), so fill in what's missing.`;
    if (result.currency && result.currency !== 'USD') note += ` The price was in ${result.currency}, so change it to dollars.`;
    setFillNote(`${note} Check it, then pick how often you'd use it.`);

    // No price found (Amazon never shares it): open the price box with the keyboard up.
    // setTimeout waits until React has re-rendered the form with the new values.
    if (product.price === null) setTimeout(() => priceInput.current?.focus(), 0);
  }

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
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets // iOS: keeps the focused box visible above the keyboard
        >
          <Text style={styles.title}>What do you want to buy?</Text>
          <Text style={styles.subtitle}>Be honest. I'll tell you if it's worth it.</Text>

          <FillInBox onFilled={handleFilled} />
          {fillNote && <Text style={styles.fillNote}>{fillNote}</Text>}

          <Text style={styles.label}>What is it?</Text>
          <TextInput
            style={[styles.input, needsName && styles.inputMissing]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Sony WH-1000XM6 headphones"
            placeholderTextColor={colors.textMuted}
            maxLength={60}
          />
          {needsName && <Text style={styles.missingText}>Couldn't tell what this is. Name it.</Text>}

          <Text style={styles.label}>Price ($)</Text>
          <TextInput
            ref={priceInput}
            style={[styles.input, needsPrice && styles.inputMissing]}
            value={price}
            onChangeText={handlePriceChange}
            placeholder="e.g. 149.99"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            maxLength={9}
          />
          {needsPrice && <Text style={styles.missingText}>Couldn't find the price. Add it.</Text>}

          <Text style={styles.label}>Category</Text>
          <ChipGroup options={CATEGORIES} value={category} onChange={setCategory} />
          {needsCategory && <Text style={styles.missingText}>Couldn't pick a category. Choose one.</Text>}

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
  inputMissing: { borderColor: colors.warning },
  missingText: { color: colors.warning, fontSize: font.small, marginTop: spacing.xs },
  fillNote: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.sm, lineHeight: 18 },
  footer: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  backButton: { minWidth: 100 },
});
