import React from 'react';
import { View, StyleSheet, ScrollView, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import { useAppTheme } from '../../context/ThemeContext';
import { AppBackground } from '../AppBackground';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** If true, wraps content in a ScrollView with auto tab bar bottom inset */
  scrollable?: boolean;
  /** Custom style for the outermost screen View */
  style?: StyleProp<ViewStyle>;
  /** Custom style for content wrapper or ScrollView contentContainerStyle */
  contentStyle?: StyleProp<ViewStyle>;
  /** Whether to show the background gradient dots overlay */
  hasBackground?: boolean;
  /** Additional bottom spacing buffer above tab bar (defaults to 16) */
  bottomBuffer?: number;
}

/**
 * Universal Screen Container Component
 * Handles status bar safe area, background, and floating tab bar insets globally.
 */
export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = false,
  style,
  contentStyle,
  hasBackground = true,
  bottomBuffer = 16,
}) => {
  const { colors } = useAppTheme();
  const tabBarHeight = useTabBarHeight();

  const dynamicPaddingBottom = tabBarHeight + bottomBuffer;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }, style]}>
      {hasBackground && <AppBackground />}
      {scrollable ? (
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={[{ paddingBottom: dynamicPaddingBottom }, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex1, { paddingBottom: dynamicPaddingBottom }, contentStyle]}>
          {children}
        </View>
      )}
    </View>
  );
};

interface FloatingFooterProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Extra offset above tab bar (defaults to 10) */
  offsetBottom?: number;
}

/**
 * Floating Action Footer component that automatically anchors itself
 * above the floating navigation tab bar.
 */
export const FloatingFooter: React.FC<FloatingFooterProps> = ({
  children,
  style,
  offsetBottom = 10,
}) => {
  const tabBarHeight = useTabBarHeight();
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.footer,
        {
          bottom: tabBarHeight + offsetBottom,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
});
