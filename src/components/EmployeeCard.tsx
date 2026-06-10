import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Employee } from '../types';
import { Colors, Radius, Shadow } from '../theme';

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
  const initials = employee.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = ['#6C63FF', '#FF6B6B', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'];
  const colorIndex = employee.name.charCodeAt(0) % colors.length;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: colors[colorIndex] }]}>
          <Text style={styles.initials}>{initials}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{employee.name}</Text>
          <Text style={styles.role}>{employee.role}</Text>
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.contact}>{employee.email}</Text>
          </View>
          {employee.phone ? (
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.contact}>{employee.phone}</Text>
            </View>
          ) : null}
        </View>

        {showDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={18} color={Colors.statusRejected} />
          </TouchableOpacity>
        )}
      </View>

      {employee.department ? (
        <View style={styles.deptBadge}>
          <Text style={styles.deptText}>{employee.department}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
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
  name: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  role: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  contact: { fontSize: 12, color: Colors.textSecondary },
  deleteBtn: { padding: 4 },
  deptBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deptText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
});
