import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { makeRedirectUri } from 'expo-auth-session';
import { auth } from '../../config/firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors, Radius, Shadow, Spacing } from '../../theme';

WebBrowser.maybeCompleteAuthSession();

// Google Client IDs for standalone / web (optional)
const GOOGLE_WEB_CLIENT_ID = '964700686123-jclf9h1kb9d8c64fsm0q1eoih7s10nos.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = '964700686123-f08i0c96g7t6r3g91a54tmd6j83d702t.apps.googleusercontent.com';

export const LoginScreen: React.FC = () => {
  const setUser = useAuthStore((s) => s.setUser);
  
  // Form state
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google OAuth configuration
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    redirectUri: makeRedirectUri({ scheme: 'quoteapp' }),
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleToken(id_token);
    } else if (response?.type === 'error') {
      setGoogleLoading(false);
      Alert.alert('Google Sign-in Error', response.error?.message || 'Google sign-in failed.');
    } else if (response?.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleToken = async (idToken: string) => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const { uid, email: userEmail, displayName: name, photoURL } = result.user;
      setUser({
        id: uid,
        email: userEmail || '',
        displayName: name || 'User',
        photoURL: photoURL || undefined,
        role: 'boss',
        tenant_id: `tenant_${uid}`,
      });
    } catch (err: any) {
      Alert.alert('Sign-in Failed', err.message || 'Could not sign in with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    await promptAsync();
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
    try {
      if (isRegister) {
        // Create user
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        // Set display name
        await updateProfile(result.user, { displayName: displayName.trim() });
        
        setUser({
          id: result.user.uid,
          email: result.user.email || '',
          displayName: displayName.trim(),
          role: 'boss',
          tenant_id: `tenant_${result.user.uid}`,
        });
      } else {
        // Sign in user
        const result = await signInWithEmailAndPassword(auth, email.trim(), password);
        setUser({
          id: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || 'User',
          photoURL: result.user.photoURL || undefined,
          role: 'boss',
          tenant_id: `tenant_${result.user.uid}`,
        });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Authentication failed. Please try again.';
      Alert.alert(isRegister ? 'Registration Failed' : 'Sign-in Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {/* Decorative Background Circles */}
          <View style={styles.topDecor} />
          <View style={styles.topDecor2} />

          {/* Logo & Header */}
          <View style={styles.logoArea}>
            <View style={styles.logoBox}>
              <Text style={styles.logoIcon}>Q</Text>
            </View>
            <Text style={styles.appName}>QuoteApp</Text>
            <Text style={styles.tagline}>Smart Quoting. Faster Deals.</Text>
          </View>

          {/* Selector Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, !isRegister && styles.activeTab]}
              onPress={() => setIsRegister(false)}
            >
              <Text style={[styles.tabText, !isRegister && styles.activeTabText]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, isRegister && styles.activeTab]}
              onPress={() => setIsRegister(true)}
            >
              <Text style={[styles.tabText, isRegister && styles.activeTabText]}>Register</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            {isRegister && (
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  placeholder="Full Name"
                  placeholderTextColor={Colors.textMuted}
                  value={displayName}
                  onChangeText={setDisplayName}
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                placeholder="Email Address"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                placeholder="Password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Email login button */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleEmailAuth}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {isRegister ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle Link */}
            <TouchableOpacity
              onPress={() => setIsRegister(!isRegister)}
              style={styles.toggleLinkContainer}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleLinkText}>
                {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={styles.toggleLinkHighlight}>
                  {isRegister ? 'Sign In' : 'Register'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In button */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={[styles.googleBtn, (googleLoading || !request) && styles.btnDisabled]}
              onPress={handleGoogleSignIn}
              disabled={googleLoading || !request}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator color={Colors.textPrimary} />
              ) : (
                <>
                  <View style={styles.googleIconWrap}>
                    <Text style={styles.googleLetter}>G</Text>
                  </View>
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.terms}>
              By continuing, you agree to our{' '}
              <Text style={styles.link}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  topDecor: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.primary,
    opacity: 0.05,
  },
  topDecor2: {
    position: 'absolute',
    top: -40,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.accent,
    opacity: 0.06,
  },
  logoArea: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 36,
    gap: 10,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoIcon: { fontSize: 32, fontWeight: '800', color: '#fff' },
  appName: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -1 },
  tagline: { fontSize: 13, color: Colors.textSecondary },
  
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.divider,
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: Radius.md - 2,
  },
  activeTab: {
    backgroundColor: Colors.surface,
    ...Shadow.sm,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.textPrimary,
  },

  // Form Card
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 16,
    ...Shadow.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: Colors.textPrimary,
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    ...Shadow.sm,
  },
  primaryBtnText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },

  // Bottom section
  bottomSection: { gap: 16 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingVertical: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  btnDisabled: { opacity: 0.6 },
  googleIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLetter: { color: '#fff', fontWeight: '800', fontSize: 13 },
  googleBtnText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  terms: { textAlign: 'center', fontSize: 11, color: Colors.textMuted, lineHeight: 16, marginTop: 4 },
  link: { color: Colors.accent, fontWeight: '600' },
  toggleLinkContainer: {
    alignItems: 'center',
    paddingVertical: 4,
    marginTop: 4,
  },
  toggleLinkText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  toggleLinkHighlight: {
    color: Colors.accent,
    fontWeight: '700',
  },
});
