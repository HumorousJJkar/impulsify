// The questionnaire, written as plain data.
//
// The questionnaire screen loops over this array and draws each question based
// on its `type`, so adding, removing or rewording a question only means
// editing this file; no screen code changes.
//
// Question types:
//   'slider'     - a number picked with a slider (min, max, step)
//   'single'     - pick exactly one option
//   'multi'      - pick several options (optional `max`)
//   'savingGoal' - yes/no, plus "what" and "how much" if yes
//
// Each answer is saved under the question's `id`, e.g. answers.monthlyBudget.

export const CATEGORIES = [
  { value: 'tech', label: 'Tech' },
  { value: 'clothes', label: 'Clothes' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'school_work', label: 'School/Work' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'home', label: 'Home' },
  { value: 'hobbies', label: 'Hobbies' },
  { value: 'experiences', label: 'Experiences' },
];

// "How often would you use it?" on the product form (src/app/judge.js).
export const USAGE_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'rarely', label: 'Rarely' },
];

export const QUESTIONS = [
  // ---- Budget & income ----
  {
    id: 'monthlyBudget',
    section: 'Budget & income',
    title: 'How much can you spend on non-essentials per month?',
    helper: 'Fun money. Not rent, not groceries.',
    type: 'slider',
    min: 0,
    max: 1000,
    step: 25,
    defaultValue: 200,
    format: (v) => (v >= 1000 ? '$1,000+' : `$${v}`),
  },
  {
    id: 'savingGoal',
    section: 'Budget & income',
    title: 'Saving for something big right now?',
    helper: 'A car, a trip, an emergency fund...',
    type: 'savingGoal',
    defaultValue: { active: null, item: '', target: '' },
  },
  {
    id: 'incomeStability',
    section: 'Budget & income',
    title: 'How steady is your income?',
    type: 'single',
    options: [
      { value: 'steady', label: 'Steady job' },
      { value: 'part_time', label: 'Part-time' },
      { value: 'irregular', label: 'Irregular' },
      { value: 'none', label: 'None/allowance' },
    ],
    defaultValue: null,
  },

  // ---- Priorities ----
  {
    id: 'priorities',
    section: 'Priorities',
    title: 'Pick up to 3 categories you actually care about',
    helper: 'Stuff you would defend buying.',
    type: 'multi',
    options: CATEGORIES,
    max: 3,
    defaultValue: [],
  },
  {
    id: 'cutBack',
    section: 'Priorities',
    title: "Anything you're trying to cut back on?",
    helper: 'Optional. Skip if nothing comes to mind.',
    type: 'multi',
    options: CATEGORIES,
    optional: true,
    // A category can't be both a priority and something you're cutting back on,
    // so options already picked in `priorities` are greyed out here.
    excludeAnswersOf: 'priorities',
    defaultValue: [],
  },

  // ---- Regret habits ----
  {
    id: 'regretLevel',
    section: 'Regret habits',
    title: 'How often do you regret what you buy?',
    type: 'slider',
    min: 1,
    max: 5,
    step: 1,
    defaultValue: 3,
    format: (v) => ['', 'Never', 'Rarely', 'Sometimes', 'Often', 'Constantly'][v],
  },
  {
    id: 'triggers',
    section: 'Regret habits',
    title: 'What makes you buy on impulse?',
    helper: 'Pick all that apply, or none.',
    type: 'multi',
    options: [
      { value: 'sales', label: 'Sales' },
      { value: 'late_night', label: 'Late-night' },
      { value: 'social_ads', label: 'Social media ads' },
      { value: 'boredom_stress', label: 'Boredom/stress' },
      { value: 'friends', label: 'Friends buying it' },
    ],
    optional: true,
    defaultValue: [],
  },
  {
    id: 'returnFrequency',
    section: 'Regret habits',
    title: 'How often do you return stuff?',
    type: 'single',
    options: [
      { value: 'never', label: 'Never' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'often', label: 'Often' },
    ],
    defaultValue: null,
  },

  // ---- Tone ----
  {
    id: 'tone',
    section: 'Tone',
    title: 'How blunt should I be with you?',
    helper: 'Changes how I talk, not how I score. You can change it later.',
    type: 'single',
    options: [
      { value: 'chill', label: 'Chill' },
      { value: 'blunt', label: 'Blunt' },
      { value: 'roast', label: 'Roast me' },
    ],
    defaultValue: 'blunt',
  },
];

// Starting answers for a brand-new user: { monthlyBudget: 200, savingGoal: {...}, ... }
export function defaultAnswers() {
  const answers = {};
  for (const q of QUESTIONS) {
    // Copy arrays/objects so editing one user's answers never mutates the defaults.
    answers[q.id] = deepCopy(q.defaultValue);
  }
  return answers;
}

// Can the user press "Next" on this question yet?
export function isAnswered(question, value) {
  if (question.optional) return true;

  switch (question.type) {
    case 'slider':
      return typeof value === 'number';
    case 'single':
      return value !== null && value !== undefined;
    case 'multi':
      return Array.isArray(value) && value.length > 0;
    case 'savingGoal':
      if (value.active === false) return true;
      if (value.active === true) {
        return value.item.trim().length > 0 && Number(value.target) > 0;
      }
      return false; // hasn't picked yes or no yet
    default:
      return false;
  }
}

// Turn a stored answer back into readable text (used on the profile screen).
export function describeAnswer(question, value) {
  switch (question.type) {
    case 'slider':
      return question.format ? question.format(value) : String(value);
    case 'single':
      return labelFor(question.options, value) ?? 'Not answered';
    case 'multi':
      return value.length ? value.map((v) => labelFor(question.options, v)).join(', ') : 'None';
    case 'savingGoal':
      return value.active ? `Yes: ${value.item} ($${Number(value.target).toLocaleString('en-US')})` : 'No';
    default:
      return String(value);
  }
}

function labelFor(options, value) {
  return options.find((o) => o.value === value)?.label;
}

function deepCopy(value) {
  return value === null || typeof value !== 'object' ? value : JSON.parse(JSON.stringify(value));
}
