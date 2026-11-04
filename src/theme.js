// The design system: every color, size, and text style lives here.
// Change a value here and every screen picks it up (like constants in a Java class).
//
// Palette: near-black surfaces with one calm red accent. Green and amber are used
// only for verdicts, so color always means something.

export const colors = {
  bg: '#0B0B0C', // app background
  surface: '#151517', // cards
  surfaceRaised: '#1E1E21', // inputs, unselected chips, chat bubbles
  border: '#2A2A2E',
  text: '#F5F5F6',
  textSecondary: '#A1A1A8',
  textTertiary: '#6E6E76',

  accent: '#E25F5B', // calm red: the brand, primary buttons, "don't"
  accentSoft: 'rgba(226, 95, 91, 0.14)', // tinted backgrounds
  onAccent: '#FFFFFF', // text drawn on top of the accent

  success: '#5BBF8A', // "worth it"
  successSoft: 'rgba(91, 191, 138, 0.14)',
  warning: '#E3B05B', // "sleep on it", missing fields
  warningSoft: 'rgba(227, 176, 91, 0.14)',
  danger: '#E25F5B',
  dangerSoft: 'rgba(226, 95, 91, 0.14)',
};

// Which color each verdict id (see scoring/scoringConfig.js) is drawn in.
export const verdictColors = {
  worth_it: colors.success,
  sleep_on_it: colors.warning,
  dont: colors.danger,
};

export const verdictSoftColors = {
  worth_it: colors.successSoft,
  sleep_on_it: colors.warningSoft,
  dont: colors.dangerSoft,
};

// A 4-point spacing scale. `screen` is the left/right margin of every screen.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screen: 20,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
};

// Text styles. Spread them into a style: { ...type.title, color: colors.text }
export const type = {
  display: { fontSize: 72, fontWeight: '800', letterSpacing: -3, lineHeight: 78 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6, lineHeight: 36 },
  heading: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 23 },
  bodyStrong: { fontSize: 16, fontWeight: '600', lineHeight: 23 },
  small: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
};
