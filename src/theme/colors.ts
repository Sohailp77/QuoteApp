export const palette = {
  // Material Pixel Green palette
  green500: '#1E8E3E',
  green600: '#0F5A2A',
  green700: '#0A3B1B',
  greenLight: '#EAF5ED',
  mintBackground: '#EAF5ED',
  mintTile: '#D7EEDF',
  mintAccent: '#B7E4C7',

  // Accent Colors
  orange500: '#F5813C',
  orange600: '#E0722D',
  orangeLight: '#FEF0E8',

  // Dark tiles
  navy: '#1B4332',
  navyTile: '#081C15',

  // Neutral light grayscale
  white: '#FFFFFF',
  gray50: '#EAF5ED', // Pixel Mint background
  gray100: '#D7EEDF', // Squircle tile background
  gray200: '#C8E6C9',
  gray300: '#A3D9A5',
  gray400: '#74C69D',
  gray500: '#52B788',
  gray600: '#2D6A4F',
  gray700: '#1B4332',
  gray900: '#081C15',

  // Pure Neutral Dark Mode Grayscale (Pixel Dark)
  dark900: '#121212', // Screen background
  dark800: '#1E1E1E', // Card surface
  dark700: '#252525', // Tile & Input background
  dark600: '#2D2D2D', // Border & Divider
  dark500: '#383838', // Elevated element

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
  background: palette.mintBackground,
  surface: palette.white,
  surfaceAlt: palette.mintTile,
  surfaceRaised: palette.white,

  primary: palette.green600,
  primaryDark: palette.green700,
  primaryLight: palette.mintTile,
  accent: palette.green500,
  accentLight: palette.mintAccent,

  textPrimary: palette.navyTile,
  textSecondary: palette.gray600,
  textMuted: palette.gray500,
  textInverse: palette.white,
  textOnPrimary: palette.white,

  border: 'rgba(15, 90, 42, 0.12)',
  divider: 'rgba(15, 90, 42, 0.06)',
  overlay: 'rgba(8, 28, 21, 0.4)',

  statusDraft: palette.gray600,
  statusSent: palette.blue500,
  statusAccepted: palette.green500,
  statusRejected: palette.red500,
  statusExpired: palette.amber500,

  tiles: {
    green: palette.green600,
    orange: palette.orange500,
    navy: palette.navy,
    teal: '#00B4D8',
    purple: '#7C3AED',
    rose: '#E11D48',
  },
};

export const darkColors: ThemeColors = {
  background: palette.dark900,
  surface: palette.dark800,
  surfaceAlt: palette.dark700,
  surfaceRaised: palette.dark500,

  primary: '#22C55E', // Sleek green accent for active state ONLY
  primaryDark: '#16A34A',
  primaryLight: 'rgba(34, 197, 94, 0.15)',
  accent: '#22C55E',
  accentLight: 'rgba(34, 197, 94, 0.15)',

  textPrimary: '#FFFFFF', // Crisp White primary text in dark mode
  textSecondary: '#A1A1AA', // Neutral Light Grey secondary text
  textMuted: '#71717A', // Muted Grey text
  textInverse: '#121212',
  textOnPrimary: '#FFFFFF',

  border: 'rgba(255, 255, 255, 0.12)',
  divider: 'rgba(255, 255, 255, 0.06)',
  overlay: 'rgba(0, 0, 0, 0.75)',

  statusDraft: '#A1A1AA',
  statusSent: palette.blue400,
  statusAccepted: palette.emerald400,
  statusRejected: palette.red400,
  statusExpired: palette.amber400,

  tiles: {
    green: '#22C55E',
    orange: palette.orange500,
    navy: '#383838',
    teal: '#00B4D8',
    purple: '#7C3AED',
    rose: '#E11D48',
  },
};
