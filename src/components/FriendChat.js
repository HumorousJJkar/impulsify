// Impulsify on the verdict screen: its first take on the verdict, then a chat
// where you can argue back. The score itself never changes here; Impulsify only
// talks about it (see the rules in backend/src/prompt.js).
//
// initialMessages: the saved chat (from history), shown right away.
// onMessagesChange(messages): called after each reply so the chat can be saved.
// recent: your other recent items, so Impulsify can bring them up.
// onBlocked(reply): the AI refused to treat this as a real product (e.g. a person).

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { askFriend, isFriendConfigured } from '../api/friendApi';
import { colors, spacing, type } from '../theme';
import Card from './Card';
import LogoMark from './LogoMark';

// Matches MAX_HISTORY in the backend: stop before the server would reject it.
const MAX_MESSAGES = 19;

export default function FriendChat({ product, result, answers, recent = [], initialMessages = [], onMessagesChange, onBlocked }) {
  // Only what's shown in the chat. The product/score/profile context is
  // rebuilt by the backend on every request, so it isn't stored here.
  const [messages, setMessages] = useState(initialMessages); // [{ role: 'assistant' | 'user', content }]
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // A brand-new verdict: ask for the first take. A saved one already has its chat.
  useEffect(() => {
    if (isFriendConfigured() && initialMessages.length === 0) requestReply([]);
  }, []);

  async function requestReply(history) {
    setLoading(true);
    setError(null);
    try {
      const { reply, blocked } = await askFriend(product, result, answers, history, recent);
      // Not a real product: let the verdict screen take over instead of chatting.
      if (blocked && onBlocked) return onBlocked(reply);
      const updated = [...history, { role: 'assistant', content: reply }];
      setMessages(updated);
      // Saved only after a reply arrives, so a saved chat always ends with Impulsify.
      onMessagesChange?.(updated);
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

  const header = (
    <View style={styles.header}>
      <LogoMark size={22} />
      <Text style={styles.headerText}>Impulsify says</Text>
    </View>
  );

  if (!isFriendConfigured()) {
    return (
      <Card>
        {header}
        <Text style={styles.muted}>
          Impulsify's chat isn't connected yet. Add EXPO_PUBLIC_API_URL and EXPO_PUBLIC_APP_KEY to .env.local.
        </Text>
      </Card>
    );
  }

  const outOfTurns = messages.length >= MAX_MESSAGES;
  const canSend = draft.trim().length > 0 && !loading;

  return (
    <Card>
      {header}

      {messages.map((m, i) => (
        <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.friendBubble]}>
          <Text style={styles.bubbleText}>{m.content}</Text>
        </View>
      ))}

      {loading && (
        <View style={[styles.bubble, styles.friendBubble, styles.typing]}>
          <ActivityIndicator color={colors.textSecondary} size="small" />
        </View>
      )}

      {error && (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>Couldn't reach Impulsify ({error}).</Text>
          {/* Retry with the same history: the last user message is already in it. */}
          <Pressable onPress={() => requestReply(messages)} hitSlop={8}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Arguing only makes sense once Impulsify has said something. */}
      {messages.length > 0 &&
        (outOfTurns ? (
          <Text style={[styles.muted, styles.outOfTurns]}>That's enough arguing about this one. The answer stands.</Text>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Argue back..."
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.accent}
              maxLength={500}
              multiline
              numberOfLines={1} // start one line tall (grows as you type)
              editable={!loading}
            />
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              hitSlop={6}
              style={({ pressed }) => [styles.send, !canSend && styles.sendDisabled, pressed && styles.sendPressed]}
            >
              <Ionicons name="arrow-up" size={20} color={colors.onAccent} />
            </Pressable>
          </View>
        ))}
    </Card>
  );
}

const BUBBLE_RADIUS = 18;

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  headerText: { ...type.bodyStrong, color: colors.text },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BUBBLE_RADIUS,
    marginBottom: spacing.sm,
    maxWidth: '88%',
  },
  // The corner nearest the speaker is squared off, like iMessage.
  friendBubble: { backgroundColor: colors.surfaceRaised, alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  userBubble: { backgroundColor: colors.accentSoft, alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  typing: { paddingVertical: 12, paddingHorizontal: spacing.lg },
  bubbleText: { ...type.body, color: colors.text },
  muted: { ...type.small, color: colors.textSecondary },
  outOfTurns: { marginTop: spacing.sm },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  errorText: { ...type.small, color: colors.danger, flex: 1 },
  retry: { ...type.small, fontWeight: '700', color: colors.text },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  input: {
    ...type.body,
    flex: 1,
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingTop: 11,
    paddingBottom: 11,
    minHeight: 44,
    maxHeight: 120,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.3 },
  sendPressed: { opacity: 0.8 },
});
