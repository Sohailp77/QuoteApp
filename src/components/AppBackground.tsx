import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

/**
 * AppBackground — universal BizFlow decorative background layer.
 *
 * Renders floating organic blobs, ring outlines, and pixel-diamond accents
 * that match both dark and light themes. Drop this inside any screen's root
 * View with `position: 'absolute'` so it sits beneath all content.
 *
 * Usage:
 *   <View style={{ flex: 1, backgroundColor: colors.background }}>
 *     <AppBackground />
 *     ... screen content ...
 *   </View>
 */
export const AppBackground: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const s = styles(colors, isDark);

  return (
    <View style={s.root} pointerEvents="none">
      {/* ── Top-right blob + rings ──────────────────────────────── */}
      <View style={s.blobTopRight} />
      <View style={s.ringTopRight1} />
      <View style={s.ringTopRight2} />

      {/* ── Mid-left accent ─────────────────────────────────────── */}
      <View style={s.blobMidLeft} />

      {/* ── Bottom-right soft blob ──────────────────────────────── */}
      <View style={s.blobBottomRight} />

      {/* ── Pixel diamond accents ───────────────────────────────── */}
      <View style={[s.diamond, s.diamondTL]} />
      <View style={[s.diamond, s.diamondBR]} />
      <View style={[s.diamondSmall, s.diamondMidRight]} />
    </View>
  );
};

const styles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
    },

    /* ── Large blobs ──────────────────────────────────────── */
    blobTopRight: {
      position: 'absolute',
      top: -50,
      right: -60,
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: isDark
        ? colors.primary + '40'
        : 'rgba(215, 238, 223, 0.65)',
      opacity: isDark ? 0.75 : 0.9,
    },
    blobMidLeft: {
      position: 'absolute',
      top: 340,
      left: -70,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: isDark
        ? colors.primary + '28'
        : 'rgba(215, 238, 223, 0.4)',
      opacity: isDark ? 0.6 : 0.85,
    },
    blobBottomRight: {
      position: 'absolute',
      bottom: -80,
      right: -60,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: isDark
        ? colors.primary + '22'
        : 'rgba(215, 238, 223, 0.3)',
      opacity: isDark ? 0.5 : 0.7,
    },

    /* ── Concentric ring outlines ─────────────────────────── */
    ringTopRight1: {
      position: 'absolute',
      top: 60,
      right: -30,
      width: 230,
      height: 230,
      borderRadius: 115,
      borderWidth: 1.5,
      borderColor: isDark
        ? colors.primary + '65'
        : colors.primary + '28',
      backgroundColor: 'transparent',
    },
    ringTopRight2: {
      position: 'absolute',
      top: 100,
      right: -10,
      width: 180,
      height: 180,
      borderRadius: 90,
      borderWidth: 1,
      borderColor: isDark
        ? colors.primary + '40'
        : colors.primary + '18',
      backgroundColor: 'transparent',
    },

    /* ── Pixel / diamond accents ──────────────────────────── */
    diamond: {
      position: 'absolute',
      width: 10,
      height: 10,
      borderRadius: 2,
      backgroundColor: isDark
        ? colors.primary + 'BB'
        : colors.primary + '55',
      transform: [{ rotate: '45deg' }],
    },
    diamondSmall: {
      position: 'absolute',
      width: 6,
      height: 6,
      borderRadius: 1,
      backgroundColor: isDark
        ? colors.primary + '90'
        : colors.primary + '45',
      transform: [{ rotate: '45deg' }],
    },

    diamondTL: { top: 180, left: 24 },
    diamondBR: { bottom: 200, left: 30 },
    diamondMidRight: { top: 520, right: 22 },
  });
