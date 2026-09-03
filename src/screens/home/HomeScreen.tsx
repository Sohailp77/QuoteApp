import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets);
  const user = useAuthStore((s) => s.user);
  const nav = useNavigation<any>();
  const { quotes, loading: qLoading, fetch: fetchQuotes } = useQuotes();
  const { employees, fetch: fetchEmployees } = useEmployees();
  const { products, fetch: fetchProducts } = useProducts();
  const notifications = useNotifications(quotes, products);
  const { readIds, markRead, markAllRead } = useNotificationStore();
  const analytics = useAnalytics(quotes);
  const [showAllNotifs, setShowAllNotifs] = useState(false);

  // Active unread notifications
  const unreadNotifs = notifications.filter((n) => !readIds.includes(n.id));
  const displayedNotifs = showAllNotifs ? unreadNotifs : unreadNotifs.slice(0, 3);

  // Integrate Push Notifications for active alerts (auto-cancels when resolved)
  usePushNotificationManager(unreadNotifs);

  useEffect(() => {
    loadNotificationState();
    fetchQuotes();
    fetchEmployees();
    fetchProducts();
  }, []);

  const pendingCount = quotes.filter((q) => q.status === 'Sent').length;
  const recentQuotes = quotes.slice(0, 5);
  const firstName = user?.displayName?.split(' ')[0] || 'there';
  const isBoss = user?.role === 'boss';

  // Quick-action tile configuration with dynamic stats
  const quickActions = [
    { icon: 'add-circle', label: 'Total Quote', color: '#2BAE78', screen: 'Quotes', sub: 'CreateQuote', stat: quotes.length },
    { icon: 'people', label: 'Employees', color: '#F5813C', screen: 'People', sub: 'EmployeesList', stat: employees.length },
    { icon: 'cube', color: '#2D3A6A', label: 'Products', screen: 'Products', sub: 'ProductsList', stat: products.length },
    { icon: 'wallet', label: 'Pending Payments', color: '#00B4D8', screen: 'Home', sub: 'AnalyticsDashboard', stat: formatCurrency(analytics.pendingPaymentsTotal) },
  ];

  const handleRefresh = () => { fetchQuotes(); fetchEmployees(); fetchProducts(); };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={qLoading} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      {/* ── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}><Text style={styles.greeting}>Hello, {firstName}</Text>
          {/* text with small quotes for sales and growth inspiration quotes random quotes from array*/}
          <Text style={styles.subGreeting}>"Sales are the lifeblood of any business"</Text>



        </View>
        <TouchableOpacity onPress={() => nav.navigate('Profile')} activeOpacity={0.8}>
          <View style={styles.avatarWrap}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Revenue banner (boss only) ──────────────────── */}
      {isBoss && (
        <TouchableOpacity
          style={styles.revenueBanner}
          onPress={() => nav.navigate('Home', { screen: 'AnalyticsDashboard' })}
          activeOpacity={0.85}
        >
          <View style={styles.revenueBannerInner}>
            <View style={styles.revenueBannerLeft}>
              <Text style={styles.revenueBannerLabel}>Total Revenue</Text>
              <Text style={styles.revenueBannerValue}>{formatCurrency(analytics.totalRevenue)}</Text>
              <Text style={styles.revenueBannerSub}>
                Today: {formatCurrency(analytics.todayRevenue)}  ·  Month: {formatCurrency(analytics.thisMonthRevenue)}
              </Text>
            </View>
            <View style={styles.revenueBannerIconWrap}>
              <Ionicons name="trending-up" size={28} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* ── Pending alert pill ──────────────────────────── */}
      {pendingCount > 0 && (
        <TouchableOpacity style={styles.alertPill} onPress={() => nav.navigate('Quotes')} activeOpacity={0.85}>
          <View style={styles.alertDot} />
          <Text style={styles.alertText}>
            {pendingCount} quote{pendingCount > 1 ? 's' : ''} awaiting response
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.accent} />
        </TouchableOpacity>
      )}

      {/* ── Quick Actions ── coloured tile grid ────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Dashboard</Text>
      </View>
      <View style={styles.tilesGrid}>
        {quickActions.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={[styles.tile, { backgroundColor: a.color }]}
            onPress={() => {
              if (a.sub) {
                nav.navigate(a.screen, { screen: a.sub });
              } else {
                nav.navigate(a.screen as any);
              }
            }}
            activeOpacity={0.82}
          >
            <View style={styles.tileHeader}>
              <View style={styles.tileIconWrap}>
                <Ionicons name={a.icon as any} size={24} color="#fff" />
              </View>
            </View>
            <View style={styles.tileFooter}>
              {a.stat !== null && <Text style={styles.tileStat}>{a.stat}</Text>}
              <Text style={styles.tileLabel}>{a.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Notifications ───────────────────────────────── */}
      {/* ── Notifications / Alerts ───────────────────────────── */}
      {unreadNotifs.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Alerts</Text>
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

          {unreadNotifs.length > 3 && (
            <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllNotifs((v) => !v)}>
              <Text style={styles.showMoreText}>
                {showAllNotifs ? 'Show less' : `Show ${unreadNotifs.length - 3} more`}
              </Text>
              <Ionicons name={showAllNotifs ? 'chevron-up' : 'chevron-down'} size={13} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Recent Quotes ───────────────────────────────── */}
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
          <Text style={styles.emptyTitle}>No quotes yet</Text>
          <Text style={styles.emptySub}>Create your first quote to get started</Text>
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
  );
};

const createStyles = (colors: any, insets?: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 20 },

  // ── Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Math.max(insets?.top || 0, 24) + 16,
    paddingBottom: 20,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.4 },
  subGreeting: { fontSize: 13, color: colors.textSecondary, marginTop: 2, fontWeight: '400' },
  avatarWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // ── Revenue Banner
  revenueBanner: {
    backgroundColor: colors.primary,
    borderRadius: Radius.xl,
    marginBottom: 16,
    overflow: 'hidden',
    ...Shadow.green,
  },
  revenueBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  revenueBannerLeft: { flex: 1 },
  revenueBannerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  revenueBannerValue: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginTop: 2 },
  revenueBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  revenueBannerIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Alert pill
  alertPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.accent + '15',
    borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1, borderColor: colors.accent + '30',
  },
  alertDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  alertText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.accent },

  // ── Section headers
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.2 },
  seeAll: { fontSize: 13, fontWeight: '600', color: colors.primary },

  // ── Tile grid (reference-style coloured squares)
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  tile: {
    width: '47%',
    borderRadius: Radius.tile,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 120,
    ...Shadow.md,
  },
  tileHeader: {
    alignItems: 'flex-start',
  },
  tileIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  tileFooter: {
    gap: 2,
    marginTop: 12,
  },
  tileStat: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  tileLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },

  // ── Stats grid
  statsGrid: { flexDirection: 'row', gap: 12 },

  // ── Notifications
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
    padding: 14, marginBottom: 8,
    ...Shadow.xs,
  },
  notifCardRead: { opacity: 0.5 },
  notifIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  notifTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  notifBody: { fontSize: 12, color: colors.textSecondary },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 8,
  },
  showMoreText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  // ── Empty state
  emptyState: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: colors.primary + '15',
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
