/**
 * DatePad theme — "Coral / Warm".
 * Single light theme for now; dark mode comes later.
 */
export const Colors = {
  accent: '#FF6B5E',
  accentPressed: '#E8503F',
  background: '#FFF7F2',
  surface: '#FFFFFF',
  text: '#22201E',
  textMuted: '#8A817C',
  border: '#F0E5DD',

  // Countdown / urgency scale (used on date badges)
  far: '#3FB27F',
  soon: '#F2A53C',
  today: '#FF6B5E',
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
