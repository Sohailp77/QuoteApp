import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors, Radius, Shadow } from '../../theme';

export const ProfileScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const storeSignOut = useAuthStore((s) => s.signOut);
  const firstName = user?.displayName?.split(' ')[0] || 'User';

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut(auth);
          storeSignOut();
        },
      },
    ]);
  };

  const menuItems = [
    { icon: 'business-outline', label: 'Company Profile & Bank Info', action: () => nav.navigate('CompanySettings') },
    { icon: 'receipt-outline', label: 'Tax Slabs', action: () => nav.navigate('TaxRates') },
    { icon: 'grid-outline', label: 'Product Categories', action: () => nav.navigate('ProductCategories') },
    { icon: 'information-circle-outline', label: 'About QuoteApp', action: () => {} },
  ];

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
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
          <Ionicons name={user?.role === 'boss' ? 'shield-checkmark-outline' : 'person-circle-outline'} size={16} color={Colors.accent} />
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
                <Ionicons name={item.icon as any} size={20} color={Colors.accent} />
              </View>
              <Text style={styles.menuItemText}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sign out */}
      <View style={styles.signOutSection}>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={Colors.statusRejected} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>QuoteApp v1.0.0</Text>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  hero: { alignItems: 'center', paddingTop: 80, paddingBottom: 32, position: 'relative' },
  heroBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 180,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    opacity: 0.05,
  },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#fff' },
  avatarFallback: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 12 },
  email: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  googleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, backgroundColor: Colors.surface,
    borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6,
    ...Shadow.sm,
  },
  googleBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  menuSection: { paddingHorizontal: 20, marginTop: 8, marginBottom: 16 },
  menuLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 15,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.accent + '12',
    alignItems: 'center', justifyContent: 'center',
  },
  menuItemText: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  signOutSection: { paddingHorizontal: 20, marginBottom: 12 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: Colors.statusRejected + '12',
    borderRadius: Radius.full, paddingVertical: 16,
    borderWidth: 1.5, borderColor: Colors.statusRejected + '30',
  },
  signOutText: { fontSize: 16, fontWeight: '700', color: Colors.statusRejected },
  version: { textAlign: 'center', fontSize: 12, color: Colors.textMuted },
});
