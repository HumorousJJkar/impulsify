// Draws the right input for a question based on its `type` (see questions.js).
// Like a switch statement that picks which UI to build.

import Slider from '@react-native-community/slider';
import { StyleSheet, Text, View } from 'react-native';
import { selectionHaptic } from '../haptics';
import { colors, spacing, type } from '../theme';
import ChipGroup from './ChipGroup';
import TextField from './TextField';

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
              {value.length} of {question.max} picked
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
  const format = (v) => (question.format ? question.format(v) : String(v));

  function handleChange(next) {
    if (next !== value) selectionHaptic(); // a tick per step, like a dial
    onChange(next);
  }

  return (
    <View>
      <Text style={styles.bigValue}>{format(value)}</Text>
      <Slider
        minimumValue={question.min}
        maximumValue={question.max}
        step={question.step}
        value={value}
        onValueChange={handleChange}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.surfaceRaised}
        thumbTintColor={colors.text}
        style={styles.slider}
      />
      <View style={styles.sliderEnds}>
        <Text style={styles.endLabel}>{format(question.min)}</Text>
        <Text style={styles.endLabel}>{format(question.max)}</Text>
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
          <TextField
            label="What are you saving for?"
            value={value.item}
            onChangeText={(item) => update({ item })}
            placeholder="e.g. a car"
            maxLength={40}
          />
          <TextField
            label="Target amount ($)"
            value={value.target}
            // Keep digits only so the target is always a valid number.
            onChangeText={(text) => update({ target: text.replace(/[^0-9]/g, '') })}
            placeholder="e.g. 3000"
            keyboardType="number-pad"
            maxLength={7}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bigValue: { ...type.display, fontSize: 56, lineHeight: 62, color: colors.text, marginBottom: spacing.md },
  slider: { width: '100%', height: 44 },
  sliderEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  endLabel: { ...type.small, color: colors.textTertiary },
  counter: { ...type.small, color: colors.textTertiary, marginTop: spacing.md },
  goalFields: { marginTop: spacing.lg },
});
