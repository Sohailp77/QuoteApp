import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuotes } from '../../hooks/useQuotes';
import { QuoteCard } from '../../components/QuoteCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { FilterModal, FilterGroup } from '../../components/ui/FilterModal';
import { Radius } from '../../theme';
import { animateLayout } from '../../utils/animation';
import { QuoteStatus } from '../../types';
import { BarcodeScannerModal } from '../../components/BarcodeScannerModal';
import { useAppTheme } from '../../context/ThemeContext';
import { AppBackground } from '../../components/AppBackground';
import { useAppStore } from '../../store/useAppStore';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';

const STATUS_FILTERS: (QuoteStatus | 'All' | 'Expired')[] = ['All', 'Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'];
const DATE_RANGES = ['All', 'Today', 'This Week', 'This Month', 'Custom'] as const;
type DateRange = typeof DATE_RANGES[number];

export const QuotesScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const styles = createStyles(colors, insets);
  const nav = useNavigation<any>();
  const { quotes, loading, fetch, remove } = useQuotes();
  const customers = useAppStore((s) => s.customers);
  
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<QuoteStatus | 'All' | 'Expired'>('All');
  const [dateRange, setDateRange] = useState<DateRange>('All');
  const [activeCustomer, setActiveCustomer] = useState<string>('All');
  
  const [showScanner, setShowScanner] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Custom Date Range State
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());

  const handleSearchChange = (text: string) => {
    animateLayout();
    setSearch(text);
  };

  const handleBarcodeScan = (barcodeData: string) => {
    setShowScanner(false);
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

  const handleResetFilters = () => {
    animateLayout();
    setActiveFilter('All');
    setDateRange('All');
    setActiveCustomer('All');
  };

  const activeFilterCount =
    (activeFilter !== 'All' ? 1 : 0) +
    (dateRange !== 'All' ? 1 : 0) +
    (activeCustomer !== 'All' ? 1 : 0);

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      // Search
      const s = search.toLowerCase();
      const matchesSearch =
        q.client_name.toLowerCase().includes(s) ||
        q.quote_number.toLowerCase().includes(s) ||
        (q.client_phone && q.client_phone.toLowerCase().includes(s));

      // Status Filter
      let matchesFilter = true;
      if (activeFilter !== 'All') {
        if (activeFilter === 'Expired') {
          const isExpired = q.valid_until ? new Date(q.valid_until) < new Date() : false;
          matchesFilter = isExpired;
        } else {
          matchesFilter = q.status === activeFilter;
        }
      }

      // Customer Filter
      const matchesCustomer = activeCustomer === 'All' || q.client_name === activeCustomer;

      // Date Range
      let matchesDate = true;
      const qDate = new Date(q.created_at);
      const now = new Date();

      if (dateRange === 'Today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        matchesDate = qDate >= start;
      } else if (dateRange === 'This Week') {
        const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
        matchesDate = qDate >= firstDay;
      } else if (dateRange === 'This Month') {
        matchesDate = qDate.getMonth() === now.getMonth() && qDate.getFullYear() === now.getFullYear();
      } else if (dateRange === 'Custom') {
        matchesDate = qDate >= fromDate && qDate <= toDate;
      }

      return matchesSearch && matchesFilter && matchesCustomer && matchesDate;
    });
  }, [quotes, search, activeFilter, dateRange, activeCustomer, fromDate, toDate]);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Quote', 'Are you sure you want to delete this quote?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove(id);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const filterGroups: FilterGroup[] = [
    {
      id: 'status',
      title: 'Quote Status',
      options: STATUS_FILTERS.map((s) => ({ id: s, label: s })),
      selectedValue: activeFilter,
      onSelect: (val) => setActiveFilter(val as any),
    },
    {
      id: 'date',
      title: 'Time Period',
      options: DATE_RANGES.map((r) => ({ id: r, label: r })),
      selectedValue: dateRange,
      onSelect: (val) => setDateRange(val as any),
    },
    {
      id: 'customer',
      title: 'Customer',
      options: [{ id: 'All', label: 'All Customers' }, ...customers.map((c) => ({ id: c.name, label: c.name }))],
      selectedValue: activeCustomer,
      onSelect: (val) => setActiveCustomer(val),
    },
  ];

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
          <Text style={styles.title}>Quotes</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => nav.navigate('CreateQuote')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search & Dedicated Filter Control Bar */}
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar
            value={search}
            onChangeText={handleSearchChange}
            placeholder="Search quotes..."
            style={styles.search}
          />
        </View>

        <TouchableOpacity
          style={[styles.filterControlBtn, activeFilterCount > 0 && styles.filterControlBtnActive]}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? '#fff' : colors.primary} />
          {activeFilterCount > 0 && (
            <View style={styles.badgeDot}>
              <Text style={styles.badgeDotText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => setShowScanner(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="barcode-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Active Filter Pills Bar (Shown only when non-default filters applied) */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFiltersBar}>
          <Text style={styles.activeLabel}>Active Filters:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
            {activeFilter !== 'All' && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>{activeFilter}</Text>
              </View>
            )}
            {dateRange !== 'All' && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>{dateRange}</Text>
              </View>
            )}
            {activeCustomer !== 'All' && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>{activeCustomer}</Text>
              </View>
            )}
            <TouchableOpacity onPress={handleResetFilters} style={styles.clearPill}>
              <Ionicons name="close-circle" size={14} color="#E53935" />
              <Text style={styles.clearPillText}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <View style={styles.metaRow}>
        <Text style={styles.resultCount}>
          {filtered.length} quote{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <QuoteCard
            quote={item}
            onPress={() => nav.navigate('QuoteDetail', { quoteId: item.id })}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetch} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {search || activeFilterCount > 0 ? 'No matching quotes' : 'No quotes yet'}
            </Text>
            <Text style={styles.emptySub}>
              {search || activeFilterCount > 0
                ? 'Try adjusting your search terms or filters.'
                : 'Create your first quote to get started.'}
            </Text>
          </View>
        }
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
        title="Scan Quote QR / Barcode"
      />

      {/* Dedicated Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter Quotes"
        groups={filterGroups}
        onReset={handleResetFilters}
        onApply={() => setShowFilterModal(false)}
        customDate={{
          enabled: dateRange === 'Custom',
          startDate: fromDate,
          endDate: toDate,
          onStartDateChange: setFromDate,
          onEndDateChange: setToDate,
        }}
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
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  search: { flex: 1 },
  filterControlBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 14,
  },
  filterControlBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E53935',
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDotText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  scanBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  activeFiltersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  activePill: {
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  clearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: '#E5393515',
  },
  clearPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E53935',
  },
  metaRow: {
    marginBottom: 8,
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  listContent: { paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
