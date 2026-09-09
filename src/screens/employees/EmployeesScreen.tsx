import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEmployees } from '../../hooks/useEmployees';
import { useAuthStore } from '../../store/useAuthStore';
import { EmployeeCard } from '../../components/EmployeeCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { useAppTheme } from '../../context/ThemeContext';
import { AppBackground } from '../../components/AppBackground';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';


export const EmployeesScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const styles = createStyles(colors, insets);
  const nav = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const { employees, loading, fetch, remove } = useEmployees();
  const [search, setSearch] = useState('');

  const isBoss = user?.role === 'boss';

  useEffect(() => { fetch(); }, []);

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string, name: string) => {
    if (!isBoss) return;
    Alert.alert(`Remove ${name}?`, 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove(id) },
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
          <View>
            <Text style={styles.title}>Team</Text>
            <Text style={styles.subtitle}>Employees</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.crmBtn}
            onPress={() => nav.navigate('CustomersList')}
            activeOpacity={0.8}
          >
            <Ionicons name="people-circle-outline" size={16} color={colors.accent} />
            <Text style={styles.crmBtnText}>Customers</Text>
          </TouchableOpacity>
          {isBoss && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => nav.navigate('EmployeeForm', {})}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search employees..."
        style={styles.search}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EmployeeCard
            employee={item}
            onPress={() => nav.navigate('EmployeeForm', { employee: item })}
            onDelete={() => handleDelete(item.id, item.name)}
            showDelete={isBoss}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetch} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={52} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No employees yet</Text>
            {isBoss ? (
              <Text style={styles.emptySub}>Tap + to add your first employee</Text>
            ) : (
              <Text style={styles.emptySub}>Ask your owner (Boss) to add team members</Text>
            )}
          </View>
        }
        contentContainerStyle={{ paddingBottom: tabBarHeight }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const createStyles = (colors: any, insets?: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Math.max(insets?.top || 0, 24) + 16,
    paddingBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  addBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  crmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.accent + '15',
    borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  crmBtnText: { fontSize: 12, fontWeight: '700', color: colors.accent },
  search: { marginBottom: 14 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptySub: { fontSize: 14, color: colors.textSecondary },
});
