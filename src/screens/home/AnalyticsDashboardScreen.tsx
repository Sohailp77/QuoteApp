import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useQuotes } from '../../hooks/useQuotes';
import { Colors, Radius, Shadow } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 40;
const CHART_HEIGHT = 140;

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

type Period = 'week' | 'month';

const BarChart: React.FC<{ data: { label: string; value: number }[]; color: string }> = ({ data, color }) => {
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

const chartStyles = StyleSheet.create({
  bar: { borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barLabel: { fontSize: 10, color: Colors.textMuted, textAlign: 'center', fontWeight: '600' },
  barValue: { fontSize: 9, color: Colors.textSecondary, marginBottom: 3, textAlign: 'center' },
});

export const AnalyticsDashboardScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const { quotes } = useQuotes();
  const analytics = useAnalytics(quotes);
  const [period, setPeriod] = useState<Period>('month');

  const chartData = period === 'week' ? analytics.weeklyRevenue : analytics.monthlyRevenue;

  const StatRow: React.FC<{ label: string; value: string; sub?: string; color?: string; icon: string }> = ({
    label, value, sub, color = Colors.textPrimary, icon,
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
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Analytics</Text>
        <View style={{ width: 38 }} />
      </View>

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
          <BarChart data={chartData} color={Colors.accent} />
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 12, paddingHorizontal: 20,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  revenueCard: {
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: 16, marginBottom: 16, ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    padding: 3,
  },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  periodBtnActive: { backgroundColor: Colors.surface, ...Shadow.sm },
  periodBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  periodBtnTextActive: { color: Colors.textPrimary },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  statSub: { fontSize: 12, color: Colors.textSecondary },
  statValue: { fontSize: 16, fontWeight: '700' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  rankBadge: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  productRowName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  productRowMeta: { fontSize: 12, color: Colors.textSecondary },
  productRowRevenue: { fontSize: 14, fontWeight: '700', color: Colors.accent },
});
