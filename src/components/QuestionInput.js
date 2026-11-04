// Draws the right input for a question based on its `type` (see questions.js).
// Like a switch statement that picks which UI to build.

import Slider from '@react-native-community/slider';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme';
import ChipGroup from './ChipGroup';

export default function QuestionInput({ question, value, onChange, answers }) {
  switch (question.type) {
    case 'slider':
      return <SliderInput question={question} value={value} onChange={onChange} />;

    case 'single':
      return <ChipGroup options={question.options} value={value} onChange={onChange} />;

    case 'multi': {
      const disabledValues = question.excludeAnswersOf ? answers[question.excludeAnswersOf] : [];
      return (
        <View>
          <ChipGroup
            multi
            options={question.options}
            value={value}
            onChange={onChange}
            max={question.max}
            disabledValues={disabledValues}
          />
          {question.max !== undefined && (
            <Text style={styles.counter}>
              {value.length} / {question.max} picked
            </Text>
          )}
        </View>
      );
    }

    case 'savingGoal':
      return <SavingGoalInput value={value} onChange={onChange} />;

    default:
      return <Text style={styles.counter}>Unknown question type: {question.type}</Text>;
  }
}

function SliderInput({ question, value, onChange }) {
  return (
    <View>
      <Text style={styles.bigValue}>{question.format ? question.format(value) : value}</Text>
      <Slider
        minimumValue={question.min}
        maximumValue={question.max}
        step={question.step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.accent}
        style={styles.slider}
      />
      <View style={styles.sliderEnds}>
        <Text style={styles.endLabel}>{question.format ? question.format(question.min) : question.min}</Text>
        <Text style={styles.endLabel}>{question.format ? question.format(question.max) : question.max}</Text>
      </View>
    </View>
  );
}

// value looks like { active: true | false | null, item: 'Car', target: '3000' }
function SavingGoalInput({ value, onChange }) {
  const update = (changes) => onChange({ ...value, ...changes });

  return (
    <View>
      <ChipGroup
        options={[
          { value: true, label: 'Yes' },
          { value: false, label: 'No' },
        ]}
        value={value.active}
        onChange={(active) => update({ active })}
      />

      {value.active === true && (
        <View style={styles.goalFields}>
          <Text style={styles.fieldLabel}>What are you saving for?</Text>
          <TextInput
            style={styles.input}
            value={value.item}
            onChangeText={(item) => update({ item })}
            placeholder="e.g. a car"
            placeholderTextColor={colors.textMuted}
            maxLength={40}
          />
          <Text style={styles.fieldLabel}>Target amount ($)</Text>
          <TextInput
            style={styles.input}
            value={value.target}
            // Keep digits only so the target is always a valid number.
            onChangeText={(text) => update({ target: text.replace(/[^0-9]/g, '') })}
            placeholder="e.g. 3000"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={7}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bigValue: { color: colors.accent, fontSize: 44, fontWeight: '800', marginBottom: spacing.md },
  slider: { width: '100%', height: 40 },
  sliderEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  endLabel: { color: colors.textMuted, fontSize: font.small },
  counter: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.md },
  goalFields: { marginTop: spacing.lg },
  fieldLabel: { color: colors.textMuted, fontSize: font.small, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text,
    fontSize: font.body,
    padding: spacing.md,
  },
});
