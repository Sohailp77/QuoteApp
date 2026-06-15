export const palette = {
  // Primary teal-green (like reference image)
  green500: '#2BAE78',
  green600: '#219A68',
  green700: '#1A7A53',
  greenLight: '#E8F8F1',
  greenTile: '#1E9E6B', // dark tile background

  // Orange accent
  orange500: '#F5813C',
  orange600: '#E0722D',
  orangeLight: '#FEF0E8',

  // Navy/dark tile
  navy: '#2D3A6A',
  navyTile: '#1E2D5A',

  // Neutral grayscale
  white: '#FFFFFF',
  gray50: '#F8F9FB',
  gray100: '#F1F3F6',
  gray200: '#E4E7EE',
  gray300: '#CBD1DE',
  gray400: '#9EA8BC',
  gray500: '#6B7A99',
  gray600: '#4A5568',
  gray700: '#2D3748',
  gray900: '#111827',

  // Dark mode surfaces
  dark900: '#0C0D10',
  dark800: '#141519',
  dark700: '#1C1D23',
  dark600: '#24262E',
  dark500: '#2E3038',

  // Status
  blue500: '#3B82F6',
  blue400: '#60A5FA',
  emerald500: '#10B981',
  emerald400: '#34D399',
  red500: '#EF4444',
  red400: '#F87171',
  amber500: '#F59E0B',
  amber400: '#FBBF24',
};

// ─── Theme Objects ─────────────────────────────────────────────────────────────

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;

  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  accentLight: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textOnPrimary: string;

  border: string;
  divider: string;
  overlay: string;

  statusDraft: string;
  statusSent: string;
  statusAccepted: string;
  statusRejected: string;
  statusExpired: string;

  tiles: {
    green: string;
    orange: string;
    navy: string;
    teal: string;
    purple: string;
    rose: string;
  };
}

export const lightColors: ThemeColors = {
  background: palette.gray50,
  surface: palette.white,
  surfaceAlt: palette.gray100,
  surfaceRaised: palette.white,

  primary: palette.green500,
  primaryDark: palette.green600,
  primaryLight: palette.greenLight,
  accent: palette.orange500,
  accentLight: palette.orangeLight,

  textPrimary: palette.gray900,
  textSecondary: palette.gray500,
  textMuted: palette.gray300,
  textInverse: palette.white,
  textOnPrimary: palette.white,

  border: palette.gray200,
  divider: palette.gray100,
  overlay: 'rgba(0,0,0,0.3)',

  statusDraft: palette.gray500,
  statusSent: palette.blue500,
  statusAccepted: palette.emerald500,
  statusRejected: palette.red500,
  statusExpired: palette.amber500,

  tiles: {
    green: palette.green500,
    orange: palette.orange500,
    navy: palette.navy,
    teal: '#00B4D8',
    purple: '#7C3AED',
    rose: '#E11D48',
  },
};

export const darkColors: ThemeColors = {
  background: palette.dark900,
  surface: palette.dark700,
  surfaceAlt: palette.dark600,
  surfaceRaised: palette.dark800,

  primary: palette.green500,
  primaryDark: palette.green600,
  primaryLight: 'rgba(43,174,120,0.15)',
  accent: palette.orange500,
  accentLight: 'rgba(245,129,60,0.15)',

  textPrimary: '#F3F4F6',
  textSecondary: palette.gray400,
  textMuted: palette.dark500,
  textInverse: palette.white,
  textOnPrimary: palette.white,

  border: 'rgba(255,255,255,0.07)',
  divider: 'rgba(255,255,255,0.04)',
  overlay: 'rgba(0,0,0,0.6)',

  statusDraft: palette.gray400,
  statusSent: palette.blue400,
  statusAccepted: palette.emerald400,
  statusRejected: palette.red400,
  statusExpired: palette.amber400,

  tiles: {
    green: palette.green500,
    orange: palette.orange500,
    navy: palette.navy,
    teal: '#00B4D8',
    purple: '#7C3AED',
    rose: '#E11D48',
  },
};
