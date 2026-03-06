export const Colors = {
  // Primary palette — deep blue tones
  primary: '#1B2838',
  primaryLight: '#2A3F5F',
  primaryDark: '#0F1923',
  accent: '#00B4D8',
  accentLight: '#48CAE4',
  accentDark: '#0096C7',

  // Status colors
  success: '#06D6A0',
  warning: '#FFD166',
  error: '#EF476F',
  info: '#118AB2',

  // Neutrals
  background: '#0A0E17',
  surface: '#131B29',
  surfaceLight: '#1A2540',
  card: '#161E2E',
  cardElevated: '#1D2740',

  // Text
  textPrimary: '#F0F4FF',
  textSecondary: '#8B95A8',
  textMuted: '#5A6478',

  // Borders
  border: '#253045',
  borderLight: '#2E3D55',

  // Gradients (used as arrays)
  gradientPrimary: ['#1B2838', '#0F1923'],
  gradientAccent: ['#00B4D8', '#0096C7'],
  gradientCard: ['rgba(26,37,64,0.8)', 'rgba(19,27,41,0.9)'],
  gradientGlass: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'],

  // Status badge colors
  taskStatusNew: '#48CAE4',
  taskStatusInProgress: '#FFD166',
  taskStatusCompleted: '#06D6A0',
  taskStatusCancelled: '#EF476F',

  // Overlay
  overlay: 'rgba(10,14,23,0.7)',
  shimmer: 'rgba(255,255,255,0.05)',
};

export type ColorScheme = typeof Colors;
