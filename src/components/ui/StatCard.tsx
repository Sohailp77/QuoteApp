import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Shadow } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

import { TooltipText } from './TooltipText';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, style }) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <TooltipText style={styles.value} numberOfLines={1} tooltipTitle={label}>
        {value}
      </TooltipText>
      <TooltipText style={styles.label} numberOfLines={1} tooltipTitle="Metric Label">
        {label}
      </TooltipText>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    ...Shadow.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
