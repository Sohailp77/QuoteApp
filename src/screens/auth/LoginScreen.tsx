import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { account, ID, tablesDB, DATABASE_ID, COLLECTIONS, Query } from '../../config/appwrite';
import { useAuthStore } from '../../store/useAuthStore';
import { Radius, Shadow, Spacing } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

export const LoginScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const setUser = useAuthStore((s) => s.setUser);

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  // Password reset states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetUserId, setResetUserId] = useState('');
  const [resetSecret, setResetSecret] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleSendResetEmail = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Email Required', 'Please enter your registered email address.');
      return;
    }

    setResetLoading(true);
    try {
      const redirectUrl = 'https://syd.cloud.appwrite.io';
      await account.createRecovery(resetEmail.trim(), redirectUrl);

      Alert.alert(
        'Recovery Email Sent',
        'Password reset instructions have been sent to your email address.\n\nCheck your inbox/spam folder for the email containing your User ID and Secret Code.',
        [
          {
            text: 'Enter Secret Code',
            onPress: () => setResetStep('confirm'),
          },
          { text: 'OK' },
        ]
      );
    } catch (err: any) {
      Alert.alert('Reset Failed', err.message || 'Failed to send recovery email. Please check the email address.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmResetPassword = async () => {
    if (!resetUserId.trim() || !resetSecret.trim() || !newPassword.trim()) {
      Alert.alert('Required Fields', 'Please fill in your User ID, Secret Code, and New Password.');
      return;
    }
    if (newPassword.trim().length < 8) {
      Alert.alert('Weak Password', 'New password must be at least 8 characters long.');
      return;
    }

    setResetLoading(true);
    try {
      await account.updateRecovery(
        resetUserId.trim(),
        resetSecret.trim(),
        newPassword.trim()
      );

      Alert.alert(
        'Password Updated!',
        'Your password has been successfully updated. You can now log in with your new password.',
        [
          {
            text: 'Log In Now',
            onPress: () => {
              setShowResetModal(false);
              setEmail(resetEmail);
              setPassword(newPassword);
              setResetSecret('');
              setResetUserId('');
              setNewPassword('');
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Reset Failed', err.message || 'Invalid or expired secret code. Please request a new recovery email.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please fill in all fields.');
      return;
    }

    if (isRegister && !displayName.trim()) {
      Alert.alert('Required Fields', 'Please enter your name.');
      return;
    }

    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (isRegister) {
        // Appwrite Registration
        try {
          await account.create(ID.unique(), normalizedEmail, password, displayName.trim());
        } catch (createErr: any) {
          console.log('User account create note:', createErr?.message);
        }
        await account.createEmailPasswordSession(normalizedEmail, password);
      } else {
        // Appwrite Login
        try {
          await account.createEmailPasswordSession(normalizedEmail, password);
        } catch (loginErr: any) {
          // If login fails because user account hasn't been created in Appwrite Auth yet,
          // check if they exist in USERS or EMPLOYEES table (created by a boss)
          const empCheck = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.EMPLOYEES,
            queries: [Query.equal('email', normalizedEmail)]
          });

          const userCheck = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.USERS,
            queries: [Query.equal('email', normalizedEmail)]
          });

          if (empCheck.rows.length > 0 || userCheck.rows.length > 0) {
            const empName = userCheck.rows[0]?.displayName || empCheck.rows[0]?.name || displayName.trim() || 'Employee';
            try {
              await account.create(ID.unique(), normalizedEmail, password, empName);
              await account.createEmailPasswordSession(normalizedEmail, password);
            } catch (autoCreateErr: any) {
              throw loginErr;
            }
          } else {
            throw loginErr;
          }
        }
      }

      const appwriteUser = await account.get();
      let resolvedRole: 'boss' | 'employee' = 'boss';
      let resolvedTenantId = `tenant_${appwriteUser.$id}`;

      // Check USERS collection by normalized email
      const userDocs = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.USERS,
        queries: [Query.equal('email', appwriteUser.email.toLowerCase())]
      });

      // Check EMPLOYEES collection by normalized email
      const empDocs = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.EMPLOYEES,
        queries: [Query.equal('email', appwriteUser.email.toLowerCase())]
      });

      let resolvedStatus = 'active';

      if (userDocs.rows.length > 0) {
        const uDoc = userDocs.rows[0];
        resolvedRole = (uDoc.role as 'boss' | 'employee') || 'boss';
        resolvedTenantId = uDoc.tenant_id;
        resolvedStatus = uDoc.status || 'active';
      } else if (empDocs.rows.length > 0) {
        const emp = empDocs.rows[0];
        resolvedRole = 'employee';
        resolvedTenantId = emp.tenant_id;
        resolvedStatus = 'active';
      } else {
        // New Boss account registration: set inactive by default for manual admin approval
        resolvedRole = 'boss';
        resolvedTenantId = `tenant_${appwriteUser.$id}`;
        resolvedStatus = 'inactive';
      }

      // Link employee record user_id if needed
      if (empDocs.rows.length > 0) {
        const emp = empDocs.rows[0];
        resolvedRole = 'employee';
        resolvedTenantId = emp.tenant_id;

        try {
          await tablesDB.updateRow({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.EMPLOYEES,
            rowId: emp.$id,
            data: { user_id: appwriteUser.$id }
          });
        } catch (e) {
          console.warn('Failed to link employee uid');
        }
      }

      // Create user profile document if not existing
      if (userDocs.rows.length === 0) {
        await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: COLLECTIONS.USERS,
          rowId: ID.unique(),
          data: {
            tenant_id: resolvedTenantId,
            email: appwriteUser.email.toLowerCase(),
            displayName: appwriteUser.name || displayName.trim() || 'User',
            role: resolvedRole,
            status: resolvedStatus,
          }
        });
      }

      // Block inactive Boss accounts (leave employee flow unchanged)
      if (resolvedRole === 'boss' && resolvedStatus === 'inactive') {
        try {
          await account.deleteSession('current');
        } catch (sErr) {}

        Alert.alert(
          'Account Approval Pending',
          'Your account has been registered successfully, but is currently marked as inactive.\n\nPlease contact the administrator to manually authorize and activate your account access.',
          [{ text: 'OK' }]
        );
        return;
      }

      setUser({
        id: appwriteUser.$id,
        email: appwriteUser.email,
        displayName: appwriteUser.name || displayName.trim() || 'User',
        role: resolvedRole,
        tenant_id: resolvedTenantId,
        status: resolvedStatus,
      });
    } catch (err: any) {
      Alert.alert('Authentication Failed', err.message || 'Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      >
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Ionicons name="document-text" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>QuoteApp</Text>
          <Text style={styles.subtitle}>Manage quotes & inventory with ease.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isRegister ? 'Create Account' : 'Welcome Back'}</Text>
          <Text style={styles.cardSubtitle}>
            {isRegister ? 'Sign up to get started' : 'Enter your details to proceed'}
          </Text>

          {isRegister && (
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={20} color={colors.textPrimary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={colors.textPrimary}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={20} color={colors.textPrimary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={colors.textPrimary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textPrimary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textPrimary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {!isRegister && (
            <TouchableOpacity
              style={styles.forgotRow}
              onPress={() => {
                setResetEmail(email);
                setResetStep('request');
                setShowResetModal(true);
              }}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>{isRegister ? 'Sign Up' : 'Log In'}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              {isRegister ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
              <Text style={styles.footerLink}>{isRegister ? 'Log In' : 'Sign Up'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Password Reset Modal */}
      <Modal visible={showResetModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.resetModalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.resetModalCard}>
            <View style={styles.resetModalHeader}>
              <Text style={styles.resetModalTitle}>
                {resetStep === 'request' ? 'Reset Password' : 'Confirm New Password'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowResetModal(false)}
                style={styles.resetCloseBtn}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {resetStep === 'request' ? (
                <>
                  <Text style={styles.resetModalSub}>
                    Enter your registered email address below. We'll send you a password recovery link and secret code.
                  </Text>

                  <View style={styles.inputWrap}>
                    <Ionicons name="mail-outline" size={20} color={colors.textPrimary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Registered Email"
                      placeholderTextColor={colors.textMuted}
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, resetLoading && styles.btnDisabled]}
                    onPress={handleSendResetEmail}
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Send Reset Link</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resetStepSwitchRow}
                    onPress={() => setResetStep('confirm')}
                  >
                    <Text style={styles.resetStepSwitchText}>Already have a reset secret code? Tap here</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.resetModalSub}>
                    Check your email inbox/spam folder for your User ID and Secret Code, then enter them below.
                  </Text>

                  <View style={styles.inputWrap}>
                    <Ionicons name="person-outline" size={20} color={colors.textPrimary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="User ID (from email/account)"
                      placeholderTextColor={colors.textMuted}
                      value={resetUserId}
                      onChangeText={setResetUserId}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputWrap}>
                    <Ionicons name="key-outline" size={20} color={colors.textPrimary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Secret Code (from email link)"
                      placeholderTextColor={colors.textMuted}
                      value={resetSecret}
                      onChangeText={setResetSecret}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={20} color={colors.textPrimary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="New Password (min 8 chars)"
                      placeholderTextColor={colors.textMuted}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, resetLoading && styles.btnDisabled]}
                    onPress={handleConfirmResetPassword}
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Update Password</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resetStepSwitchRow}
                    onPress={() => setResetStep('request')}
                  >
                    <Text style={styles.resetStepSwitchText}>← Request new email reset link</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40, marginTop: 40 },
  logoWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    ...Shadow.md,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: Radius.xl, padding: 24, ...Shadow.lg },
  cardTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: Radius.lg,
    marginBottom: 16, paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, fontSize: 15, color: colors.textPrimary },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: Radius.full,
    height: 52, alignItems: 'center', justifyContent: 'center',
    marginTop: 8, ...Shadow.sm,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, gap: 6 },
  footerText: { fontSize: 14, color: colors.textSecondary },
  footerLink: { fontSize: 14, fontWeight: '700', color: colors.primary },
  forgotRow: { alignItems: 'flex-end', marginBottom: 16 },
  forgotText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  resetModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  resetModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: 24,
    maxHeight: '85%',
    ...Shadow.lg,
  },
  resetModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resetModalTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  resetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetModalSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 18 },
  resetStepSwitchRow: { marginTop: 16, alignItems: 'center', paddingVertical: 8 },
  resetStepSwitchText: { fontSize: 13, fontWeight: '600', color: colors.primary },
});
