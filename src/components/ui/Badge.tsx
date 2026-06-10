import React from 'react';
import { Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, Radius, StatusColors } from '../../theme';

interface BadgeProps {
  label: string;
  status?: string;
  color?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, status, color, style, textStyle }) => {
  const bgColor = color || (status ? StatusColors[status] : Colors.accent);
  return (
    <Text style={[styles.badge, { backgroundColor: bgColor + '20', color: bgColor }, style, textStyle]}>
      {label}
    </Text>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    fontSize: 11,
    fontWeight: '600',
    overflow: 'hidden',
  },
});
