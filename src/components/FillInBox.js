// "Fill it in for me": paste a product link or describe the product, and the
// backend reads it into name / price / category for the form below.

import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { isBackendConfigured } from '../api/backend';
import { fillInProduct, findLink } from '../api/productApi';
import { colors, font, radius, spacing } from '../theme';
import PrimaryButton from './PrimaryButton';

// onFilled(result, wasLink) gets the backend's result (see productApi.fillInProduct).
export default function FillInBox({ onFilled }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isBackendConfigured()) return null;

  async function fill(input) {
    const value = input.trim();
    if (value.length < 2 || loading) return;
    setLoading(true);
    setError(null);
    try {
      onFilled(await fillInProduct(value), Boolean(findLink(value)));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // iOS asks "Allow Paste?" the first time; that's the system protecting your clipboard.
  async function handlePaste() {
    const pasted = await Clipboard.getStringAsync();
    if (!pasted) return;
    setText(pasted);
    if (findLink(pasted)) fill(pasted); // a link needs no editing, so go straight away
  }

  const isLink = Boolean(findLink(text));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Fill it in for me</Text>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={'Paste a link, or describe it:\n"the new Jordans, like $180"'}
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={500}
        editable={!loading}
      />

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>{isLink ? 'Reading the link...' : 'Figuring out what that is...'}</Text>
        </View>
      ) : (
        <View style={styles.buttonRow}>
          <PrimaryButton title="Paste" variant="secondary" onPress={handlePaste} style={styles.pasteButton} />
          <PrimaryButton
            title={isLink ? 'Read link' : 'Fill it in'}
            onPress={() => fill(text)}
            disabled={text.trim().length < 2}
            style={styles.flex}
          />
        </View>
      )}

      {error && <Text style={styles.error}>Couldn't do that ({error}). Fill it in below instead.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.lg,
  },
  title: {
    color: colors.accent,
    fontSize: font.small,
    fontWeight: '700',
    textTransform: 'uppercase',
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
    minHeight: 64,
    maxHeight: 120,
  },
  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  pasteButton: { minWidth: 96 },
  flex: { flex: 1 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  muted: { color: colors.textMuted, fontSize: font.small },
  error: { color: colors.danger, fontSize: font.small, marginTop: spacing.sm },
});
