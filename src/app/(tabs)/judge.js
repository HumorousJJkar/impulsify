// The Judge tab: name, price, category, how often you'd use it.
// Fill it in yourself, or let "Fill it in for me" read a link / description first.
// "Judge it" scores the product, saves it to history, and opens its verdict
// (/verdict?id=...).

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChipGroup from '../../components/ChipGroup';
import FillInBox from '../../components/FillInBox';
import PrimaryButton from '../../components/PrimaryButton';
import { takeKeepJudgeForm } from '../../judgeFormKeep';
import { cancelReminder } from '../../notifications';
import { CATEGORIES, USAGE_OPTIONS } from '../../questions';
import { scoreProduct } from '../../scoring/scoreProduct';
import { addEntry, getEntry, updateEntry } from '../../storage/historyStorage';
import { loadProfile } from '../../storage/profileStorage';
import { colors, font, radius, spacing } from '../../theme';

export default function Judge() {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(''); // kept as text while typing, e.g. "19.9"
  const [category, setCategory] = useState(null);
  const [usage, setUsage] = useState(null);
  const [missing, setMissing] = useState([]); // fields "Fill it in for me" couldn't find
  const [fillNote, setFillNote] = useState(null); // e.g. "Read from amazon.com..."
  // The history entry this form last created. "Tweak the details" brings you back
  // here, and judging again updates that entry instead of adding a duplicate.
  const [lastEntryId, setLastEntryId] = useState(null);
  const [judging, setJudging] = useState(false);
  // Changing this number gives FillInBox a new `key`, which makes React throw the
  // old one away and build a fresh one, clearing the pasted link inside it.
  const [fillInBoxVersion, setFillInBoxVersion] = useState(0);
  const priceInput = useRef(null); // lets us focus the price box from code
  const openedVerdict = useRef(false); // true while a verdict we opened is on screen

  // Coming back from a verdict (Done, Back, or swiping back): start a fresh form,
  // unless you tapped "Tweak the details" (see judgeFormKeep.js).
  useFocusEffect(
    useCallback(() => {
      if (!openedVerdict.current) return; // just switching tabs: leave the form alone
      openedVerdict.current = false;
      if (takeKeepJudgeForm()) return;

      setName('');
      setPrice('');
      setCategory(null);
      setUsage(null);
      setMissing([]);
      setFillNote(null);
      setLastEntryId(null);
      setFillInBoxVersion((v) => v + 1);
    }, [])
  );

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

  async function handleJudge() {
    // Close the keyboard first. Otherwise iOS remembers which box was focused and
    // re-opens the keyboard on it when you come back to this screen.
    Keyboard.dismiss();
    setJudging(true);
    const profile = await loadProfile();
    const product = { name: name.trim(), price: priceNumber, category, usage };
    const result = scoreProduct(product, profile.answers);

    // Re-judging after "Tweak the details": replace the old entry if you hadn't
    // decided on it yet. Its old chat and reminder were about the old details.
    const previous = lastEntryId ? await getEntry(lastEntryId) : null;
    let entry;
    if (previous && previous.status === 'undecided') {
      await cancelReminder(previous.reminderId);
      entry = await updateEntry(previous.id, {
        product,
        result,
        chat: [],
        reminderId: null,
        createdAt: new Date().toISOString(),
      });
    } else {
      entry = await addEntry({ product, result });
    }

    setLastEntryId(entry.id);
    setJudging(false);
    openedVerdict.current = true;
    router.push({ pathname: '/verdict', params: { id: entry.id, from: 'judge' } });
  }

  return (
    // edges={['top']}: the tab bar already handles the bottom of the screen.
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets // iOS: keeps the focused box visible above the keyboard
        >
          <Text style={styles.title}>What do you want to buy?</Text>
          <Text style={styles.subtitle}>Be honest. I'll tell you if it's worth it.</Text>

          <FillInBox key={fillInBoxVersion} onFilled={handleFilled} />
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
          <PrimaryButton
            title={judging ? 'Judging...' : 'Judge it'}
            onPress={handleJudge}
            disabled={!canJudge || judging}
            style={styles.flex}
          />
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
});
