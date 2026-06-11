import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCompanySettings } from '../../hooks/useCompanySettings';
import { CompanySettings } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors, Radius, Shadow, Spacing } from '../../theme';
import { Button } from '../../components/ui/Button';

export const CompanySettingsScreen: React.FC = () => {
  const nav = useNavigation();
  const user = useAuthStore((s) => s.user);
  const { settings, loading, fetch, update } = useCompanySettings();

  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const isBoss = user?.role === 'boss';

  useEffect(() => {
    fetch();
  }, []);

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company_name || '');
      setAddress(settings.address || '');
      setPhone(settings.phone || '');
      setEmail(settings.email || '');
      setBankName(settings.bank_name || '');
      setAccountNumber(settings.account_number || '');
      setIfscCode(settings.ifsc_code || '');
      setGstNumber(settings.gst_number || '');
    }
  }, [settings]);

  const handleSave = async () => {
    if (!isBoss) {
      Alert.alert('Access Denied', 'Only the owner (Boss) can update company settings.');
      return;
    }

    if (!companyName.trim()) {
      Alert.alert('Required Field', 'Company name is required.');
      return;
    }

    setSaving(true);
    try {
      const updated: Partial<CompanySettings> = {
        company_name: companyName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        ifsc_code: ifscCode.trim(),
        gst_number: gstNumber.trim(),
      };
      await update(updated);
      Alert.alert('Success', 'Company settings updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update company settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Company Profile</Text>
          <View style={{ width: 38 }} />
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {!isBoss && (
              <View style={styles.employeeBanner}>
                <Ionicons name="information-circle" size={20} color={Colors.accent} />
                <Text style={styles.employeeBannerText}>
                  Read-only view. Only the owner (Boss) can change these settings.
                </Text>
              </View>
            )}

            {/* General Info */}
            <Text style={styles.sectionTitle}>General Info</Text>
            <View style={styles.card}>
              <Field
                label="Company Name *"
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="e.g. Acme Corp"
                editable={isBoss}
              />
              <Field
                label="GSTIN / Tax ID"
                value={gstNumber}
                onChangeText={setGstNumber}
                placeholder="e.g. 22AAAAA0000A1Z5"
                editable={isBoss}
                autoCapitalize="characters"
              />
              <Field
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. +91 98765 43210"
                editable={isBoss}
                keyboardType="phone-pad"
              />
              <Field
                label="Business Email"
                value={email}
                onChangeText={setEmail}
                placeholder="e.g. contact@acme.com"
                editable={isBoss}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={fieldStyles.wrap}>
                <Text style={fieldStyles.label}>Address</Text>
                <TextInput
                  style={[fieldStyles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Street, City, Pin Code..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  editable={isBoss}
                />
              </View>
            </View>

            {/* Bank Settings */}
            <Text style={styles.sectionTitle}>Bank Account Details</Text>
            <View style={styles.card}>
              <Field
                label="Bank Name"
                value={bankName}
                onChangeText={setBankName}
                placeholder="e.g. HDFC Bank"
                editable={isBoss}
              />
              <Field
                label="Account Number"
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="e.g. 501001234567"
                editable={isBoss}
                keyboardType="number-pad"
              />
              <Field
                label="IFSC Code"
                value={ifscCode}
                onChangeText={setIfscCode}
                placeholder="e.g. HDFC0000123"
                editable={isBoss}
                autoCapitalize="characters"
              />
            </View>

            {isBoss && (
              <View style={styles.btnContainer}>
                <Button
                  title="Save Company Settings"
                  onPress={handleSave}
                  loading={saving}
                  size="lg"
                />
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  editable?: boolean;
  autoCapitalize?: any;
}> = ({ label, value, onChangeText, placeholder, keyboardType, editable = true, autoCapitalize }) => (
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
      autoCapitalize={autoCapitalize}
    />
  </View>
);

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  scrollContent: { paddingHorizontal: 20 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 16, marginBottom: 10 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, marginBottom: 8, ...Shadow.sm },
  employeeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.accent + '15',
    padding: 12,
    borderRadius: Radius.md,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  employeeBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  btnContainer: { marginTop: 20 },
});
