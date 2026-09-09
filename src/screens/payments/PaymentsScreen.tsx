import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuotes } from '../../hooks/useQuotes';
import { useReorders } from '../../hooks/useReorders';
import { useDirectSales } from '../../hooks/useDirectSales';
import { useAppTheme } from '../../context/ThemeContext';
import { AppBackground } from '../../components/AppBackground';
import { Radius, Shadow } from '../../theme';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import { FilterModal, FilterGroup } from '../../components/ui/FilterModal';

const DATE_RANGES = ['All', 'This Week', 'This Month', 'This Year'] as const;
type DateRange = typeof DATE_RANGES[number];

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PaymentsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const styles = createStyles(colors, insets);
  const nav = useNavigation();
  const { quotes, fetch: fetchQuotes } = useQuotes();
  const { reorders, fetch: fetchReorders } = useReorders();
  const { directSales, fetch: fetchDirectSales } = useDirectSales();

  const [activeTab, setActiveTab] = useState<'Credits' | 'Debits'>('Credits');
  const [dateRange, setDateRange] = useState<DateRange>('All');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const filterGroups: FilterGroup[] = [
    {
      id: 'dateRange',
      title: 'Time Period',
      options: DATE_RANGES.map((r) => ({ id: r, label: r === 'All' ? 'All Time' : r })),
      selectedValue: dateRange,
      onSelect: (val) => setDateRange(val as DateRange),
    },
  ];

  useEffect(() => {
    fetchQuotes();
    fetchReorders();
    fetchDirectSales();
  }, []);

  const filterByDate = (dateStr: string) => {
    if (dateRange === 'All') return true;
    const d = new Date(dateStr);
    const now = new Date();
    if (dateRange === 'This Week') {
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
      return d >= firstDay;
    }
    if (dateRange === 'This Month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (dateRange === 'This Year') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const credits = useMemo(() => {
    const quoteCredits = quotes
      .filter((q) => (q.payment_status === 'Paid' || q.payment_status === 'Partial') && filterByDate(q.created_at))
      .map((q) => ({
        id: q.id,
        title: q.quote_number,
        subtitle: q.client_name,
        type: 'Quote' as const,
        payment_status: q.payment_status || 'Paid',
        payment_method: q.payment_method || 'N/A',
        total: q.total,
        created_at: q.created_at,
      }));

    const salesCredits = directSales
      .filter((ds) => (ds.payment_status === 'Paid' || ds.payment_status === 'Partial') && filterByDate(ds.created_at))
      .map((ds) => ({
        id: ds.id,
        title: ds.sale_number || 'Direct Sale',
        subtitle: ds.customer_name ? `${ds.customer_name} (Direct Sale)` : 'Counter Sale (Direct Sale)',
        type: 'Direct Sale' as const,
        payment_status: ds.payment_status || 'Paid',
        payment_method: ds.payment_method || 'Cash',
        total: ds.total,
        created_at: ds.created_at,
      }));

    return [...quoteCredits, ...salesCredits].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [quotes, directSales, dateRange]);

  const debits = useMemo(() => {
    return reorders
      .filter((r) => (r.total_paid || 0) > 0 && filterByDate(r.created_at))
      .map((r) => ({
        id: r.id,
        title: r.order_number ? `#${r.order_number}` : 'PO',
        subtitle: r.vendor_name || 'Vendor Reorder',
        type: 'Reorder' as const,
        total: r.total_paid || 0,
        created_at: r.created_at,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [reorders, dateRange]);

  const totalCredits = credits.reduce((sum, item) => sum + (item.total || 0), 0);
  const totalDebits = debits.reduce((sum, item) => sum + (item.total || 0), 0);
  const netBalance = totalCredits - totalDebits;

  const renderCredit = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={[styles.typeBadge, { backgroundColor: item.type === 'Direct Sale' ? colors.primary + '15' : colors.accent + '15' }]}>
            <Text style={[styles.typeBadgeText, { color: item.type === 'Direct Sale' ? colors.primary : colors.accent }]}>
              {item.type}
            </Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: item.payment_status === 'Paid' ? '#E6F4EA' : '#FEF7E0' }]}>
          <Text style={[styles.badgeText, { color: item.payment_status === 'Paid' ? '#1E8E3E' : '#B06000' }]}>
            {item.payment_status}
          </Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>
          {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {item.payment_method}
        </Text>
        <Text style={styles.cardAmount}>{formatCurrency(item.total)}</Text>
      </View>
    </View>
  );

  const renderDebit = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
      </View>
      <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>
          {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
        <Text style={styles.cardAmount}>{formatCurrency(item.total)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <AppBackground />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Payments</Text>
        <TouchableOpacity
          style={[styles.filterControlBtn, dateRange !== 'All' && styles.filterControlBtnActive]}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={20} color={dateRange !== 'All' ? '#fff' : colors.primary} />
          {dateRange !== 'All' && (
            <View style={styles.badgeDot}>
              <Text style={styles.badgeDotText}>1</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Credits</Text>
          <Text style={[styles.summaryValue, { color: '#2BAE78' }]} numberOfLines={1}>
            {formatCurrency(totalCredits)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Debits</Text>
          <Text style={[styles.summaryValue, { color: '#E53935' }]} numberOfLines={1}>
            {formatCurrency(totalDebits)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Net</Text>
          <Text style={[styles.summaryValue, { color: netBalance >= 0 ? '#2BAE78' : '#E53935' }]} numberOfLines={1}>
            {formatCurrency(netBalance)}
          </Text>
        </View>
      </View>

      {/* Active Filter Pills Bar */}
      {dateRange !== 'All' && (
        <View style={styles.activeFiltersBar}>
          <Text style={styles.activeLabel}>Active Filter:</Text>
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>{dateRange}</Text>
          </View>
          <TouchableOpacity onPress={() => setDateRange('All')} style={styles.clearPill}>
            <Ionicons name="close-circle" size={14} color="#E53935" />
            <Text style={styles.clearPillText}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Credits' && styles.tabActive]}
          onPress={() => setActiveTab('Credits')}
        >
          <Text style={[styles.tabText, activeTab === 'Credits' && styles.tabTextActive]}>
            Credits ({credits.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Debits' && styles.tabActive]}
          onPress={() => setActiveTab('Debits')}
        >
          <Text style={[styles.tabText, activeTab === 'Debits' && styles.tabTextActive]}>
            Debits ({debits.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === 'Credits' ? credits : debits}
        keyExtractor={(item) => item.id}
        renderItem={activeTab === 'Credits' ? renderCredit : renderDebit}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No {activeTab.toLowerCase()} found</Text>
          </View>
        }
      />

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        groups={filterGroups}
        onReset={() => setDateRange('All')}
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
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  summaryContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: Radius.md,
    ...Shadow.sm,
  },
  summaryLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  filterControlBtn: {
    width: 40,
    height: 40,
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.primary },
  listContent: { padding: 20, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 12,
    ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
  badgeText: { fontSize: 11, fontWeight: '600' },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  cardSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 12, color: colors.textMuted },
  cardAmount: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 16, color: colors.textSecondary },
});
