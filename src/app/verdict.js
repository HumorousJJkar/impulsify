// The verdict: big score, verdict label, and the factor-by-factor math.
// Reads the product from route params, loads the profile, runs the engine.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrimaryButton from '../components/PrimaryButton';
import { scoreProduct } from '../scoring/scoreProduct';
import { loadProfile } from '../storage/profileStorage';
import { colors, font, radius, spacing, verdictColors } from '../theme';

export default function Verdict() {
  const params = useLocalSearchParams(); // every param arrives as a string
  const [result, setResult] = useState(null);

  const product = {
    name: params.name,
    price: Number(params.price),
    category: params.category,
    usage: params.usage,
  };

  useEffect(() => {
    loadProfile().then((profile) => {
      if (!profile) {
        router.replace('/questionnaire');
        return;
      }
      setResult(scoreProduct(product, profile.answers));
    });
    // Run once when the screen opens; the params don't change while it's open.
  }, []);

  if (!result) return <View style={styles.screen} />;

  const color = verdictColors[result.verdict.id];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productPrice}>${product.price.toLocaleString('en-US')}</Text>

        <View style={[styles.verdictCard, { borderColor: color }]}>
          <Text style={[styles.score, { color }]}>{result.score}</Text>
          <Text style={styles.outOf}>out of 100</Text>
          <Text style={[styles.verdictLabel, { color }]}>{result.verdict.label}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>The math</Text>

          <Row label="Starting score" points={result.baseScore} isBase />
          {result.factors.map((f) => (
            <Row key={f.id} label={f.label} detail={f.detail} points={f.points} />
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Final score</Text>
            <Text style={[styles.totalPoints, { color }]}>{result.score}</Text>
          </View>

          <Text style={styles.note}>
            Your strictness is x{result.strictness}: it multiplies every negative number above
            {result.strictness > 1 ? ', because you regret purchases or return stuff a lot' : ''}. Scores are
            rounded and kept between 0 and 100.
          </Text>
        </View>

        {/* Back keeps the form filled in, so you can try "what if I used it weekly?" */}
        <PrimaryButton title="Tweak the details" variant="secondary" onPress={() => router.back()} style={styles.button} />
        {/* Pops every screen above the profile off the stack (judge + verdict). */}
        <PrimaryButton title="Done" onPress={() => router.dismissTo('/profile')} style={styles.button} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, detail, points, isBase = false }) {
  const pointColor = isBase || points === 0 ? colors.textMuted : points > 0 ? colors.accent : colors.danger;
  const pointText = isBase ? String(points) : points > 0 ? `+${points}` : String(points);

  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail && <Text style={styles.rowDetail}>{detail}</Text>}
      </View>
      <Text style={[styles.rowPoints, { color: pointColor }]}>{pointText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: { padding: spacing.lg },
  productName: { color: colors.text, fontSize: font.heading, fontWeight: '800' },
  productPrice: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.xs },
  verdictCard: {
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    marginVertical: spacing.lg,
    backgroundColor: colors.surface,
  },
  score: { fontSize: 72, fontWeight: '900', lineHeight: 80 },
  outOf: { color: colors.textMuted, fontSize: font.small },
  verdictLabel: { fontSize: font.heading, fontWeight: '800', marginTop: spacing.md, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    color: colors.accent,
    fontSize: font.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLabel: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  rowDetail: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  rowPoints: { fontSize: font.heading, fontWeight: '800', minWidth: 56, textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  totalLabel: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  totalPoints: { fontSize: font.heading, fontWeight: '900' },
  note: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.md, lineHeight: 18 },
  button: { marginTop: spacing.md },
});
