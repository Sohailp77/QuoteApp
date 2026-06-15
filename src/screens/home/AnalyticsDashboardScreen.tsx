import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Modal, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useQuotes } from '../../hooks/useQuotes';
import { useEmployees } from '../../hooks/useEmployees';
import { Radius, Shadow } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 40;
const CHART_HEIGHT = 140;

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

type Period = 'week' | 'month';

const BarChart: React.FC<{ data: { label: string; value: number }[]; color: string }> = ({ data, color }) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const chartStyles = createChartStyles(colors);
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = (CHART_WIDTH - (data.length - 1) * 8) / data.length;

  return (
    <View style={{ height: CHART_HEIGHT + 30, width: CHART_WIDTH }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT, gap: 8 }}>
        {data.map((d, i) => {
          const barH = Math.max(4, (d.value / max) * CHART_HEIGHT);
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              {d.value > 0 && (
                <Text style={chartStyles.barValue}>
                  {d.value >= 1000 ? `${(d.value / 1000).toFixed(0)}k` : d.value}
                </Text>
              )}
              <View
                style={[
                  chartStyles.bar,
                  {
                    height: barH,
                    width: barW,
                    backgroundColor: color,
                    borderRadius: 6,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        {data.map((d, i) => (
          <Text key={i} style={[chartStyles.barLabel, { width: barW }]} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const createChartStyles = (colors: any) => StyleSheet.create({
  bar: { borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barLabel: { fontSize: 10, color: colors.textMuted, textAlign: 'center', fontWeight: '600' },
  barValue: { fontSize: 9, color: colors.textSecondary, marginBottom: 3, textAlign: 'center' },
});

export const AnalyticsDashboardScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const nav = useNavigation<any>();
  const { quotes } = useQuotes();
  const { employees, fetch: fetchEmployees } = useEmployees();
  
  const [period, setPeriod] = useState<Period>('month');
  const [dateRange, setDateRange] = useState<{start: Date, end: Date} | undefined>(undefined);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempStart, setTempStart] = useState<Date>(new Date());
  const [tempEnd, setTempEnd] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const analytics = useAnalytics(quotes, dateRange);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const chartData = period === 'week' ? analytics.weeklyRevenue : analytics.monthlyRevenue;

  const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Analytics</Text>
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
        {/* Revenue Overview */}
        <View style={styles.revenueCard}>
          <Text style={styles.cardLabel}>Total Accepted Revenue</Text>
          <Text style={styles.bigNumber}>{formatCurrency(analytics.totalRevenue)}</Text>
          <View style={styles.miniRow}>
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
          </View>
        </View>

        {/* Revenue Chart */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Revenue Trend</Text>
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
          </View>
          <BarChart data={chartData} color={colors.accent} />
        </View>

        {/* Quote Stats */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quote Summary</Text>
          <StatRow label="Accepted" value={String(analytics.acceptedCount)} color="#10B981" icon="checkmark-circle-outline" />
          <StatRow label="Draft" value={String(analytics.draftCount)} color="#6B7280" icon="document-outline" />
          <StatRow label="Rejected" value={String(analytics.rejectedCount)} color="#EF4444" icon="close-circle-outline" />
        </View>

        {/* Pending Payments */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payments</Text>
          <StatRow
            label="Pending Payments"
            value={formatCurrency(analytics.pendingPaymentsTotal)}
            sub={`${analytics.pendingPaymentsCount} quote${analytics.pendingPaymentsCount !== 1 ? 's' : ''}`}
            color="#F59E0B"
            icon="card-outline"
          />
        </View>

        {/* Top Products */}
        {analytics.topProducts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Top Products by Revenue</Text>
            {analytics.topProducts.map((p, i) => (
              <View key={p.name} style={styles.productRow}>
                <View style={[styles.rankBadge, i === 0 && { backgroundColor: '#F59E0B20' }]}>
                  <Text style={[styles.rankText, i === 0 && { color: '#F59E0B' }]}>#{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productRowName}>{p.name}</Text>
                  <Text style={styles.productRowMeta}>{p.count} units sold</Text>
                </View>
                <Text style={styles.productRowRevenue}>{formatCurrency(p.revenue)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Employee Revenue */}
        {analytics.employeeRevenue.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Employee Revenue</Text>
            {analytics.employeeRevenue.map((emp, i) => {
              const employee = employees.find(e => e.user_id === emp.userId || e.id === emp.userId);
              const name = employee?.name || 'Unknown Employee';
              
              return (
                <View key={emp.userId} style={styles.productRow}>
                  <View style={styles.avatarWrap}>
                    <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productRowName}>{name}</Text>
                    <Text style={styles.productRowMeta}>{emp.quotesCount} quote{emp.quotesCount !== 1 ? 's' : ''}</Text>
                  </View>
                  <Text style={styles.productRowRevenue}>{formatCurrency(emp.revenue)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 12, paddingHorizontal: 20,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  revenueCard: {
    backgroundColor: colors.primary,
    borderRadius: Radius.xl,
    padding: 24,
    marginBottom: 16,
    marginTop: 4,
  },
  cardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  bigNumber: { fontSize: 36, fontWeight: '800', color: '#fff', marginVertical: 8 },
  miniRow: { flexDirection: 'row', marginTop: 4 },
  miniStat: { flex: 1, alignItems: 'center' },
  miniLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  miniValue: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 4 },
  miniDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 8 },
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
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  statSub: { fontSize: 12, color: colors.textSecondary },
  statValue: { fontSize: 16, fontWeight: '700' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  rankBadge: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  productRowName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  productRowMeta: { fontSize: 12, color: colors.textSecondary },
  productRowRevenue: { fontSize: 14, fontWeight: '700', color: colors.primary },
  
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
    borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.border 
  },
  dateBtnText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  iosPickerDoneBtn: { 
    backgroundColor: colors.primary + '20', padding: 12, borderRadius: Radius.md, 
    alignItems: 'center', marginBottom: 16 
  },
  iosPickerDoneText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  modalActions: { flexDirection: 'row', marginTop: 8 },
  applyBtn: { 
    flex: 1, backgroundColor: colors.primary, 
    paddingVertical: 14, borderRadius: Radius.full, 
    alignItems: 'center', ...Shadow.sm 
  },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  avatarWrap: { 
    width: 36, height: 36, borderRadius: 18, 
    backgroundColor: colors.primary + '15', 
    alignItems: 'center', justifyContent: 'center' 
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
