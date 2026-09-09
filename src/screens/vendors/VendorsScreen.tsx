import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVendors } from '../../hooks/useVendors';
import { Vendor } from '../../types';
import { Radius, Shadow } from '../../theme';
import { SearchBar } from '../../components/ui/SearchBar';
import { useAppTheme } from '../../context/ThemeContext';
import { AppBackground } from '../../components/AppBackground';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';

export const VendorsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const styles = createStyles(colors, insets);
  const nav = useNavigation<any>();
  const { vendors, loading, fetch, remove } = useVendors();
  const [search, setSearch] = useState('');

  useEffect(() => { fetch(); }, []);

  const filtered = (vendors || []).filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.email && v.email.toLowerCase().includes(search.toLowerCase())) ||
      (v.phone && v.phone.includes(search))
  );

  const handleDelete = (v: Vendor) => {
    Alert.alert(`Delete "${v.name}"?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try { await remove(v.id); }
          catch (err: any) { Alert.alert('Error', err.message); }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <AppBackground />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {nav.canGoBack() && (
            <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Vendors</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => nav.navigate('VendorForm', {})}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search vendors..."
        style={{ marginHorizontal: 20, marginBottom: 14 }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(v) => v.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabBarHeight }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={52} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>{search ? 'No results' : 'No vendors yet'}</Text>
            <Text style={styles.emptySub}>
              {search ? 'Try a different search' : 'Tap + to add your first vendor'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => nav.navigate('VendorForm', { vendor: item })}
            activeOpacity={0.85}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vendorName}>{item.name}</Text>
              {item.contact_person ? <Text style={styles.vendorDetail}>Contact: {item.contact_person}</Text> : null}
              {item.email || item.phone ? (
                <Text style={styles.vendorDetail}>
                  {[item.phone, item.email].filter(Boolean).join(' • ')}
                </Text>
              ) : null}
              {item.gst_number ? (
                <View style={styles.gstBadge}>
                  <Text style={styles.gstText}>GST: {item.gst_number}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity 
              onPress={() => nav.navigate('VendorForm', { vendor: item })} 
              style={styles.actionBtn} 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => handleDelete(item)} 
              style={styles.actionBtn} 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.statusRejected} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const createStyles = (colors: any, insets?: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Math.max(insets?.top || 0, 24) + 16, paddingBottom: 16, paddingHorizontal: 20,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.surface,
    borderRadius: Radius.lg, padding: 16, marginBottom: 10,
    ...Shadow.sm,
  },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.accent + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: colors.accent },
  vendorName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  vendorDetail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  gstBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.primary + '10',
    borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4,
  },
  gstText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  actionBtn: { padding: 6 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
