import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useQuotes } from '../../hooks/useQuotes';
import { useEmployees } from '../../hooks/useEmployees';
import { useReorders } from '../../hooks/useReorders';
import { useDirectSales } from '../../hooks/useDirectSales';
import { useAuthStore } from '../../store/useAuthStore';
import { Radius, Shadow } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { AppBackground } from '../../components/AppBackground';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';

const BAR_AREA_HEIGHT = 110;
const VALUE_LABEL_HEIGHT = 20;

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

type Period = 'week' | 'month';

const BarChart: React.FC<{ data: { label: string; value: number }[]; color: string }> = ({ data, color }) => {
  const { colors } = useAppTheme();
  const chartStyles = createChartStyles(colors);
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={{ width: '100%', marginTop: 4 }}>
      {/* Chart Bars Area */}
      <View style={{ height: BAR_AREA_HEIGHT + VALUE_LABEL_HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        {data.map((d, i) => {
          const barH = Math.max(4, (d.value / max) * BAR_AREA_HEIGHT);
          const isMax = d.value === max && d.value > 0;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <View style={{ height: VALUE_LABEL_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                {d.value > 0 && (
                  <Text style={[chartStyles.barValue, isMax && { color: colors.primary, fontWeight: '800' }]}>
                    {d.value >= 100000 ? `${(d.value / 100000).toFixed(1)}L` : d.value >= 1000 ? `${(d.value / 1000).toFixed(0)}k` : d.value}
                  </Text>
                )}
              </View>
              <View
                style={[
                  chartStyles.bar,
                  {
                    height: barH,
                    width: '100%',
                    maxWidth: 32,
                    backgroundColor: isMax ? colors.primary : color,
                    borderRadius: 6,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      {/* X Axis Labels */}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
        {data.map((d, i) => (
          <Text key={i} style={chartStyles.barLabel} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const createChartStyles = (colors: any) => StyleSheet.create({
  bar: { borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barLabel: { flex: 1, fontSize: 11, color: colors.textMuted, textAlign: 'center', fontWeight: '600' },
  barValue: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
});

export const AnalyticsDashboardScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const styles = createStyles(colors, insets);
  const nav = useNavigation<any>();
  const currentUser = useAuthStore((s) => s.user);
  const { quotes } = useQuotes();
  const { employees, fetch: fetchEmployees } = useEmployees();
  const { reorders, fetch: fetchReorders } = useReorders();
  const { directSales, fetch: fetchDirectSales } = useDirectSales();

  const [period, setPeriod] = useState<Period>('month');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | undefined>(undefined);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempStart, setTempStart] = useState<Date>(new Date());
  const [tempEnd, setTempEnd] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const analytics = useAnalytics(quotes, reorders, directSales, dateRange);

  useEffect(() => {
    fetchEmployees();
    fetchReorders();
    fetchDirectSales();
  }, []);

  const chartData = dateRange
    ? (analytics.customChartPoints.length > 0 ? analytics.customChartPoints : analytics.weeklyRevenue)
    : (period === 'week' ? analytics.weeklyRevenue : analytics.monthlyRevenue);

  const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // Get Creator Display Name (Resolves Boss / Unknown Employee bug)
  const getCreatorInfo = (userId: string) => {
    if (currentUser && (userId === currentUser.id || userId === `tenant_${currentUser.id}`)) {
      return {
        name: currentUser.displayName ? `${currentUser.displayName} (You)` : 'You (Owner)',
        role: currentUser.role === 'boss' ? 'Business Owner' : 'Employee',
        isOwner: currentUser.role === 'boss',
      };
    }

    const emp = employees.find((e) => e.user_id === userId || e.id === userId);
    if (emp) {
      return {
        name: emp.name,
        role: emp.role || 'Employee',
        isOwner: false,
      };
    }

    if (currentUser?.role === 'boss') {
      return {
        name: currentUser.displayName || 'Business Boss',
        role: 'Business Owner',
        isOwner: true,
      };
    }

    return {
      name: 'Business Staff',
      role: 'Team Member',
      isOwner: false,
    };
  };

  const StatRow: React.FC<{ label: string; value: string; sub?: string; color?: string; icon: string }> = ({
    label, value, sub, color = colors.textPrimary, icon,
  }) => (
    <View style={styles.statRow}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label}</Text>
        {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <AppBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Analytics & Insights</Text>
        <TouchableOpacity
          onPress={() => {
            setTempStart(dateRange?.start || new Date());
            setTempEnd(dateRange?.end || new Date());
            setShowFilterModal(true);
          }}
          style={[styles.backBtn, dateRange && { backgroundColor: colors.primary }]}
        >
          <Ionicons name="filter" size={20} color={dateRange ? '#fff' : colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Filter Status Chip Banner */}
      {dateRange && (
        <View style={styles.filterBanner}>
          <Ionicons name="funnel-outline" size={15} color={colors.primary} />
          <Text style={styles.filterBannerText} numberOfLines={1}>
            Filtered: {formatDate(dateRange.start)} – {formatDate(dateRange.end)}
          </Text>
          <TouchableOpacity
            style={styles.clearFilterChip}
            onPress={() => setDateRange(undefined)}
          >
            <Text style={styles.clearFilterChipText}>Reset</Text>
            <Ionicons name="close-circle" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Date Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Date Filter</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateLabel}>Start Date</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.dateBtnText}>{formatDate(tempStart)}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ width: 16 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.dateLabel}>End Date</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.dateBtnText}>{formatDate(tempEnd)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showStartPicker && (
              <DateTimePicker
                value={tempStart}
                mode="date"
                display="default"
                onChange={(e, date) => {
                  if (Platform.OS === 'android') setShowStartPicker(false);
                  if (date) {
                    date.setHours(0, 0, 0, 0);
                    setTempStart(date);
                  }
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={tempEnd}
                mode="date"
                display="default"
                minimumDate={tempStart}
                onChange={(e, date) => {
                  if (Platform.OS === 'android') setShowEndPicker(false);
                  if (date) {
                    date.setHours(23, 59, 59, 999);
                    setTempEnd(date);
                  }
                }}
              />
            )}

            {Platform.OS === 'ios' && (showStartPicker || showEndPicker) && (
              <TouchableOpacity
                style={styles.iosPickerDoneBtn}
                onPress={() => { setShowStartPicker(false); setShowEndPicker(false); }}
              >
                <Text style={styles.iosPickerDoneText}>Done Selecting</Text>
              </TouchableOpacity>
            )}

            <View style={styles.modalActions}>
              {dateRange && (
                <TouchableOpacity
                  style={[styles.applyBtn, { backgroundColor: colors.surfaceAlt, flex: 0.5, marginRight: 12 }]}
                  onPress={() => { setDateRange(undefined); setShowFilterModal(false); }}
                >
                  <Text style={[styles.applyBtnText, { color: colors.textPrimary }]}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  setDateRange({ start: tempStart, end: tempEnd });
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.applyBtnText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabBarHeight }}>
        {/* Main Revenue Card */}
        <View style={styles.revenueCard}>
          <Text style={styles.cardLabel}>
            {dateRange ? 'Filtered Accepted Revenue' : 'Total Accepted Revenue'}
          </Text>
          <Text style={styles.bigNumber}>{formatCurrency(analytics.totalRevenue)}</Text>
          
          <View style={styles.miniRow}>
            {dateRange ? (
              <>
                <View style={styles.miniStat}>
                  <Text style={styles.miniLabel}>From</Text>
                  <Text style={styles.miniValue}>{formatDate(dateRange.start).split(' ')[0]} {formatDate(dateRange.start).split(' ')[1]}</Text>
                </View>
                <View style={styles.miniDivider} />
                <View style={styles.miniStat}>
                  <Text style={styles.miniLabel}>Deals</Text>
                  <Text style={styles.miniValue}>{analytics.acceptedCount}</Text>
                </View>
                <View style={styles.miniDivider} />
                <View style={styles.miniStat}>
                  <Text style={styles.miniLabel}>To</Text>
                  <Text style={styles.miniValue}>{formatDate(dateRange.end).split(' ')[0]} {formatDate(dateRange.end).split(' ')[1]}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.miniStat}>
                  <Text style={styles.miniLabel}>Today</Text>
                  <Text style={styles.miniValue}>{formatCurrency(analytics.todayRevenue)}</Text>
                </View>
                <View style={styles.miniDivider} />
                <View style={styles.miniStat}>
                  <Text style={styles.miniLabel}>This Month</Text>
                  <Text style={styles.miniValue}>{formatCurrency(analytics.thisMonthRevenue)}</Text>
                </View>
                <View style={styles.miniDivider} />
                <View style={styles.miniStat}>
                  <Text style={styles.miniLabel}>This Year</Text>
                  <Text style={styles.miniValue}>{formatCurrency(analytics.thisYearRevenue)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Business KPIs Summary */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiBadge, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="trophy-outline" size={16} color="#10B981" />
            </View>
            <Text style={styles.kpiValue}>{analytics.conversionRate.toFixed(0)}%</Text>
            <Text style={styles.kpiLabel}>Win Rate</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiBadge, { backgroundColor: '#3B82F615' }]}>
              <Ionicons name="calculator-outline" size={16} color="#3B82F6" />
            </View>
            <Text style={styles.kpiValue}>{formatCurrency(analytics.averageQuoteValue)}</Text>
            <Text style={styles.kpiLabel}>Avg Deal Size</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiBadge, { backgroundColor: '#8B5CF615' }]}>
              <Ionicons name="document-text-outline" size={16} color="#8B5CF6" />
            </View>
            <Text style={styles.kpiValue}>{analytics.totalQuotesCount}</Text>
            <Text style={styles.kpiLabel}>Total Quotes</Text>
          </View>
        </View>

        {/* Secondary KPIs Summary */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiBadge, { backgroundColor: '#EF444415' }]}>
              <Ionicons name="cart-outline" size={16} color="#EF4444" />
            </View>
            <Text style={styles.kpiValue}>{formatCurrency(analytics.totalReorderCost)}</Text>
            <Text style={styles.kpiLabel}>Reorder Cost</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiBadge, { backgroundColor: '#06B6D415' }]}>
              <Ionicons name="pricetag-outline" size={16} color="#06B6D4" />
            </View>
            <Text style={styles.kpiValue}>{formatCurrency(analytics.totalDirectSalesRevenue)}</Text>
            <Text style={styles.kpiLabel}>Direct Sales</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiBadge, { backgroundColor: analytics.netProfit >= 0 ? '#10B98115' : '#EF444415' }]}>
              <Ionicons name="cash-outline" size={16} color={analytics.netProfit >= 0 ? '#10B981' : '#EF4444'} />
            </View>
            <Text style={styles.kpiValue}>{formatCurrency(analytics.netProfit)}</Text>
            <Text style={styles.kpiLabel}>Net Profit</Text>
          </View>
        </View>

        {/* Revenue Trend Chart */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Revenue Trend</Text>
            {!dateRange && (
              <View style={styles.periodToggle}>
                {(['week', 'month'] as Period[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                    onPress={() => setPeriod(p)}
                  >
                    <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
                      {p === 'week' ? '7 Days' : '6 Months'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <BarChart data={chartData} color={colors.accent} />
        </View>

        {/* Quote Pipeline Breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quote Pipeline</Text>

          {/* Visual Distribution Progress Bar */}
          {analytics.totalQuotesCount > 0 && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressSegment, { flex: analytics.acceptedCount || 0.01, backgroundColor: '#10B981' }]} />
              <View style={[styles.progressSegment, { flex: analytics.sentCount || 0.01, backgroundColor: '#3B82F6' }]} />
              <View style={[styles.progressSegment, { flex: analytics.draftCount || 0.01, backgroundColor: '#9CA3AF' }]} />
              <View style={[styles.progressSegment, { flex: analytics.rejectedCount || 0.01, backgroundColor: '#EF4444' }]} />
            </View>
          )}

          <StatRow label="Accepted" value={`${analytics.acceptedCount} (${analytics.totalQuotesCount ? ((analytics.acceptedCount / analytics.totalQuotesCount) * 100).toFixed(0) : 0}%)`} color="#10B981" icon="checkmark-circle-outline" />
          <StatRow label="Sent / Pending" value={`${analytics.sentCount} (${analytics.totalQuotesCount ? ((analytics.sentCount / analytics.totalQuotesCount) * 100).toFixed(0) : 0}%)`} color="#3B82F6" icon="paper-plane-outline" />
          <StatRow label="Draft" value={`${analytics.draftCount} (${analytics.totalQuotesCount ? ((analytics.draftCount / analytics.totalQuotesCount) * 100).toFixed(0) : 0}%)`} color="#9CA3AF" icon="document-outline" />
          <StatRow label="Rejected" value={`${analytics.rejectedCount} (${analytics.totalQuotesCount ? ((analytics.rejectedCount / analytics.totalQuotesCount) * 100).toFixed(0) : 0}%)`} color="#EF4444" icon="close-circle-outline" />
        </View>

        {/* Pending Payments */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Status</Text>
          <StatRow
            label="Pending Uncollected Payments"
            value={formatCurrency(analytics.pendingPaymentsTotal)}
            sub={`${analytics.pendingPaymentsCount} quote${analytics.pendingPaymentsCount !== 1 ? 's' : ''} awaiting payment`}
            color="#F59E0B"
            icon="wallet-outline"
          />
        </View>

        {/* Top Products */}
        {analytics.topProducts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Top Products by Sales</Text>
            {analytics.topProducts.map((p, i) => (
              <View key={p.name} style={styles.productRowItem}>
                <View style={styles.productRowHeader}>
                  <View style={[styles.rankBadge, i === 0 && { backgroundColor: '#F59E0B20' }]}>
                    <Text style={[styles.rankText, i === 0 && { color: '#F59E0B' }]}>#{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productRowName}>{p.name}</Text>
                    <Text style={styles.productRowMeta}>{p.count} units sold</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.productRowRevenue}>{formatCurrency(p.revenue)}</Text>
                    <Text style={styles.shareText}>{p.percentage.toFixed(1)}% share</Text>
                  </View>
                </View>
                {/* Share Progress Bar */}
                <View style={styles.itemProgressTrack}>
                  <View style={[styles.itemProgressFill, { width: `${Math.min(100, p.percentage)}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Team & Employee Revenue Performance */}
        {analytics.employeeRevenue.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Team Revenue Performance</Text>
            {analytics.employeeRevenue.map((emp) => {
              const creator = getCreatorInfo(emp.userId);
              return (
                <View key={emp.userId} style={styles.productRowItem}>
                  <View style={styles.productRowHeader}>
                    <View style={[styles.avatarWrap, creator.isOwner && { backgroundColor: colors.primary + '25' }]}>
                      <Text style={[styles.avatarText, creator.isOwner && { color: colors.primary }]}>
                        {creator.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.productRowName}>{creator.name}</Text>
                      </View>
                      <Text style={styles.productRowMeta}>
                        {creator.role} • {emp.quotesCount} quote{emp.quotesCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.productRowRevenue}>{formatCurrency(emp.revenue)}</Text>
                      <Text style={styles.shareText}>{emp.percentage.toFixed(1)}% of total</Text>
                    </View>
                  </View>
                  {/* Share Progress Bar */}
                  <View style={styles.itemProgressTrack}>
                    <View style={[styles.itemProgressFill, { width: `${Math.min(100, emp.percentage)}%`, backgroundColor: creator.isOwner ? colors.primary : '#10B981' }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any, insets?: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Math.max(insets?.top || 0, 24) + 12, paddingBottom: 12, paddingHorizontal: 20,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  
  // Filter Banner
  filterBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary + '15',
    marginHorizontal: 20, marginBottom: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.primary + '30',
  },
  filterBannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.primary },
  clearFilterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2 },
  clearFilterChipText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  revenueCard: {
    backgroundColor: colors.primary,
    borderRadius: Radius.xl,
    padding: 24,
    marginBottom: 16,
    marginTop: 4,
  },
  cardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  bigNumber: { fontSize: 36, fontWeight: '800', color: '#fff', marginVertical: 8 },
  miniRow: { flexDirection: 'row', marginTop: 4 },
  miniStat: { flex: 1, alignItems: 'center' },
  miniLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  miniValue: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 4 },
  miniDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 },

  // KPI Grid
  kpiGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  kpiCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: Radius.lg,
    padding: 12, alignItems: 'center', ...Shadow.sm,
  },
  kpiBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  kpiValue: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  kpiLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },

  card: {
    backgroundColor: colors.surface, borderRadius: Radius.lg,
    padding: 16, marginBottom: 16, ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.full,
    padding: 3,
  },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  periodBtnActive: { backgroundColor: colors.surface, ...Shadow.sm },
  periodBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  periodBtnTextActive: { color: colors.textPrimary },

  // Progress bar tracks
  progressTrack: { height: 8, borderRadius: 4, flexDirection: 'row', overflow: 'hidden', marginBottom: 16 },
  progressSegment: { height: '100%' },

  statRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  statSub: { fontSize: 12, color: colors.textSecondary },
  statValue: { fontSize: 15, fontWeight: '700' },

  // Products & Employee List Rows
  productRowItem: { marginBottom: 14 },
  productRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  rankBadge: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  productRowName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  productRowMeta: { fontSize: 12, color: colors.textSecondary },
  productRowRevenue: { fontSize: 14, fontWeight: '700', color: colors.primary },
  shareText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  itemProgressTrack: { height: 5, backgroundColor: colors.surfaceAlt, borderRadius: 3, overflow: 'hidden', marginTop: 2 },
  itemProgressFill: { height: '100%', borderRadius: 3 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: Radius.xl, padding: 20, ...Shadow.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  datePickerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  dateLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, marginLeft: 4 },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  dateBtnText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  iosPickerDoneBtn: {
    backgroundColor: colors.primary + '20', padding: 12, borderRadius: Radius.md,
    alignItems: 'center', marginBottom: 16,
  },
  iosPickerDoneText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  modalActions: { flexDirection: 'row', marginTop: 8 },
  applyBtn: {
    flex: 1, backgroundColor: colors.primary,
    paddingVertical: 14, borderRadius: Radius.full,
    alignItems: 'center', ...Shadow.sm,
  },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  avatarWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
