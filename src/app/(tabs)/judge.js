// The Judge tab: name, price, category, how often you'd use it.
// Fill it in yourself, or let "Fill it in for me" read a link / description first.
// "Judge it" scores the product, saves it to history, and opens its verdict
// (/verdict?id=...).

import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import Card from '../../components/Card';
import ChipGroup from '../../components/ChipGroup';
import FillInBox from '../../components/FillInBox';
import PrimaryButton from '../../components/PrimaryButton';
import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import { takeKeepJudgeForm } from '../../judgeFormKeep';
import { cancelReminder } from '../../notifications';
import { CATEGORIES, USAGE_OPTIONS } from '../../questions';
import { learnFromHistory } from '../../scoring/learn';
import { scoreProduct } from '../../scoring/scoreProduct';
import { addEntry, getEntry, loadHistory, updateEntry } from '../../storage/historyStorage';
import { loadProfile } from '../../storage/profileStorage';
import { colors, spacing, type } from '../../theme';

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
    const [profile, history] = await Promise.all([loadProfile(), loadHistory()]);
    const product = { name: name.trim(), price: priceNumber, category, usage };

    // Learn from your rated purchases (unless you turned learning off on Profile).
    // Leave out the entry we're re-judging, so it can't learn from itself.
    const learned = profile.settings.learning
      ? learnFromHistory(history.filter((e) => e.id !== lastEntryId), profile.answers)
      : null;
    const result = scoreProduct(product, profile.answers, new Date(), learned);

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
    <Screen
      tab
      keyboard
      title="What are you eyeing?"
      subtitle="Paste a link, describe it, or fill it in. I'll tell you if it's worth it."
      footer={
        <PrimaryButton title={judging ? 'Judging...' : 'Judge it'} onPress={handleJudge} disabled={!canJudge || judging} />
      }
    >
      <FillInBox key={fillInBoxVersion} onFilled={handleFilled} />
      {fillNote && (
        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.note}>{fillNote}</Text>
        </View>
      )}

      <Card title="The details">
        <TextField
          label="What is it?"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Sony WH-1000XM6 headphones"
          maxLength={60}
          warning={needsName ? "Couldn't tell what this is. Name it." : null}
        />
        <TextField
          ref={priceInput}
          label="Price ($)"
          value={price}
          onChangeText={handlePriceChange}
          placeholder="e.g. 149.99"
          keyboardType="decimal-pad"
          maxLength={9}
          warning={needsPrice ? "Couldn't find the price. Add it." : null}
        />

        <Text style={styles.label}>Category</Text>
        <ChipGroup options={CATEGORIES} value={category} onChange={setCategory} />
        {needsCategory && <Text style={styles.warning}>Couldn't pick a category. Choose one.</Text>}

        <Text style={[styles.label, styles.labelSpaced]}>How often would you actually use it?</Text>
        <ChipGroup options={USAGE_OPTIONS} value={usage} onChange={setUsage} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  noteRow: { flexDirection: 'row', gap: spacing.sm, marginTop: -spacing.xs, marginBottom: spacing.md, paddingHorizontal: spacing.xs },
  note: { ...type.small, color: colors.textSecondary, flex: 1 },
  label: { ...type.small, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
  labelSpaced: { marginTop: spacing.lg },
  warning: { ...type.small, color: colors.warning, marginTop: spacing.sm },
});