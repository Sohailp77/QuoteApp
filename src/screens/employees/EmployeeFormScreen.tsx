import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useEmployees } from '../../hooks/useEmployees';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Colors, Radius, Shadow } from '../../theme';
import { Employee } from '../../types';

type RouteParams = { employee?: Employee };

export const EmployeeFormScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const existing = route.params?.employee;
  const user = useAuthStore((s) => s.user);

  const { create, update } = useEmployees();
  const [name, setName] = useState(existing?.name || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [phone, setPhone] = useState(existing?.phone || '');
  const [role, setRole] = useState(existing?.role || '');
  const [department, setDepartment] = useState(existing?.department || '');
  const [loading, setLoading] = useState(false);

  const isEdit = !!existing;
  const isBoss = user?.role === 'boss';

  const handleSave = async () => {
    if (!isBoss) {
      Alert.alert('Access Denied', 'Only the owner (Boss) can manage employee records.');
      return;
    }

    if (!name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    if (!email.trim()) { Alert.alert('Error', 'Email is required'); return; }
    if (!role.trim()) { Alert.alert('Error', 'Role is required'); return; }

    setLoading(true);
    try {
      const data = { 
        name: name.trim(), 
        email: email.trim().toLowerCase(), 
        phone: phone.trim(), 
        role: role.trim(), 
        department: department.trim() 
      };

      if (isEdit) {
        await update(existing.id, data);
        Alert.alert('Updated', 'Employee updated successfully', [
          { text: 'OK', onPress: () => nav.goBack() },
        ]);
      } else {
        await create(data);
        Alert.alert('Added', 'Employee added successfully', [
          { text: 'OK', onPress: () => nav.goBack() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Employee' : 'Add Employee'}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {!isBoss && (
          <View style={styles.employeeBanner}>
            <Ionicons name="information-circle" size={20} color={Colors.accent} />
            <Text style={styles.employeeBannerText}>
              Read-only view. Only the owner (Boss) can modify or add employees.
            </Text>
          </View>
        )}

        {/* Avatar placeholder */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {name ? name[0].toUpperCase() : '?'}
            </Text>
          </View>
          {name ? <Text style={styles.avatarName}>{name}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          <View style={styles.card}>
            <Field label="Full Name *" value={name} onChangeText={setName} placeholder="John Doe" editable={isBoss} />
            <Field label="Email *" value={email} onChangeText={setEmail} placeholder="john@company.com" keyboardType="email-address" editable={isBoss} />
            <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+91 9876543210" keyboardType="phone-pad" editable={isBoss} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Details</Text>
          <View style={styles.card}>
            <Field label="Role / Designation *" value={role} onChangeText={setRole} placeholder="Sales Manager" editable={isBoss} />
            <Field label="Department" value={department} onChangeText={setDepartment} placeholder="Sales & Marketing" editable={isBoss} />
          </View>
        </View>

        {isBoss && (
          <View style={styles.section}>
            <Button
              title={isEdit ? 'Save Changes' : 'Add Employee'}
              onPress={handleSave}
              loading={loading}
              size="lg"
            />
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const Field: React.FC<{
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: any; editable?: boolean;
}> = ({ label, value, onChangeText, placeholder, keyboardType, editable = true }) => (
  <View style={fieldStyles.wrap}>
    <Text style={fieldStyles.label}>{label}</Text>
    <TextInput
      style={[fieldStyles.input, !editable && fieldStyles.inputDisabled]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.textMuted}
      keyboardType={keyboardType}
      editable={editable}
    />
  </View>
);

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    fontSize: 12, fontWeight: '700', color: Colors.textSecondary,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: Colors.border,
  },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 12, paddingHorizontal: 20,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 32, fontWeight: '800' },
  avatarName: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    ...Shadow.sm,
  },
  employeeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.accent + '15',
    padding: 12,
    borderRadius: Radius.md,
    marginHorizontal: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  employeeBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
});
