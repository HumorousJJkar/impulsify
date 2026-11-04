// "Fill it in for me": paste a product link or describe the product, and the
// backend reads it into name / price / category for the form below.

import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { isBackendConfigured } from '../api/backend';
import { fillInProduct, findLink } from '../api/productApi';
import { colors, radius, spacing, type } from '../theme';
import Card from './Card';
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
    let pasted;
    try {
      pasted = await Clipboard.getStringAsync();
    } catch {
      return; // you tapped "Don't Allow" on the paste prompt
    }
    if (!pasted) return;
    setText(pasted);
    if (findLink(pasted)) fill(pasted); // a link needs no editing, so go straight away
  }

  const isLink = Boolean(findLink(text));

  return (
    <Card title="Fill it in for me">
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Paste a link, or describe it"
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.accent}
        multiline
        maxLength={500}
        editable={!loading}
      />
      <Text style={styles.hint}>Like "the new Jordans, around $180"</Text>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>{isLink ? 'Reading the link...' : 'Figuring out what that is...'}</Text>
        </View>
      ) : (
        <View style={styles.buttonRow}>
          <PrimaryButton title="Paste" icon="clipboard-outline" variant="secondary" size="sm" onPress={handlePaste} style={styles.flex} />
          <PrimaryButton
            title={isLink ? 'Read link' : 'Fill it in'}
            icon="sparkles-outline"
            variant="secondary"
            size="sm"
            onPress={() => fill(text)}
            disabled={text.trim().length < 2}
            style={styles.flex}
          />
        </View>
      )}

      {error && <Text style={styles.error}>Couldn't do that ({error}). Fill it in below instead.</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  input: {
    ...type.body,
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 56,
    maxHeight: 120,
  },
  hint: { ...type.small, color: colors.textTertiary, marginTop: spacing.sm },
  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  flex: { flex: 1 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, minHeight: 40 },
  muted: { ...type.small, color: colors.textSecondary },
  error: { ...type.small, color: colors.danger, marginTop: spacing.sm },
});