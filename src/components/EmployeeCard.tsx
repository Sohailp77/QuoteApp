import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Employee } from '../types';
import { Radius, Shadow } from '../theme';
import { useAppTheme } from '../context/ThemeContext';

import { TooltipText } from './ui/TooltipText';

interface EmployeeCardProps {
  employee: Employee;
  onPress: () => void;
  onDelete: () => void;
  showDelete?: boolean;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ 
  employee, 
  onPress, 
  onDelete, 
  showDelete = true 
}) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const initials = (employee.name || 'E')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const avatarColors = ['#6C63FF', '#FF6B6B', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'];
  const colorIndex = (employee.name || 'E').charCodeAt(0) % avatarColors.length;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: avatarColors[colorIndex] }]}>
          <Text style={styles.initials}>{initials}</Text>
        </View>

        <View style={styles.info}>
          <TooltipText style={styles.name} numberOfLines={1} tooltipTitle="Employee Name">
            {employee.name}
          </TooltipText>
          <TooltipText style={styles.role} numberOfLines={1} tooltipTitle="Role">
            {employee.role}
          </TooltipText>
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={12} color={colors.textMuted} />
            <TooltipText style={styles.contact} numberOfLines={1} tooltipTitle="Email">
              {employee.email}
            </TooltipText>
          </View>
          {employee.phone ? (
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={12} color={colors.textMuted} />
              <TooltipText style={styles.contact} numberOfLines={1} tooltipTitle="Phone">
                {employee.phone}
              </TooltipText>
            </View>
          ) : null}
        </View>

        {showDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={18} color={colors.statusRejected} />
          </TouchableOpacity>
        )}
      </View>

      {employee.department ? (
        <View style={styles.deptBadge}>
          <TooltipText style={styles.deptText} numberOfLines={1} tooltipTitle="Department">
            {employee.department}
          </TooltipText>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
    ...Shadow.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#fff', fontSize: 18, fontWeight: '700' },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  role: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  contact: { fontSize: 12, color: colors.textSecondary },
  deleteBtn: { padding: 4 },
  deptBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deptText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
});
