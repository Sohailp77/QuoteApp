import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCustomers } from '../../hooks/useCustomers';
import { Customer } from '../../types';
import { Colors, Radius, Shadow } from '../../theme';
import { SearchBar } from '../../components/ui/SearchBar';

export const CustomersScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const { customers, loading, fetch, remove } = useCustomers();
  const [search, setSearch] = useState('');

  useEffect(() => { fetch(); }, []);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const handleDelete = (c: Customer) => {
    Alert.alert(`Delete "${c.name}"?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try { await remove(c.id); }
          catch (err: any) { Alert.alert('Error', err.message); }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => nav.navigate('CustomerForm', {})}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search customers..."
        style={{ marginHorizontal: 20, marginBottom: 14 }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetch} tintColor={Colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-circle-outline" size={52} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{search ? 'No results' : 'No customers yet'}</Text>
            <Text style={styles.emptySub}>
              {search ? 'Try a different search' : 'Tap + to add your first customer'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => nav.navigate('CustomerForm', { customer: item })}
            activeOpacity={0.85}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{item.name}</Text>
              {item.email ? <Text style={styles.customerDetail}>{item.email}</Text> : null}
              {item.phone ? <Text style={styles.customerDetail}>{item.phone}</Text> : null}
              {item.gst_number ? (
                <View style={styles.gstBadge}>
                  <Text style={styles.gstText}>GST: {item.gst_number}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="trash-outline" size={18} color={Colors.statusRejected} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  addBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: 16, marginBottom: 10,
    ...Shadow.sm,
  },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.accent + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: Colors.accent },
  customerName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  customerDetail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  gstBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.primary + '10',
    borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4,
  },
  gstText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  deleteBtn: { padding: 6 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});
