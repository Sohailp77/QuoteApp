import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';
import { useQuotes } from '../../hooks/useQuotes';
import { useEmployees } from '../../hooks/useEmployees';
import { useProducts } from '../../hooks/useProducts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../../hooks/useNotifications';
import { useNotificationStore, loadNotificationState } from '../../store/useNotificationStore';
import { usePushNotificationManager } from '../../hooks/usePushNotificationManager';
import { useAnalytics } from '../../hooks/useAnalytics';
import { QuoteCard } from '../../components/QuoteCard';
import { Radius, Shadow } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export const HomeScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets, isDark);
  const user = useAuthStore((s) => s.user);
  const nav = useNavigation<any>();
  const { quotes, loading: qLoading, fetch: fetchQuotes } = useQuotes();
  const { employees, fetch: fetchEmployees } = useEmployees();
  const { products, fetch: fetchProducts } = useProducts();
  const notifications = useNotifications(quotes, products);
  const { readIds, markRead, markAllRead } = useNotificationStore();
  const analytics = useAnalytics(quotes);
  const [showAllNotifs, setShowAllNotifs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Active unread notifications
  const unreadNotifs = notifications.filter((n) => !readIds.includes(n.id));
  const displayedNotifs = showAllNotifs ? unreadNotifs : unreadNotifs.slice(0, 3);

  // Push notifications for active alerts
  usePushNotificationManager(unreadNotifs);

  useEffect(() => {
    loadNotificationState();
    fetchQuotes();
    fetchEmployees();
    fetchProducts();
  }, []);

  const pendingCount = quotes.filter((q) => q.status === 'Sent').length;
  const recentQuotes = quotes.filter(q => 
    !searchQuery || 
    q.client_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    q.quote_number.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const firstName = user?.displayName?.split(' ')[0] || 'there';
  const isBoss = user?.role === 'boss';

  // Material Pixel Squircle Tile Actions
  const squircleGridActions = [
    { icon: 'add-circle-outline', label: 'New Quote', screen: 'Quotes', sub: 'CreateQuote', stat: `${quotes.length}` },
    { icon: 'cube-outline', label: 'Products', screen: 'Products', sub: 'ProductsList', stat: `${products.length}` },
    { icon: 'people-outline', label: 'Employees', screen: 'People', sub: 'EmployeesList', stat: `${employees.length}` },
    { icon: 'wallet-outline', label: 'Payments', screen: 'Home', sub: 'AnalyticsDashboard', stat: `${analytics.pendingPaymentsCount}` },
    { icon: 'calendar-outline', label: 'Quotes', screen: 'Quotes', stat: null },
    { icon: 'stats-chart-outline', label: 'Analytics', screen: 'Home', sub: 'AnalyticsDashboard', stat: null },
    { icon: 'layers-outline', label: 'Reorder', screen: 'Products', sub: 'ReorderStock', stat: null },
    { icon: 'options-outline', label: 'Settings', screen: 'Profile', stat: null },
  ];

  const handleRefresh = () => { fetchQuotes(); fetchEmployees(); fetchProducts(); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Background Pixel Line Art & Organic Shape Accents (Active in both Light and Dark modes) */}
      <View style={styles.bgBlobTopRight} />
      <View style={styles.curvedRingTopRight} />
      <View style={styles.bgBlobMiddleLeft} />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={qLoading} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── Top User Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greetingTitle}>Hello</Text>
            <Text style={styles.greetingName}>{user?.displayName || 'David Friedman'}</Text>
          </View>
          <TouchableOpacity onPress={() => nav.navigate('Profile')} activeOpacity={0.85}>
            <View style={styles.avatarRing}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Material Quick Action Pills ──────────────────────── */}
        <View style={styles.pillActionsRow}>
          <TouchableOpacity
            style={styles.actionPill}
            onPress={() => nav.navigate('Quotes', { screen: 'CreateQuote' })}
            activeOpacity={0.8}
          >
            <View style={styles.pillIconCircle}>
              <Ionicons name="add" size={16} color={colors.primary} />
            </View>
            <Text style={styles.pillText}>New Quote</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionPill}
            onPress={() => setShowAllNotifs((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={styles.pillIconCircle}>
              <Ionicons name="notifications-outline" size={16} color={colors.primary} />
              {unreadNotifs.length > 0 && <View style={styles.pillBadgeDot} />}
            </View>
            <Text style={styles.pillText}>Alerts ({unreadNotifs.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionPill}
            onPress={() => nav.navigate('Home', { screen: 'AnalyticsDashboard' })}
            activeOpacity={0.8}
          >
            <View style={styles.pillIconCircle}>
              <Ionicons name="stats-chart-outline" size={16} color={colors.primary} />
            </View>
            <Text style={styles.pillText}>Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* ── Material Search Bar ────────────────────────── */}
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search For..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.searchCircleBtn} activeOpacity={0.85}>
            <Ionicons name="search" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Sleek Executive Summary Card ── */}
        <View style={styles.heroBanner}>
          <LinearGradient
            colors={isDark ? ['#1E1E1E', '#252525'] : ['#0F5A2A', '#166534']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBannerGradient}
          >
            <View style={styles.heroHeaderRow}>
              <View style={styles.heroHeaderTitleGroup}>
                <Text style={styles.heroSubText}>BUSINESS PERFORMANCE</Text>
                <Text style={styles.heroTitleText}>
                  {isBoss ? 'Revenue Overview' : 'My Performance'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.heroArrowCircle}
                onPress={() => nav.navigate('Home', { screen: 'AnalyticsDashboard' })}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.heroValueText}>
              {formatCurrency(analytics.totalRevenue)}
            </Text>

            <View style={styles.heroKpiRow}>
              <View style={styles.heroKpiItem}>
                <Text style={styles.heroKpiLabel}>Win Rate</Text>
                <Text style={styles.heroKpiValue}>{analytics.conversionRate.toFixed(0)}%</Text>
              </View>
              <View style={styles.heroKpiDivider} />
              <View style={styles.heroKpiItem}>
                <Text style={styles.heroKpiLabel}>Pipeline</Text>
                <Text style={styles.heroKpiValue}>{quotes.length} Quotes</Text>
              </View>
              <View style={styles.heroKpiDivider} />
              <View style={styles.heroKpiItem}>
                <Text style={styles.heroKpiLabel}>Avg Deal</Text>
                <Text style={styles.heroKpiValue}>{formatCurrency(analytics.averageQuoteValue)}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── Squircle Icon Tile Grid 4x2 ─────────────────────────── */}
        <View style={styles.squircleGrid}>
          {squircleGridActions.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.squircleTile}
              onPress={() => {
                if (item.sub) nav.navigate(item.screen, { screen: item.sub });
                else nav.navigate(item.screen as any);
              }}
              activeOpacity={0.82}
            >
              <View style={styles.squircleIconWrap}>
                <Ionicons name={item.icon as any} size={22} color={colors.primary} />
                {item.stat !== null && (
                  <View style={styles.tileStatBadge}>
                    <Text style={styles.tileStatText}>{item.stat}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.squircleLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Notifications / Active Alerts ───────────────────── */}
        {unreadNotifs.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>System Alerts</Text>
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadNotifs.length}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => markAllRead(unreadNotifs.map((n) => n.id))}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            </View>

            {displayedNotifs.map((notif) => {
              const c = PRIORITY_COLOR[notif.priority] || colors.textSecondary;
              return (
                <TouchableOpacity
                  key={notif.id}
                  style={styles.notifCard}
                  onPress={() => {
                    markRead(notif.id);
                    if (notif.actionScreen === 'QuoteDetail' && notif.actionParams) {
                      nav.navigate('Quotes', { screen: 'QuoteDetail', params: notif.actionParams });
                    } else if (notif.actionScreen === 'StockManagement') {
                      nav.navigate('Products', { screen: 'StockManagement' });
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.notifIcon, { backgroundColor: c + '18' }]}>
                    <Ionicons name={notif.icon as any} size={16} color={c} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>
                      {notif.title}
                    </Text>
                    <Text style={styles.notifBody} numberOfLines={1}>{notif.body}</Text>
                  </View>
                  <View style={[styles.unreadDot, { backgroundColor: c }]} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Recent Quotes Section ───────────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Recent Quotes</Text>
          <TouchableOpacity onPress={() => nav.navigate('Quotes')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {recentQuotes.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="document-text-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No quotes found</Text>
            <Text style={styles.emptySub}>Tap + New Quote to generate a client estimate</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => nav.navigate('Quotes', { screen: 'CreateQuote' })}
            >
              <Text style={styles.emptyBtnText}>+ New Quote</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentQuotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              onPress={() => nav.navigate('Quotes', { screen: 'QuoteDetail', params: { quoteId: quote.id } })}
            />
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any, insets?: any, isDark?: boolean) => StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 20 },

  // Background Accent Shapes (Vibrant in both Dark & Light modes)
  bgBlobTopRight: {
    position: 'absolute', top: -30, right: -40,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: isDark ? colors.primary + '45' : 'rgba(215, 238, 223, 0.6)',
    opacity: isDark ? 0.7 : 0.9,
  },
  curvedRingTopRight: {
    position: 'absolute', top: 50, right: -20,
    width: 200, height: 200, borderRadius: 100,
    borderWidth: 1.5,
    borderColor: isDark ? colors.primary + '70' : colors.primary + '30',
  },
  bgBlobMiddleLeft: {
    position: 'absolute', top: 320, left: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: isDark ? colors.primary + '30' : 'rgba(215, 238, 223, 0.35)',
    opacity: isDark ? 0.6 : 0.8,
  },

  // Top User Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Math.max(insets?.top || 0, 24) + 16,
    paddingBottom: 16,
  },
  headerLeft: { flex: 1 },
  greetingTitle: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  greetingName: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginTop: 1, letterSpacing: -0.4 },

  avatarRing: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: colors.primary,
    padding: 2, alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Material Quick Pill Actions Row
  pillActionsRow: {
    flexDirection: 'row', gap: 10, marginBottom: 16,
  },
  actionPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 10, paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: colors.border,
    ...Shadow.xs,
  },
  pillIconCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  pillBadgeDot: {
    position: 'absolute', top: 2, right: 2,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.statusRejected,
  },
  pillText: { fontSize: 12, fontWeight: '700', color: colors.textPrimary, flex: 1 },

  // Material Search Input Bar
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: colors.border,
    paddingLeft: 16, paddingRight: 4, paddingVertical: 4,
    marginBottom: 18, ...Shadow.xs,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, height: 40 },
  searchCircleBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  // Premium Executive Summary Hero Card
  heroBanner: {
    borderRadius: Radius.xl,
    marginBottom: 20,
    overflow: 'hidden',
    ...Shadow.md,
  },
  heroBannerGradient: {
    borderRadius: Radius.xl,
    padding: 20,
  },
  heroHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  heroHeaderTitleGroup: { flex: 1 },
  heroSubText: { fontSize: 11, color: isDark ? '#A1A1AA' : 'rgba(255,255,255,0.75)', fontWeight: '700', letterSpacing: 0.5 },
  heroTitleText: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 2 },
  heroArrowCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: isDark ? '#2D2D2D' : 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  heroValueText: { fontSize: 28, fontWeight: '800', color: isDark ? colors.primary : '#A3D9A5', marginBottom: 16, letterSpacing: -0.5 },

  heroKpiRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.15)',
    borderRadius: Radius.lg, paddingVertical: 10, paddingHorizontal: 14,
  },
  heroKpiItem: { flex: 1, alignItems: 'center' },
  heroKpiLabel: { fontSize: 10, fontWeight: '600', color: isDark ? '#A1A1AA' : 'rgba(255,255,255,0.75)', marginBottom: 2 },
  heroKpiValue: { fontSize: 13, fontWeight: '800', color: '#fff' },
  heroKpiDivider: { width: 1, height: 24, backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.2)' },

  // Squircle Tile 4x2 Grid
  squircleGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between',
    marginBottom: 12,
  },
  squircleTile: {
    width: '22%', alignItems: 'center', marginVertical: 4,
  },
  squircleIconWrap: {
    width: 58, height: 58, borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6, ...Shadow.xs,
  },
  tileStatBadge: {
    position: 'absolute', top: -3, right: -3,
    backgroundColor: colors.primary,
    borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1,
  },
  tileStatText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  squircleLabel: { fontSize: 11, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.2 },
  seeAll: { fontSize: 13, fontWeight: '600', color: colors.primary },

  // Notifications
  unreadBadge: {
    backgroundColor: colors.statusRejected,
    borderRadius: Radius.full,
    width: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  markAllText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  notifCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 8,
    ...Shadow.xs,
  },
  notifIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  notifTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  notifBody: { fontSize: 12, color: colors.textSecondary },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 24, paddingVertical: 12,
    ...Shadow.sm,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
