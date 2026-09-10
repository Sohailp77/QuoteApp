import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuotes } from '../../hooks/useQuotes';
import { useReorders } from '../../hooks/useReorders';
import { useDirectSales } from '../../hooks/useDirectSales';
import { useEmployees } from '../../hooks/useEmployees';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../context/ThemeContext';
import { AppBackground } from '../../components/AppBackground';
import { Radius, Shadow } from '../../theme';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import { FilterModal, FilterGroup } from '../../components/ui/FilterModal';
import { TooltipText } from '../../components/ui/TooltipText';

const DATE_RANGES = ['All', 'This Week', 'This Month', 'This Year'] as const;
type DateRange = typeof DATE_RANGES[number];

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PaymentsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const styles = createStyles(colors, insets);
  const nav = useNavigation<any>();
  const currentUser = useAuthStore((s) => s.user);
  const { quotes, fetch: fetchQuotes } = useQuotes();
  const { reorders, fetch: fetchReorders } = useReorders();
  const { directSales, fetch: fetchDirectSales } = useDirectSales();
  const { employees, fetch: fetchEmployees } = useEmployees();

  const [activeTab, setActiveTab] = useState<'Credits' | 'Debits'>('Credits');
  const [dateRange, setDateRange] = useState<DateRange>('All');
  const [creditStatusFilter, setCreditStatusFilter] = useState<'All' | 'Paid' | 'Pending' | 'Partial'>('All');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  useEffect(() => {
    fetchQuotes();
    fetchReorders();
    fetchDirectSales();
    fetchEmployees();
  }, []);

  const filterGroups: FilterGroup[] = [
    {
      id: 'dateRange',
      title: 'Time Period',
      options: DATE_RANGES.map((r) => ({ id: r, label: r === 'All' ? 'All Time' : r })),
      selectedValue: dateRange,
      onSelect: (val) => setDateRange(val as DateRange),
    },
    {
      id: 'creditStatus',
      title: 'Credit Payment Status',
      options: [
        { id: 'All', label: 'All Statuses' },
        { id: 'Paid', label: 'Paid' },
        { id: 'Pending', label: 'Pending / Uncollected' },
        { id: 'Partial', label: 'Partial' },
      ],
      selectedValue: creditStatusFilter,
      onSelect: (val) => setCreditStatusFilter(val as any),
    },
  ];

  const getCreatorName = (userId?: string, fallbackName?: string, fallbackRole?: string) => {
    if (fallbackName && fallbackName.trim()) {
      return { name: fallbackName, role: fallbackRole || 'Staff' };
    }
    if (currentUser && (userId === currentUser.id || userId === `tenant_${currentUser.id}`)) {
      return {
        name: currentUser.displayName || 'You',
        role: currentUser.role === 'boss' ? 'Business Owner' : 'Employee',
      };
    }
    const emp = employees.find((e) => e.user_id === userId || e.id === userId);
    if (emp) {
      return { name: emp.name, role: emp.role || 'Employee' };
    }
    return { name: 'Business Staff', role: 'Team Member' };
  };

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
      .filter((q) => filterByDate(q.created_at))
      .map((q) => {
        const creator = getCreatorName(q.user_id);
        const status = q.payment_status || (q.status === 'Accepted' ? 'Pending' : 'Pending');
        const items = q.items || [];
        const itemsPreview = items.map((i) => `${i.quantity}x ${i.product_name}`).join(', ');

        return {
          id: q.id,
          title: q.quote_number,
          subtitle: q.client_name ? `Client: ${q.client_name}` : 'Quote Deal',
          type: 'Quote Sale' as const,
          payment_status: status,
          payment_method: q.payment_method || 'Invoice / Net Banking',
          total: q.total,
          created_at: q.created_at,
          creator_name: creator.name,
          creator_role: creator.role,
          items_preview: itemsPreview,
          rawItems: items,
          notes: q.notes,
          rawObject: q,
        };
      });

    const salesCredits = directSales
      .filter((ds) => filterByDate(ds.created_at))
      .map((ds) => {
        const creator = getCreatorName(ds.user_id, ds.created_by_name, ds.created_by_role);
        const status = ds.payment_status || 'Paid';
        const items = ds.items || [];
        const itemsPreview = items.map((i) => `${i.quantity}x ${i.product_name}`).join(', ');

        return {
          id: ds.id,
          title: ds.sale_number || 'Direct Sale',
          subtitle: ds.customer_name ? `Customer: ${ds.customer_name}` : 'Walk-in Counter Sale',
          type: 'Direct Sale' as const,
          payment_status: status,
          payment_method: ds.payment_method || 'Cash',
          total: ds.total,
          created_at: ds.created_at,
          creator_name: creator.name,
          creator_role: creator.role,
          items_preview: itemsPreview,
          rawItems: items,
          notes: ds.notes,
          subtotal: ds.subtotal,
          discount: ds.discount,
          tax: ds.tax,
          rawObject: ds,
        };
      });

    const all = [...quoteCredits, ...salesCredits].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (creditStatusFilter === 'All') return all;
    return all.filter((c) => c.payment_status === creditStatusFilter);
  }, [quotes, directSales, dateRange, creditStatusFilter, employees, currentUser]);

  const debits = useMemo(() => {
    return reorders
      .map((r) => {
        const items = r.items || [];
        const itemsPreview = items.map((i) => `${i.reorder_quantity || (i as any).qty || 1}x ${i.product_name}`).join(', ');
        return {
          id: `re-${r.id}`,
          title: r.order_number ? `PO #${r.order_number}` : 'Stock Reorder',
          subtitle: r.vendor_name ? `Vendor: ${r.vendor_name}` : 'Vendor Reorder',
          type: 'Stock Reorder / Purchase' as const,
          payment_status: (r.total_paid || 0) >= (r.total_estimated_cost || 0) ? 'Paid' : 'Partial',
          payment_method: 'Vendor Payment',
          total: r.total_paid || r.total_estimated_cost || 0,
          created_at: r.created_at,
          creator_name: 'Procurement',
          creator_role: 'Inventory',
          items_preview: itemsPreview,
          rawItems: items,
          notes: r.notes,
          invoice_number: r.invoice_number,
          total_estimated_cost: r.total_estimated_cost,
          rawObject: r,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [reorders]);

  // Financial calculations
  const totalPaidCredits = credits
    .filter((c) => c.payment_status === 'Paid')
    .reduce((sum, item) => sum + (item.total || 0), 0);

  const totalPendingCredits = credits
    .filter((c) => c.payment_status === 'Pending' || c.payment_status === 'Partial')
    .reduce((sum, item) => sum + (item.total || 0), 0);

  const totalDebits = debits.reduce((sum, item) => sum + (item.total || 0), 0);
  const netBalance = totalPaidCredits - totalDebits;

  const renderCredit = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelectedTx(item)} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, flex: 1, marginRight: 8 }}>
          <TooltipText style={styles.cardTitle} numberOfLines={1} tooltipTitle="Transaction Title">
            {item.title}
          </TooltipText>
          <View style={[styles.typeBadge, { backgroundColor: item.type === 'Direct Sale' ? colors.primary + '15' : colors.accent + '15' }]}>
            <Text style={[styles.typeBadgeText, { color: item.type === 'Direct Sale' ? colors.primary : colors.accent }]}>
              {item.type}
            </Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: item.payment_status === 'Paid' ? '#E6F4EA' : item.payment_status === 'Partial' ? '#FEF7E0' : '#FCE8E6' }]}>
          <Text style={[styles.badgeText, { color: item.payment_status === 'Paid' ? '#1E8E3E' : item.payment_status === 'Partial' ? '#B06000' : '#C5221F' }]}>
            {item.payment_status}
          </Text>
        </View>
      </View>

      <TooltipText style={styles.cardSubtitle} numberOfLines={1} tooltipTitle="Party Details">
        {item.subtitle}
      </TooltipText>

      {/* Seller attribution */}
      <View style={styles.sellerRow}>
        <Ionicons name="person-outline" size={13} color={colors.primary} />
        <TooltipText style={styles.sellerText} numberOfLines={1} tooltipTitle="Processed By">
          By: {item.creator_name} ({item.creator_role})
        </TooltipText>
      </View>

      {/* Items Preview */}
      {item.items_preview ? (
        <View style={styles.itemsBox}>
          <Ionicons name="cube-outline" size={13} color={colors.textSecondary} />
          <TooltipText style={styles.itemsText} numberOfLines={1} tooltipTitle="Items">
            {item.items_preview}
          </TooltipText>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.cardDate} numberOfLines={1}>
          {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {item.payment_method}
        </Text>
        <Text style={[styles.cardAmount, { color: item.payment_status === 'Paid' ? '#2BAE78' : colors.textPrimary }]} numberOfLines={1}>
          +{formatCurrency(item.total)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderDebit = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelectedTx(item)} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
          <TooltipText style={styles.cardTitle} numberOfLines={1} tooltipTitle="Transaction Title">
            {item.title}
          </TooltipText>
          <View style={[styles.typeBadge, { backgroundColor: '#E5393515' }]}>
            <Text style={[styles.typeBadgeText, { color: '#E53935' }]}>{item.type}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: '#E6F4EA' }]}>
          <Text style={[styles.badgeText, { color: '#1E8E3E' }]}>Debit Paid</Text>
        </View>
      </View>

      <TooltipText style={styles.cardSubtitle} numberOfLines={1} tooltipTitle="Vendor Details">
        {item.subtitle}
      </TooltipText>

      {item.items_preview ? (
        <View style={styles.itemsBox}>
          <Ionicons name="cart-outline" size={13} color={colors.textSecondary} />
          <TooltipText style={styles.itemsText} numberOfLines={1} tooltipTitle="Items Purchased">
            {item.items_preview}
          </TooltipText>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.cardDate} numberOfLines={1}>
          {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
        <Text style={[styles.cardAmount, { color: '#E53935' }]} numberOfLines={1}>-{formatCurrency(item.total)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <AppBackground />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Payments & Cash Flow</Text>
        <TouchableOpacity
          style={[styles.filterControlBtn, (dateRange !== 'All' || creditStatusFilter !== 'All') && styles.filterControlBtnActive]}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={20} color={(dateRange !== 'All' || creditStatusFilter !== 'All') ? '#fff' : colors.primary} />
          {(dateRange !== 'All' || creditStatusFilter !== 'All') && (
            <View style={styles.badgeDot}>
              <Text style={styles.badgeDotText}>!</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Summary KPI Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Collected Credits</Text>
          <Text style={[styles.summaryValue, { color: '#2BAE78' }]} numberOfLines={1}>
            {formatCurrency(totalPaidCredits)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Uncollected / Pending</Text>
          <Text style={[styles.summaryValue, { color: '#F59E0B' }]} numberOfLines={1}>
            {formatCurrency(totalPendingCredits)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Debit Expenses</Text>
          <Text style={[styles.summaryValue, { color: '#E53935' }]} numberOfLines={1}>
            {formatCurrency(totalDebits)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Net Cash Flow</Text>
          <Text style={[styles.summaryValue, { color: netBalance >= 0 ? '#2BAE78' : '#E53935' }]} numberOfLines={1}>
            {formatCurrency(netBalance)}
          </Text>
        </View>
      </View>

      {/* Active Filter Pills Bar */}
      {(dateRange !== 'All' || creditStatusFilter !== 'All') && (
        <View style={styles.activeFiltersBar}>
          <Text style={styles.activeLabel}>Filters:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {dateRange !== 'All' && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>{dateRange}</Text>
              </View>
            )}
            {creditStatusFilter !== 'All' && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>{creditStatusFilter}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => { setDateRange('All'); setCreditStatusFilter('All'); }}
              style={styles.clearPill}
            >
              <Ionicons name="close-circle" size={14} color="#E53935" />
              <Text style={styles.clearPillText}>Reset</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Credits' && styles.tabActive]}
          onPress={() => setActiveTab('Credits')}
        >
          <Text style={[styles.tabText, activeTab === 'Credits' && styles.tabTextActive]}>
            Revenue Credits ({credits.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Debits' && styles.tabActive]}
          onPress={() => setActiveTab('Debits')}
        >
          <Text style={[styles.tabText, activeTab === 'Debits' && styles.tabTextActive]}>
            Expenses & Debits ({debits.length})
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
            <Text style={styles.emptyText}>No {activeTab.toLowerCase()} records found</Text>
          </View>
        }
      />

      {/* Transaction Detail Modal */}
      <Modal visible={!!selectedTx} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTx && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{selectedTx.title}</Text>
                    <Text style={styles.modalSubtitle}>{selectedTx.type} • {new Date(selectedTx.created_at).toLocaleString('en-IN')}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedTx(null)}>
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                  <View style={styles.metaBox}>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Party / Client:</Text>
                      <Text style={styles.metaValue}>{selectedTx.subtitle}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Processed By:</Text>
                      <Text style={[styles.metaValue, { color: colors.primary, fontWeight: '700' }]}>
                        {selectedTx.creator_name} ({selectedTx.creator_role})
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Payment Status:</Text>
                      <Text style={[styles.metaValue, { fontWeight: '700', color: selectedTx.payment_status === 'Paid' ? '#1E8E3E' : '#B06000' }]}>
                        {selectedTx.payment_status} ({selectedTx.payment_method})
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Amount:</Text>
                      <Text style={[styles.metaValue, { fontSize: 16, fontWeight: '800', color: selectedTx.type === 'Stock Reorder / Purchase' ? '#E53935' : '#2BAE78' }]}>
                        {formatCurrency(selectedTx.total)}
                      </Text>
                    </View>
                  </View>

                  {selectedTx.items_preview ? (
                    <>
                      <Text style={styles.itemsSectionTitle}>Line Items</Text>
                      {(selectedTx.rawItems || []).map((item: any, idx: number) => (
                        <View key={idx} style={styles.modalItemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.modalItemName}>{item.product_name || item.name || 'Item'}</Text>
                            <Text style={styles.modalItemMeta}>
                              {item.quantity || 1} units {item.unit_price ? `@ ₹${item.unit_price}` : ''}
                            </Text>
                          </View>
                          {item.line_total ? (
                            <Text style={styles.modalItemTotal}>{formatCurrency(item.line_total)}</Text>
                          ) : null}
                        </View>
                      ))}
                    </>
                  ) : null}

                  {selectedTx.notes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Notes / Memo:</Text>
                      <Text style={styles.notesText}>{selectedTx.notes}</Text>
                    </View>
                  ) : null}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        groups={filterGroups}
        onReset={() => { setDateRange('All'); setCreditStatusFilter('All'); }}
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
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  summaryContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: Radius.md,
    ...Shadow.sm,
  },
  summaryLabel: { fontSize: 10, color: colors.textSecondary, marginBottom: 2, fontWeight: '600' },
  summaryValue: { fontSize: 13, fontWeight: '800' },
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
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
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
  cardSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  sellerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  itemsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    padding: 8,
    borderRadius: Radius.sm,
    marginBottom: 10,
  },
  itemsText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 12, color: colors.textMuted },
  cardAmount: { fontSize: 16, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 16, color: colors.textSecondary },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: Radius.xl,
    padding: 20,
    ...Shadow.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  modalSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  metaBox: {
    backgroundColor: colors.surfaceAlt,
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 16,
    gap: 6,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  metaValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  itemsSectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  modalItemName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  modalItemMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  modalItemTotal: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  notesBox: {
    marginTop: 12,
    backgroundColor: colors.surfaceAlt,
    padding: 10,
    borderRadius: Radius.md,
  },
  notesLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 2 },
  notesText: { fontSize: 13, color: colors.textSecondary },
});
