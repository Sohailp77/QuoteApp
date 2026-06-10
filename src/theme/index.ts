// Design tokens — inspired by the reference app's clean, modern aesthetic
export const Colors = {
  // Primary palette
  primary: '#0F0F1A',       // Near-black (dark nav, CTA buttons)
  primaryLight: '#1C1C2E',  // Slightly lighter dark
  accent: '#6C63FF',        // Purple accent
  accentWarm: '#FF6B6B',    // Warm accent for status indicators

  // Backgrounds
  background: '#FAFAFA',    // Page background
  surface: '#FFFFFF',       // Card background
  surfaceAlt: '#F4F4F8',    // Slightly off-white surfaces

  // Text
  textPrimary: '#0F0F1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Status colors
  statusDraft: '#6B7280',
  statusSent: '#3B82F6',
  statusAccepted: '#10B981',
  statusRejected: '#EF4444',
  statusExpired: '#F59E0B',

  // UI colors
  border: '#E5E7EB',
  divider: '#F3F4F6',
  overlay: 'rgba(0,0,0,0.4)',

  // Gradient stops
  gradientStart: '#667eea',
  gradientEnd: '#764ba2',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  h4: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodySmall: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.5 },
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
};

export const StatusColors: Record<string, string> = {
  Draft: Colors.statusDraft,
  Sent: Colors.statusSent,
  Accepted: Colors.statusAccepted,
  Rejected: Colors.statusRejected,
  Expired: Colors.statusExpired,
};
