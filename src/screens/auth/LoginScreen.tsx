import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { account, ID, tablesDB, DATABASE_ID, COLLECTIONS, Query, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from '../../config/appwrite';
import { useAuthStore } from '../../store/useAuthStore';
import { Radius, Shadow } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { AppBackground } from '../../components/AppBackground';

WebBrowser.maybeCompleteAuthSession();

export const LoginScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const styles = createStyles(colors, isDark);
  const setUser = useAuthStore((s) => s.setUser);

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Field focus refs
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

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

  /**
   * Universal resolution logic for Boss & Employee user roles and multi-tenant setup
   */
  const resolveUserRoleAndLogin = async (appwriteUser: any, fallbackName?: string) => {
    const userEmail = appwriteUser.email.toLowerCase();

    // 1. Check existing USERS database record
    const userDocs = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: COLLECTIONS.USERS,
      queries: [Query.equal('email', userEmail)]
    });

    let resolvedTenantId = `tenant_${appwriteUser.$id}`;
    let resolvedRole: 'boss' | 'employee' = 'boss';
    let resolvedStatus = 'active';

    if (userDocs.rows.length > 0) {
      const uDoc = userDocs.rows[0];
      resolvedTenantId = uDoc.tenant_id;
      resolvedRole = uDoc.role || 'boss';
      resolvedStatus = uDoc.status || 'active';
    }

    // 2. Employee table lookup by email
    // If the boss created an employee record for this email, link them automatically!
    const empDocs = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: COLLECTIONS.EMPLOYEES,
      queries: [Query.equal('email', userEmail)]
    });

    if (empDocs.rows.length > 0) {
      const emp = empDocs.rows[0];
      resolvedRole = 'employee';
      resolvedTenantId = emp.tenant_id;
      resolvedStatus = 'active';

      // Link Appwrite User ID to Employee row if not linked
      if (!emp.user_id) {
        try {
          await tablesDB.updateRow({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.EMPLOYEES,
            rowId: emp.$id,
            data: { user_id: appwriteUser.$id }
          });
        } catch (e) {
          console.log('Employee link note:', e);
        }
      }
    }

    // 3. Create user profile document in USERS collection if missing
    if (userDocs.rows.length === 0) {
      await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.USERS,
        rowId: ID.unique(),
        data: {
          tenant_id: resolvedTenantId,
          email: userEmail,
          displayName: appwriteUser.name || fallbackName || 'User',
          role: resolvedRole,
          status: resolvedStatus,
        }
      });
    }

    // 4. Block inactive accounts
    if (resolvedStatus === 'inactive') {
      try {
        await account.deleteSession('current');
      } catch (sErr) {}

      Alert.alert(
        'Account Pending Approval',
        'Your account has been registered, but is awaiting administrator authorization.',
        [{ text: 'OK' }]
      );
      return;
    }

    // 5. Save to global state store
    setUser({
      id: appwriteUser.$id,
      email: appwriteUser.email,
      displayName: appwriteUser.name || fallbackName || 'User',
      role: resolvedRole,
      tenant_id: resolvedTenantId,
      status: resolvedStatus,
    });
  };

  const handleEmailAuth = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedName = displayName.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Required Fields', 'Please enter your email address and password.');
      return;
    }

    if (isRegister && !trimmedName) {
      Alert.alert('Missing Name', 'Please enter your full name to complete registration.');
      return;
    }

    if (trimmedPassword.length < 6) {
      Alert.alert('Short Password', 'Password should be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      let appwriteUser: any = null;

      if (isRegister) {
        appwriteUser = await account.create(
          ID.unique(),
          trimmedEmail,
          trimmedPassword,
          trimmedName
        );
        await account.createEmailPasswordSession(trimmedEmail, trimmedPassword);
      } else {
        try {
          await account.createEmailPasswordSession(trimmedEmail, trimmedPassword);
        } catch (sessErr) {
          console.log('Session note:', sessErr);
        }
        appwriteUser = await account.get();
      }

      await resolveUserRoleAndLogin(appwriteUser, trimmedName);
    } catch (err: any) {
      Alert.alert('Authentication Failed', err.message || 'Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const redirectUrl = Platform.OS === 'android' ? 'bizflow://' : 'bizflow://';
      const authUrl = `${APPWRITE_ENDPOINT}/account/sessions/oauth2/google?project=${APPWRITE_PROJECT_ID}&success=${encodeURIComponent(redirectUrl)}&failure=${encodeURIComponent(redirectUrl)}`;

      const res = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (res.type === 'success') {
        const appwriteUser = await account.get();
        await resolveUserRoleAndLogin(appwriteUser);
      }
    } catch (err: any) {
      console.log('Google auth note:', err);
      Alert.alert('Google Sign-In', err.message || 'Unable to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AppBackground />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.largeTitle}>{isRegister ? 'Create\nAccount' : 'Welcome\nBack'}</Text>
          <Text style={styles.headerSubtitle}>
            {isRegister ? 'Sign up to create & manage business quotes' : 'Sign in to access your business dashboard'}
          </Text>
        </View>

        <View style={styles.formCard}>
          {/* Registration Full Name */}
          {isRegister && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <View style={styles.inputBox}>
                <Ionicons name="person-outline" size={18} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.textMuted}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailInputRef.current?.focus()}
                />
              </View>
            </View>
          )}

          {/* Email Address */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={18} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                ref={emailInputRef}
                style={styles.input}
                placeholder="name@company.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>Password</Text>
              {!isRegister && (
                <TouchableOpacity
                  onPress={() => {
                    setResetEmail(email);
                    setResetStep('request');
                    setShowResetModal(true);
                  }}
                >
                  <Text style={styles.forgotInlineText}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleEmailAuth}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Primary Action Button */}
          <TouchableOpacity
            style={[styles.mainSubmitBtn, loading && styles.btnDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.mainSubmitBtnText}>
                  {isRegister ? 'Create Account' : 'Sign In with Email'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Continue with Google */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleAuth}
            activeOpacity={0.85}
          >
            <View style={styles.googleIconBadge}>
              <Ionicons name="logo-google" size={18} color="#34A853" />
            </View>
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Footer Navigation Link */}
          <View style={styles.bottomLinksWrap}>
            <TouchableOpacity onPress={() => setIsRegister(!isRegister)} activeOpacity={0.7}>
              <Text style={styles.switchAuthPrompt}>
                {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={styles.switchAuthHighlight}>
                  {isRegister ? 'Sign In' : 'Sign Up'}
                </Text>
              </Text>
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
                    Enter your registered email address to receive password recovery instructions, or sign in directly with Google.
                  </Text>

                  <View style={styles.inputWrap}>
                    <Ionicons name="mail-outline" size={18} color={colors.primary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email Address"
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

                  <View style={[styles.dividerRow, { marginTop: 18, marginBottom: 16 }]}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR RECOVER WITH</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={styles.googleBtn}
                    onPress={() => {
                      setShowResetModal(false);
                      handleGoogleAuth();
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.googleIconBadge}>
                      <Ionicons name="logo-google" size={18} color="#34A853" />
                    </View>
                    <Text style={styles.googleBtnText}>Instant Sign-In with Google</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.resetModalSub}>
                    Check your email inbox for your User ID and Secret Code, then enter them below.
                  </Text>

                  <View style={styles.inputWrap}>
                    <Ionicons name="person-outline" size={18} color={colors.primary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="User ID"
                      placeholderTextColor={colors.textMuted}
                      value={resetUserId}
                      onChangeText={setResetUserId}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputWrap}>
                    <Ionicons name="key-outline" size={18} color={colors.primary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Secret Code"
                      placeholderTextColor={colors.textMuted}
                      value={resetSecret}
                      onChangeText={setResetSecret}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.primary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="New Password"
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
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: any, isDark?: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  scrollContent: { flexGrow: 1, paddingHorizontal: 28, justifyContent: 'center', paddingVertical: 40 },
  header: { marginBottom: 28, marginTop: 36 },
  largeTitle: { fontSize: 36, fontWeight: '800', color: isDark ? '#FFFFFF' : colors.primary, lineHeight: 44, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: isDark ? colors.textSecondary : colors.textSecondary, marginTop: 6, fontWeight: '500' },

  formCard: { width: '100%' },

  fieldGroup: { marginBottom: 16 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? colors.surfaceAlt : '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: isDark ? colors.primary + '40' : colors.border,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 16,
    ...Shadow.xs,
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  forgotInlineText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? colors.surfaceAlt : '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: isDark ? colors.primary + '40' : colors.border,
    paddingHorizontal: 14,
    height: 50,
    ...Shadow.xs,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 48, fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
  eyeBtn: { padding: 6 },

  mainSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: Radius.full,
    marginTop: 8,
    marginBottom: 20,
    ...Shadow.md,
  },
  mainSubmitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  btnDisabled: { opacity: 0.7 },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: isDark ? colors.primary + '30' : colors.border },
  dividerText: { marginHorizontal: 16, fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },

  // Google Button
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: isDark ? colors.surfaceAlt : '#FFFFFF',
    height: 52,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: isDark ? colors.primary + '50' : colors.border,
    marginBottom: 24,
    ...Shadow.sm,
  },
  googleIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: isDark ? colors.background : '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDark ? colors.border : '#E8EAED',
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },

  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: Radius.full,
    height: 50, alignItems: 'center', justifyContent: 'center',
    marginTop: 16, ...Shadow.sm,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  bottomLinksWrap: { alignItems: 'center', marginTop: 4 },
  switchAuthPrompt: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  switchAuthHighlight: { fontWeight: '800', color: colors.primary },

  resetModalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  resetModalCard: {
    backgroundColor: colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: 24, maxHeight: '85%', ...Shadow.lg,
  },
  resetModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  resetModalTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  resetModalSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  resetCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
});
