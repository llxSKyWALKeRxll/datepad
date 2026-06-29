/**
 * DatePad theme — "Coral / Warm", now with a light and a dark palette.
 *
 * Components read the active palette at runtime via `useColors()` (see
 * src/lib/theme.tsx). `Colors` stays exported as the light palette for any
 * static/non-component code. Urgency badge colors are theme-independent (white
 * text sits on them in both modes), so pure logic in dates.ts uses `Urgency`.
 */
export type ThemeColors = {
  accent: string;
  accentPressed: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  // Countdown / urgency scale (mirrors Urgency; present so styles can read them).
  far: string;
  soon: string;
  today: string;
  passed: string;
};

export const lightColors: ThemeColors = {
  accent: '#FF6B5E',
  accentPressed: '#E8503F',
  background: '#FFF7F2',
  surface: '#FFFFFF',
  text: '#22201E',
  textMuted: '#8A817C',
  border: '#F0E5DD',
  far: '#3FB27F',
  soon: '#F2A53C',
  today: '#FF6B5E',
  passed: '#A89E97',
};

export const darkColors: ThemeColors = {
  accent: '#FF7A6E',
  accentPressed: '#FF6B5E',
  background: '#171311',
  surface: '#231D1A',
  text: '#F6EFEA',
  textMuted: '#A89E97',
  border: '#352D29',
  far: '#43C08A',
  soon: '#F2A53C',
  today: '#FF7A6E',
  passed: '#8A817C',
};

/** Back-compat: static imports of `Colors` get the light palette. */
export const Colors = lightColors;

/** Theme-independent urgency badge colors (always white text on top). */
export const Urgency = {
  far: '#3FB27F',
  soon: '#F2A53C',
  today: '#FF6B5E',
  passed: '#8A817C',
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
} as const;

export const Spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
