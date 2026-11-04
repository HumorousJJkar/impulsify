// The AI friend on the verdict screen: its first take on the verdict, then a chat
// where you can argue back. The score itself never changes here; the friend only
// talks about it (see the rules in backend/src/prompt.js).

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { askFriend, isFriendConfigured } from '../api/friendApi';
import { colors, font, radius, spacing } from '../theme';

// Matches MAX_HISTORY in the backend: stop before the server would reject it.
const MAX_MESSAGES = 19;

export default function FriendChat({ product, result, answers }) {
  // Only what's shown in the chat. The product/score/profile context is
  // rebuilt by the backend on every request, so it isn't stored here.
  const [messages, setMessages] = useState([]); // [{ role: 'assistant' | 'user', content }]
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ask for the first take as soon as the chat appears.
  useEffect(() => {
    if (isFriendConfigured()) requestReply([]);
  }, []);

  async function requestReply(history) {
    setLoading(true);
    setError(null);
    try {
      const reply = await askFriend(product, result, answers, history);
      setMessages([...history, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSend() {
    const text = draft.trim();
    if (!text || loading) return;
    const history = [...messages, { role: 'user', content: text }];
    setMessages(history); // show your message right away
    setDraft('');
    requestReply(history);
  }

  if (!isFriendConfigured()) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Impulsify says</Text>
        <Text style={styles.muted}>
          Impulsify's chat isn't connected yet. Add EXPO_PUBLIC_API_URL and EXPO_PUBLIC_APP_KEY to .env.local.
        </Text>
      </View>
    );
  }

  const outOfTurns = messages.length >= MAX_MESSAGES;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Impulsify says</Text>

      {messages.map((m, i) => (
        <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.friendBubble]}>
          <Text style={styles.bubbleText}>{m.content}</Text>
        </View>
      ))}

      {loading && (
        <View style={[styles.bubble, styles.friendBubble, styles.typing]}>
          <ActivityIndicator color={colors.textMuted} size="small" />
        </View>
      )}

      {error && (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>Couldn't reach Impulsify ({error}).</Text>
          {/* Retry with the same history: the last user message is already in it. */}
          <Pressable onPress={() => requestReply(messages)}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Arguing only makes sense once the friend has said something. */}
      {messages.length > 0 &&
        (outOfTurns ? (
          <Text style={styles.muted}>That's enough arguing about this one. The score stands.</Text>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Argue back..."
              placeholderTextColor={colors.textMuted}
              maxLength={500}
              multiline
              editable={!loading}
            />
            <Pressable
              onPress={handleSend}
              disabled={!draft.trim() || loading}
              style={[styles.send, (!draft.trim() || loading) && styles.sendDisabled]}
            >
              <Text style={styles.sendText}>Send</Text>
            </Pressable>
          </View>
        ))}
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
    marginBottom: spacing.lg,
  },
  cardTitle: {
    color: colors.accent,
    fontSize: font.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  bubble: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, maxWidth: '90%' },
  friendBubble: { backgroundColor: colors.surfaceAlt, alignSelf: 'flex-start' },
  userBubble: { backgroundColor: colors.border, alignSelf: 'flex-end' },
  typing: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  bubbleText: { color: colors.text, fontSize: font.body, lineHeight: 22 },
  muted: { color: colors.textMuted, fontSize: font.small, lineHeight: 18 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  errorText: { color: colors.danger, fontSize: font.small, flex: 1 },
  retry: { color: colors.accent, fontSize: font.small, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text,
    fontSize: font.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    maxHeight: 120,
  },
  send: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  sendDisabled: { opacity: 0.35 },
  sendText: { color: colors.accentText, fontWeight: '700', fontSize: font.body },
});
