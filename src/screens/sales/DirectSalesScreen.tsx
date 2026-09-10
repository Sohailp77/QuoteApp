import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView, Modal } from 'react-native';
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
import { DirectSale } from '../../types';
import { TooltipText } from '../../components/ui/TooltipText';

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCompanySettings } from '../../hooks/useCompanySettings';
import { generateQuotePDFHtml } from '../../utils/pdfTemplates';

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const DirectSalesScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const styles = createStyles(colors, insets);
  const nav = useNavigation<any>();
  const { directSales, fetch, loading, remove } = useDirectSales();
  const { settings: companySettings } = useCompanySettings();

  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<string>('All');
  const [dateRange, setDateRange] = useState<'All' | 'Today' | 'This Week' | 'This Month'>('All');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<DirectSale | null>(null);
  const [sharingPdf, setSharingPdf] = useState(false);

  const handleShareInvoice = async (sale: DirectSale) => {
    setSharingPdf(true);
    try {
      const mockQuote: any = {
        id: sale.id,
        quote_number: sale.sale_number,
        client_name: sale.customer_name || 'Walk-in Customer',
        client_email: '',
        client_phone: sale.customer_phone || '',
        status: 'Accepted',
        subtotal: sale.subtotal,
        discount: sale.discount,
        tax: sale.tax,
        total: sale.total,
        created_at: sale.created_at,
        valid_until: sale.created_at,
        items: (sale.items || []).map((i) => ({
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount: i.discount,
          line_total: i.line_total,
        })),
      };

      const html = generateQuotePDFHtml(mockQuote, companySettings, 'INVOICE');
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share Invoice ${sale.sale_number}`,
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (err: any) {
      console.warn('Failed to share direct sale invoice:', err);
    } finally {
      setSharingPdf(false);
    }
  };

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
        (s.customer_name && s.customer_name.toLowerCase().includes(search.toLowerCase())) ||
        (s.created_by_name && s.created_by_name.toLowerCase().includes(search.toLowerCase())) ||
        (s.items && s.items.some(i => i.product_name.toLowerCase().includes(search.toLowerCase())));

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

  const renderItem = ({ item }: { item: DirectSale }) => {
    const itemsPreview = (item.items || [])
      .map((i) => `${i.quantity}x ${i.product_name}`)
      .join(', ');
    const sellerName = item.created_by_name || 'Staff';
    const sellerRole = item.created_by_role || 'Team';

    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelectedSale(item)} activeOpacity={0.85}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TooltipText style={styles.cardTitle} numberOfLines={1} tooltipTitle="Sale Number">{item.sale_number}</TooltipText>
            <View style={styles.sellerChip}>
              <Ionicons name="person-circle-outline" size={14} color={colors.primary} />
              <TooltipText style={styles.sellerChipText} numberOfLines={1} tooltipTitle="Processed By">{sellerName} ({sellerRole})</TooltipText>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: item.payment_status === 'Paid' ? '#E6F4EA' : '#FEF7E0' }]}>
            <Text style={[styles.badgeText, { color: item.payment_status === 'Paid' ? '#1E8E3E' : '#B06000' }]}>
              {item.payment_status}
            </Text>
          </View>
        </View>

        <TooltipText style={styles.cardSubtitle} numberOfLines={1} tooltipTitle="Customer">{item.customer_name ? `Customer: ${item.customer_name}` : 'Walk-in Counter Sale'}</TooltipText>

        {itemsPreview ? (
          <View style={styles.itemsPreviewBox}>
            <Ionicons name="cube-outline" size={14} color={colors.textSecondary} />
            <TooltipText style={styles.itemsPreviewText} numberOfLines={2} tooltipTitle="Purchased Items">
              {itemsPreview} ({item.items.length} item{item.items.length !== 1 ? 's' : ''})
            </TooltipText>
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>
            {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {item.payment_method || 'Cash'}
          </Text>
          <View style={styles.actionsRow}>
            <Text style={styles.cardAmount}>{formatCurrency(item.total)}</Text>
            <TouchableOpacity onPress={() => remove(item.id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color="#E53935" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
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
            placeholder="Search sales, items, or seller..."
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

      {/* Itemized Direct Sale Receipt Modal */}
      <Modal visible={!!selectedSale} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedSale && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{selectedSale.sale_number}</Text>
                    <Text style={styles.modalSubtitle}>
                      {new Date(selectedSale.created_at).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedSale(null)}>
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                  <View style={styles.metaBox}>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Customer:</Text>
                      <Text style={styles.metaValue}>{selectedSale.customer_name || 'Walk-in Customer'}</Text>
                    </View>
                    {selectedSale.customer_phone ? (
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Phone:</Text>
                        <Text style={styles.metaValue}>{selectedSale.customer_phone}</Text>
                      </View>
                    ) : null}
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Processed By:</Text>
                      <Text style={[styles.metaValue, { color: colors.primary, fontWeight: '700' }]}>
                        {selectedSale.created_by_name || 'Staff'} ({selectedSale.created_by_role || 'Team Member'})
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Payment Status:</Text>
                      <Text style={[styles.metaValue, { fontWeight: '700', color: selectedSale.payment_status === 'Paid' ? '#1E8E3E' : '#B06000' }]}>
                        {selectedSale.payment_status} ({selectedSale.payment_method || 'Cash'})
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.itemsSectionTitle}>Itemized Products Sold</Text>
                  {(selectedSale.items || []).map((item, idx) => (
                    <View key={idx} style={styles.modalItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalItemName}>{item.product_name}</Text>
                        <Text style={styles.modalItemMeta}>
                          {item.quantity} x {formatCurrency(item.unit_price)} {item.discount ? `(${item.discount}% off)` : ''}
                        </Text>
                      </View>
                      <Text style={styles.modalItemTotal}>{formatCurrency(item.line_total)}</Text>
                    </View>
                  ))}

                  <View style={styles.breakdownBox}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Subtotal:</Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(selectedSale.subtotal)}</Text>
                    </View>
                    {selectedSale.discount > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Discount:</Text>
                        <Text style={[styles.breakdownValue, { color: '#E53935' }]}>-{formatCurrency(selectedSale.discount)}</Text>
                      </View>
                    )}
                    {selectedSale.tax > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Tax:</Text>
                        <Text style={styles.breakdownValue}>+{formatCurrency(selectedSale.tax)}</Text>
                      </View>
                    )}
                    <View style={[styles.breakdownRow, styles.grandTotalRow]}>
                      <Text style={styles.grandTotalLabel}>Grand Total:</Text>
                      <Text style={styles.grandTotalValue}>{formatCurrency(selectedSale.total)}</Text>
                    </View>
                  </View>

                  {selectedSale.notes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Notes:</Text>
                      <Text style={styles.notesText}>{selectedSale.notes}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      backgroundColor: colors.primary,
                      paddingVertical: 12,
                      borderRadius: Radius.md,
                      marginTop: 16,
                    }}
                    onPress={() => handleShareInvoice(selectedSale)}
                    disabled={sharingPdf}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                      {sharingPdf ? 'Generating PDF...' : 'Share Invoice PDF'}
                    </Text>
                  </TouchableOpacity>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  sellerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  sellerChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  itemsPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    padding: 8,
    borderRadius: Radius.sm,
    marginBottom: 10,
  },
  itemsPreviewText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cardDate: { fontSize: 12, color: colors.textMuted },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardAmount: { fontSize: 16, fontWeight: '800', color: colors.primary },
  deleteBtn: { padding: 4 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
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
  breakdownBox: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { fontSize: 13, color: colors.textSecondary },
  breakdownValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 6,
  },
  grandTotalLabel: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  grandTotalValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
  notesBox: {
    marginTop: 12,
    backgroundColor: colors.surfaceAlt,
    padding: 10,
    borderRadius: Radius.md,
  },
  notesLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 2 },
  notesText: { fontSize: 13, color: colors.textSecondary },
});
