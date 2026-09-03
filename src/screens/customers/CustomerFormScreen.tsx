import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useCustomers } from '../../hooks/useCustomers';
import { Customer } from '../../types';
import { Radius, Shadow } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

type RouteParams = { customer?: Customer };

export const CustomerFormScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets);
  const fieldStyles = createFieldStyles(colors);
  const nav = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const existing = route.params?.customer;
  const isEdit = !!existing;

  const { create, update } = useCustomers();

  const [name, setName] = useState(existing?.name || '');
  const [phone, setPhone] = useState(existing?.phone || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [address, setAddress] = useState(existing?.billing_address || '');
  const [gst, setGst] = useState(existing?.gst_number || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Customer name is required');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        billing_address: address.trim(),
        gst_number: gst.trim().toUpperCase(),
        notes: notes.trim(),
      };

      if (isEdit) {
        await update(existing.id, payload);
        Alert.alert('Updated', 'Customer updated successfully', [
          { text: 'OK', onPress: () => nav.goBack() },
        ]);
      } else {
        await create(payload);
        Alert.alert('Added', 'Customer added to CRM', [
          { text: 'OK', onPress: () => nav.goBack() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const Field: React.FC<{
    label: string; value: string; onChangeText: (t: string) => void;
    placeholder?: string; keyboardType?: any; multiline?: boolean; icon?: string;
  }> = ({ label, value, onChangeText, placeholder, keyboardType, multiline, icon }) => (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={[fieldStyles.inputWrap, multiline && { height: 90 }]}>
        {icon ? <Ionicons name={icon as any} size={16} color={colors.textMuted} style={{ marginRight: 8 }} /> : null}
        <TextInput
          style={[fieldStyles.input, multiline && { flex: 1, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          multiline={multiline}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Customer' : 'New Customer'}</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* Avatar area */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {name ? name[0].toUpperCase() : '?'}
              </Text>
            </View>
            {name ? <Text style={styles.namePreview}>{name}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Info</Text>
            <View style={styles.card}>
              <Field label="Full Name *" value={name} onChangeText={setName} placeholder="e.g. Priya Sharma" icon="person-outline" />
              <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+91 9876543210" keyboardType="phone-pad" icon="call-outline" />
              <Field label="Email" value={email} onChangeText={setEmail} placeholder="customer@email.com" keyboardType="email-address" icon="mail-outline" />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business & Billing</Text>
            <View style={styles.card}>
              <Field label="Billing Address" value={address} onChangeText={setAddress} placeholder="Street, City, State, PIN" multiline icon="location-outline" />
              <Field label="GST Number" value={gst} onChangeText={setGst} placeholder="22AAAAA0000A1Z5" icon="receipt-outline" />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Payment terms, preferences, etc."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {isEdit ? 'Save Changes' : 'Add Customer'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const createFieldStyles = (colors: any) => StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    fontSize: 11, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  input: {
    flex: 1, fontSize: 15, color: colors.textPrimary,
  },
});

const createStyles = (colors: any, insets?: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Math.max(insets?.top || 0, 24) + 12, paddingBottom: 12, paddingHorizontal: 20,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.accent + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: colors.accent },
  namePreview: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  card: { backgroundColor: colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg, padding: 14,
    fontSize: 15, color: colors.textPrimary,
    minHeight: 90, ...Shadow.sm,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
