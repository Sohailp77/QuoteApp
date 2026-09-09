import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDirectSales } from '../../hooks/useDirectSales';
import { useAppTheme } from '../../context/ThemeContext';
import { AppBackground } from '../../components/AppBackground';
import { SearchBar } from '../../components/ui/SearchBar';
import { Radius, Shadow } from '../../theme';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import { FilterModal, FilterGroup } from '../../components/ui/FilterModal';
import { animateLayout } from '../../utils/animation';

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const DirectSalesScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const styles = createStyles(colors, insets);
  const nav = useNavigation<any>();
  const { directSales, fetch, loading, remove } = useDirectSales();
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'All' | 'Paid' | 'Pending' | 'Partial'>('All');
  const [dateRange, setDateRange] = useState<'All' | 'Today' | 'This Week' | 'This Month'>('All');
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    fetch();
  }, []);

  const handleResetFilters = () => {
    animateLayout();
    setPaymentStatus('All');
    setDateRange('All');
  };

  const activeFilterCount = (paymentStatus !== 'All' ? 1 : 0) + (dateRange !== 'All' ? 1 : 0);

  const filtered = useMemo(() => {
    return directSales.filter((s) => {
      const matchSearch =
        s.sale_number.toLowerCase().includes(search.toLowerCase()) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = paymentStatus === 'All' || s.payment_status === paymentStatus;

      let matchDate = true;
      const d = new Date(s.created_at);
      const now = new Date();
      if (dateRange === 'Today') {
        matchDate = d.toDateString() === now.toDateString();
      } else if (dateRange === 'This Week') {
        const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
        matchDate = d >= firstDay;
      } else if (dateRange === 'This Month') {
        matchDate = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }

      return matchSearch && matchStatus && matchDate;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [directSales, search, paymentStatus, dateRange]);

  const todayTotal = useMemo(() => {
    const today = new Date().toDateString();
    return directSales
      .filter((s) => new Date(s.created_at).toDateString() === today)
      .reduce((sum, s) => sum + s.total, 0);
  }, [directSales]);

  const monthTotal = useMemo(() => {
    const now = new Date();
    return directSales
      .filter((s) => {
        const d = new Date(s.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, s) => sum + s.total, 0);
  }, [directSales]);

  const filterGroups: FilterGroup[] = [
    {
      id: 'status',
      title: 'Payment Status',
      options: [
        { id: 'All', label: 'All Statuses' },
        { id: 'Paid', label: 'Paid' },
        { id: 'Pending', label: 'Pending' },
        { id: 'Partial', label: 'Partial' },
      ],
      selectedValue: paymentStatus,
      onSelect: (val) => setPaymentStatus(val as any),
    },
    {
      id: 'date',
      title: 'Time Period',
      options: [
        { id: 'All', label: 'All Time' },
        { id: 'Today', label: 'Today' },
        { id: 'This Week', label: 'This Week' },
        { id: 'This Month', label: 'This Month' },
      ],
      selectedValue: dateRange,
      onSelect: (val) => setDateRange(val as any),
    },
  ];

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.sale_number}</Text>
        <View style={[styles.badge, { backgroundColor: item.payment_status === 'Paid' ? '#E6F4EA' : '#FEF7E0' }]}>
          <Text style={[styles.badgeText, { color: item.payment_status === 'Paid' ? '#1E8E3E' : '#B06000' }]}>
            {item.payment_status}
          </Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>{item.customer_name || 'Walk-in Customer'}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        <View style={styles.actionsRow}>
          <Text style={styles.cardAmount}>{formatCurrency(item.total)}</Text>
          <TouchableOpacity onPress={() => remove(item.id)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color="#E53935" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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
          <Text style={styles.title}>Direct Sales</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => nav.navigate('CreateDirectSale')}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Today's Sales</Text>
          <Text style={styles.summaryValue}>{formatCurrency(todayTotal)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Month's Sales</Text>
          <Text style={styles.summaryValue}>{formatCurrency(monthTotal)}</Text>
        </View>
      </View>

      {/* Search & Filter Control Row */}
      <View style={styles.searchContainer}>
        <View style={{ flex: 1 }}>
          <SearchBar
            value={search}
            onChangeText={(text) => {
              animateLayout();
              setSearch(text);
            }}
            placeholder="Search sales..."
            style={{ marginBottom: 0 }}
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
      </View>

      {/* Active Filter Pills Bar */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFiltersBar}>
          <Text style={styles.activeLabel}>Active Filters:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
            {paymentStatus !== 'All' && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>{paymentStatus}</Text>
              </View>
            )}
            {dateRange !== 'All' && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>{dateRange}</Text>
              </View>
            )}
            <TouchableOpacity onPress={handleResetFilters} style={styles.clearPill}>
              <Ionicons name="close-circle" size={14} color="#E53935" />
              <Text style={styles.clearPillText}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No direct sales found</Text>
          </View>
        }
      />

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        groups={filterGroups}
        onReset={handleResetFilters}
        onApply={() => setShowFilterModal(false)}
      />
    </View>
  );
};

const createStyles = (colors: any, insets?: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Math.max(insets?.top || 0, 24) + 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: Radius.md,
    ...Shadow.md,
  },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '700', color: '#fff' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
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
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeDotText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  activeFiltersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  activePill: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  activePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  clearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E53935',
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 12,
    ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 12, color: colors.textMuted },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardAmount: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  deleteBtn: { padding: 4 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 16, color: colors.textSecondary },
});
