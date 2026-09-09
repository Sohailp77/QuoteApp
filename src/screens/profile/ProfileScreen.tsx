import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';
import { account } from '../../config/appwrite';
import { checkForUpdatesManual } from '../../hooks/useAutoUpdateManager';
import { Radius, Shadow } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { AppBackground } from '../../components/AppBackground';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';

export const ProfileScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const styles = createStyles(colors, insets);
  const nav = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const firstName = user?.displayName?.split(' ')[0] || 'User';

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Required Field', 'Please enter a new password.');
      return;
    }
    if (newPassword.trim().length < 8) {
      Alert.alert('Weak Password', 'New password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      if (oldPassword.trim()) {
        await account.updatePassword(newPassword.trim(), oldPassword.trim());
      } else {
        await account.updatePassword(newPassword.trim());
      }
      Alert.alert('Password Updated', 'Your password has been changed successfully.', [
        {
          text: 'OK',
          onPress: () => {
            setShowPasswordModal(false);
            setOldPassword('');
            setNewPassword('');
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Failed to update password. If required, please enter your current password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      await account.createRecovery(user.email, 'https://syd.cloud.appwrite.io');
      Alert.alert(
        'Recovery Email Sent',
        `A password recovery email has been sent to ${user.email}. Check your inbox/spam folder for instructions.`
      );
      setShowPasswordModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send recovery email.');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { icon: 'business-outline', label: 'Company Profile & Bank Info', action: () => nav.navigate('CompanySettings') },
    { icon: 'card-outline', label: 'Payments & Collections', action: () => nav.navigate('PaymentsList') },
    { icon: 'key-outline', label: 'Change / Reset Password', action: () => setShowPasswordModal(true) },
    { icon: 'receipt-outline', label: 'Tax Slabs', action: () => nav.navigate('TaxRates') },
    { icon: 'grid-outline', label: 'Product Categories', action: () => nav.navigate('ProductCategories') },
    { icon: 'barcode-outline', label: 'Warehouse & Barcodes', action: () => nav.navigate('Warehouse') },
    ...(user?.role === 'boss' ? [{ icon: 'person-outline', label: 'View & manage employees', action: () => nav.navigate('People', { screen: 'EmployeesList' }) }] : []),
    { icon: 'cloud-download-outline', label: 'Check for App Updates', action: checkForUpdatesManual },
    { icon: 'information-circle-outline', label: 'About BizFlow', action: () => { } },
  ];

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
      {/* Profile Hero */}
      <View style={styles.hero}>
        <View style={styles.heroBg} />
        {user?.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name}>{user?.displayName || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.googleBadge}>
          <Ionicons name={user?.role === 'boss' ? 'shield-checkmark-outline' : 'person-circle-outline'} size={16} color={colors.primary} />
          <Text style={styles.googleBadgeText}>{user?.role === 'boss' ? 'Boss / Owner' : 'Employee'}</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menuSection}>
        <Text style={styles.menuLabel}>Settings</Text>
        <View style={styles.menuCard}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, idx < menuItems.length - 1 && styles.menuItemBorder]}
              onPress={item.action}
              activeOpacity={0.7}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              </View>
              <Text style={styles.menuItemText}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sign out */}
      <View style={styles.signOutSection}>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={colors.statusRejected} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>BizFlow v1.0.0</Text>
      <View style={{ height: tabBarHeight }} />

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSub}>
                Enter your new password below. If requested, provide your current password for security verification.
              </Text>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Current Password (Optional)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textMuted}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>New Password *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Enter new password (min 8 chars)"
                  placeholderTextColor={colors.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, loading && styles.btnDisabled]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Update Password</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.recoveryLinkBtn}
                onPress={handleSendResetEmail}
                disabled={loading}
              >
                <Text style={styles.recoveryLinkText}>Forgot current password? Send recovery email</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any, insets?: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollArea: { flex: 1 },
  hero: { alignItems: 'center', paddingTop: Math.max(insets?.top || 0, 24) + 24, paddingBottom: 32, position: 'relative' },
  heroBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 180 + (insets?.top || 0),
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    opacity: 0.05,
  },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#fff' },
  avatarFallback: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginTop: 12 },
  email: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  googleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, backgroundColor: colors.surface,
    borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6,
    ...Shadow.sm,
  },
  googleBadgeText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  menuSection: { paddingHorizontal: 20, marginTop: 8, marginBottom: 16 },
  menuLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 15,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.primary + '12',
    alignItems: 'center', justifyContent: 'center',
  },
  menuItemText: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.textPrimary },
  signOutSection: { paddingHorizontal: 20, marginBottom: 12 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: colors.statusRejected + '12',
    borderRadius: Radius.full, paddingVertical: 16,
    borderWidth: 1.5, borderColor: colors.statusRejected + '30',
  },
  signOutText: { fontSize: 16, fontWeight: '700', color: colors.statusRejected },
  version: { textAlign: 'center', fontSize: 12, color: colors.textMuted },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: 24,
    maxHeight: '85%',
    ...Shadow.lg,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  modalSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 18 },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 },
  fieldInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.7 },
  recoveryLinkBtn: { marginTop: 16, alignItems: 'center', paddingVertical: 8 },
  recoveryLinkText: { fontSize: 13, fontWeight: '600', color: colors.primary },
});
