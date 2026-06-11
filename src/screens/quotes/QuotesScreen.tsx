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
import { useQuotes } from '../../hooks/useQuotes';
import { QuoteCard } from '../../components/QuoteCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { Colors, Radius } from '../../theme';
import { QuoteStatus } from '../../types';
import { BarcodeScannerModal } from '../../components/BarcodeScannerModal';

const STATUS_FILTERS: (QuoteStatus | 'All')[] = ['All', 'Draft', 'Sent', 'Accepted', 'Rejected'];

export const QuotesScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const { quotes, loading, fetch, remove } = useQuotes();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<QuoteStatus | 'All'>('All');
  const [showScanner, setShowScanner] = useState(false);

  const handleBarcodeScan = (barcodeData: string) => {
    setShowScanner(false);
    // Find quote by quote number
    const matched = quotes.find(
      (q) => q.quote_number.toLowerCase().trim() === barcodeData.toLowerCase().trim()
    );

    if (matched) {
      nav.navigate('QuoteDetail', { quoteId: matched.id });
    } else {
      Alert.alert('Not Found', `Quote with number "${barcodeData}" not found.`);
    }
  };

  useEffect(() => { fetch(); }, []);

  const filtered = quotes.filter((q) => {
    const matchesSearch =
      q.client_name.toLowerCase().includes(search.toLowerCase()) ||
      q.quote_number.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === 'All' || q.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = (id: string) => {
    Alert.alert('Delete Quote', 'Are you sure you want to delete this quote?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => remove(id),
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Quotes</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => nav.navigate('CreateQuote')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search quotes..."
            style={styles.search}
          />
        </View>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => setShowScanner(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="barcode-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, activeFilter === f && styles.chipActive]}
            onPress={() => setActiveFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <QuoteCard
            quote={item}
            onPress={() => nav.navigate('QuoteDetail', { quoteId: item.id })}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetch} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={52} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No quotes found</Text>
            <Text style={styles.emptySub}>
              {search ? 'Try a different search term' : 'Tap + to create your first quote'}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
        title="Scan Quote Barcode"
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  search: { flex: 1 },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 16,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});
