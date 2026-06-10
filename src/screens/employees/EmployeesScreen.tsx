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
import { useEmployees } from '../../hooks/useEmployees';
import { useAuthStore } from '../../store/useAuthStore';
import { EmployeeCard } from '../../components/EmployeeCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { Colors } from '../../theme';

export const EmployeesScreen: React.FC = () => {
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
      <View style={styles.header}>
        <Text style={styles.title}>Employees</Text>
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
          <RefreshControl refreshing={loading} onRefresh={fetch} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={52} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No employees yet</Text>
            {isBoss ? (
              <Text style={styles.emptySub}>Tap + to add your first employee</Text>
            ) : (
              <Text style={styles.emptySub}>Ask your owner (Boss) to add team members</Text>
            )}
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  addBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  search: { marginBottom: 14 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 14, color: Colors.textSecondary },
});
