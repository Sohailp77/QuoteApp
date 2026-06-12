import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { account, ID, tablesDB, DATABASE_ID, COLLECTIONS, Query } from '../../config/appwrite';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors, Radius, Shadow, Spacing } from '../../theme';

export const LoginScreen: React.FC = () => {
  const setUser = useAuthStore((s) => s.setUser);
  
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

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
        // Appwrite Registration
        await account.create(ID.unique(), email.trim(), password, displayName.trim());
        // Login after register
        await account.createEmailPasswordSession(email.trim(), password);
      } else {
        // Appwrite Login
        await account.createEmailPasswordSession(email.trim(), password);
      }

      const appwriteUser = await account.get();
      let resolvedRole: 'boss' | 'employee' = 'boss';
      let resolvedTenantId = `tenant_${appwriteUser.$id}`;

      // Fetch user profile from `users` collection to get role & tenant_id
      try {
        const userDocs = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: COLLECTIONS.USERS,
          queries: [Query.equal('email', appwriteUser.email)]
        });

        if (userDocs.rows.length > 0) {
          const uDoc = userDocs.rows[0];
          resolvedRole = (uDoc.role as 'boss' | 'employee') || 'boss';
          resolvedTenantId = uDoc.tenant_id;
        } else {
          // If no user doc, check if they are an employee created by a boss
          const empDocs = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.EMPLOYEES,
            queries: [Query.equal('email', appwriteUser.email.toLowerCase().trim())]
          });

          if (empDocs.rows.length > 0) {
            const emp = empDocs.rows[0];
            resolvedRole = 'employee';
            resolvedTenantId = emp.tenant_id;
            
            // Link employee record
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

          // Create the user profile
          await tablesDB.createRow({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.USERS,
            rowId: ID.unique(),
            data: {
              tenant_id: resolvedTenantId,
              email: appwriteUser.email,
              displayName: appwriteUser.name || displayName.trim() || 'User',
              role: resolvedRole,
            }
          });
        }
      } catch (err) {
        console.error('Error fetching/creating user profile on login:', err);
      }

      setUser({
        id: appwriteUser.$id,
        email: appwriteUser.email,
        displayName: appwriteUser.name || displayName.trim() || 'User',
        role: resolvedRole,
        tenant_id: resolvedTenantId,
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
              <Ionicons name="person-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={Colors.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40, marginTop: 40 },
  logoWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    ...Shadow.md,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 24, ...Shadow.lg },
  cardTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg,
    marginBottom: 16, paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, fontSize: 15, color: Colors.textPrimary },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    height: 52, alignItems: 'center', justifyContent: 'center',
    marginTop: 8, ...Shadow.sm,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, gap: 6 },
  footerText: { fontSize: 14, color: Colors.textSecondary },
  footerLink: { fontSize: 14, fontWeight: '700', color: Colors.accent },
});
