export { ThemeColors, lightColors, darkColors } from './colors';

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─── Border Radius ────────────────────────────────────────────────────────────
export const Radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  tile: 18,   // rounded square tiles (like reference)
  full: 999,
};

// ─── Typography ───────────────────────────────────────────────────────────────
export const Typography = {
  // Screen-level headings
  displayLg: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.8 },
  displayMd: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  displaySm: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.3 },

  // Section titles
  h1: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.2 },
  h3: { fontSize: 16, fontWeight: '600' as const },
  h4: { fontSize: 15, fontWeight: '600' as const },

  // Body
  bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySm: { fontSize: 13, fontWeight: '400' as const, lineHeight: 20 },

  // Labels & captions
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.3 },
  caption: { fontSize: 11, fontWeight: '500' as const },
};

// ─── Shadows ──────────────────────────────────────────────────────────────────
// Matches the reference image: very subtle, clean cards
export const Shadow = {
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 6,
  },
  green: {
    shadowColor: '#2BAE78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
};

