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
import { useNotifications } from '../../hooks/useNotifications';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useAnalytics } from '../../hooks/useAnalytics';
import { StatCard } from '../../components/ui/StatCard';
import { QuoteCard } from '../../components/QuoteCard';
import { Colors, Radius, Shadow, Spacing } from '../../theme';

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

const PRIORITY_BG: Record<string, string> = {
  critical: '#FEF2F2',
  warning: '#FFFBEB',
  info: '#EFF6FF',
};

export const HomeScreen: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const nav = useNavigation<any>();
  const { quotes, loading: qLoading, fetch: fetchQuotes } = useQuotes();
  const { employees, fetch: fetchEmployees } = useEmployees();
  const { products, fetch: fetchProducts } = useProducts();
  const notifications = useNotifications(quotes, products);
  const { readIds, markRead, markAllRead } = useNotificationStore();
  const analytics = useAnalytics(quotes);
  const [showAllNotifs, setShowAllNotifs] = useState(false);

  useEffect(() => {
    fetchQuotes();
    fetchEmployees();
    fetchProducts();
  }, []);

  const unreadNotifs = notifications.filter((n) => !readIds.includes(n.id));
  const displayedNotifs = showAllNotifs ? notifications : notifications.slice(0, 3);

  const pendingCount = quotes.filter((q) => q.status === 'Sent').length;
  const recentQuotes = quotes.slice(0, 5);
  const firstName = user?.displayName?.split(' ')[0] || 'there';
  const isBoss = user?.role === 'boss';

  const handleRefresh = () => {
    fetchQuotes();
    fetchEmployees();
    fetchProducts();
  };

  return (
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={qLoading}
          onRefresh={handleRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
          <Text style={styles.subGreeting}>Welcome to QuoteApp</Text>
        </View>
        <TouchableOpacity onPress={() => nav.navigate('Profile')}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Boss Dashboard Strip */}
      {isBoss && (
        <TouchableOpacity
          style={styles.bossStrip}
          onPress={() => nav.navigate('Home', { screen: 'AnalyticsDashboard' })}
          activeOpacity={0.88}
        >
          <View style={styles.bossStripLeft}>
            <Text style={styles.bossStripTitle}>Boss Dashboard</Text>
            <Text style={styles.bossStripSub}>Today: {formatCurrency(analytics.todayRevenue)}</Text>
          </View>
          <View style={styles.bossStripMini}>
            <Text style={styles.bossStripMiniLabel}>This Month</Text>
            <Text style={styles.bossStripMiniValue}>{formatCurrency(analytics.thisMonthRevenue)}</Text>
          </View>
          <View style={[styles.bossStripMini, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.bossStripMiniLabel}>Pending ₹</Text>
            <Text style={styles.bossStripMiniValue}>{formatCurrency(analytics.pendingPaymentsTotal)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      )}

      {/* Notification Center */}
      {notifications.length > 0 && (
        <View style={styles.notifSection}>
          <View style={styles.notifHeader}>
            <View style={styles.notifTitleRow}>
              <Ionicons name="notifications" size={16} color={Colors.textPrimary} />
              <Text style={styles.notifTitle}>Alerts</Text>
              {unreadNotifs.length > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{unreadNotifs.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => markAllRead(notifications.map((n) => n.id))}>
              <Text style={styles.markAllRead}>Mark all read</Text>
            </TouchableOpacity>
          </View>

          {displayedNotifs.map((notif) => {
            const isRead = readIds.includes(notif.id);
            return (
              <TouchableOpacity
                key={notif.id}
                style={[
                  styles.notifCard,
                  { backgroundColor: PRIORITY_BG[notif.priority] },
                  isRead && styles.notifCardRead,
                ]}
                onPress={() => {
                  markRead(notif.id);
                  if (notif.actionScreen === 'QuoteDetail' && notif.actionParams) {
                    nav.navigate('Quotes', { screen: 'QuoteDetail', params: notif.actionParams });
                  } else if (notif.actionScreen === 'Quotes') {
                    nav.navigate('Quotes');
                  } else if (notif.actionScreen === 'StockManagement') {
                    nav.navigate('Products', { screen: 'StockManagement' });
                  }
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.notifIconWrap, { backgroundColor: PRIORITY_COLOR[notif.priority] + '20' }]}>
                  <Ionicons name={notif.icon as any} size={18} color={PRIORITY_COLOR[notif.priority]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.notifCardTitle, isRead && { color: Colors.textSecondary }]}>
                    {notif.title}
                  </Text>
                  <Text style={styles.notifCardBody} numberOfLines={2}>{notif.body}</Text>
                </View>
                {!isRead && <View style={[styles.unreadDot, { backgroundColor: PRIORITY_COLOR[notif.priority] }]} />}
              </TouchableOpacity>
            );
          })}

          {notifications.length > 3 && (
            <TouchableOpacity
              style={styles.showMoreBtn}
              onPress={() => setShowAllNotifs((v) => !v)}
            >
              <Text style={styles.showMoreText}>
                {showAllNotifs ? 'Show less' : `Show ${notifications.length - 3} more`}
              </Text>
              <Ionicons
                name={showAllNotifs ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={Colors.accent}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Stats */}
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.statsRow}>
        <StatCard
          label="Total Quotes"
          value={quotes.length}
          icon="document-text-outline"
          color="#6C63FF"
          style={styles.statCard}
        />
        <StatCard
          label="Employees"
          value={employees.length}
          icon="people-outline"
          color="#10B981"
          style={styles.statCard}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          label="Products"
          value={products.length}
          icon="cube-outline"
          color="#F59E0B"
          style={styles.statCard}
        />
        <StatCard
          label="Revenue"
          value={formatCurrency(analytics.totalRevenue)}
          icon="cash-outline"
          color="#3B82F6"
          style={styles.statCard}
        />
      </View>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={() => nav.navigate('Quotes')}
          activeOpacity={0.85}
        >
          <View style={styles.alertLeft}>
            <Ionicons name="time-outline" size={20} color="#F59E0B" />
            <Text style={styles.alertText}>
              {pendingCount} quote{pendingCount > 1 ? 's' : ''} awaiting response
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        {[
          { icon: 'add-circle-outline', label: 'New Quote', action: () => nav.navigate('Quotes', { screen: 'CreateQuote' }) },
          { icon: 'people-circle-outline', label: 'Add Customer', action: () => nav.navigate('People', { screen: 'CustomerForm', params: {} }) },
          { icon: 'cube-outline', label: 'Add Product', action: () => nav.navigate('Products', { screen: 'ProductForm', params: {} }) },
        ].map((a) => (
          <TouchableOpacity
            key={a.label}
            style={styles.actionBtn}
            onPress={a.action}
            activeOpacity={0.8}
          >
            <View style={styles.actionIcon}>
              <Ionicons name={a.icon as any} size={22} color={Colors.accent} />
            </View>
            <Text style={styles.actionLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Quotes */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Quotes</Text>
        <TouchableOpacity onPress={() => nav.navigate('Quotes')}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      {recentQuotes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No quotes yet</Text>
          <Text style={styles.emptySubtitle}>Create your first quote to get started</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => nav.navigate('Quotes', { screen: 'CreateQuote' })}
          >
            <Text style={styles.emptyBtnText}>Create Quote</Text>
          </TouchableOpacity>
        </View>
      ) : (
        recentQuotes.map((quote) => (
          <QuoteCard
            key={quote.id}
            quote={quote}
            onPress={() =>
              nav.navigate('Quotes', { screen: 'QuoteDetail', params: { quoteId: quote.id } })
            }
          />
        ))
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
  },
  greeting: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  subGreeting: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Boss strip
  bossStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: 16, marginBottom: 16,
    ...Shadow.md,
  },
  bossStripLeft: { flex: 1 },
  bossStripTitle: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
  bossStripSub: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 2 },
  bossStripMini: { paddingLeft: 12 },
  bossStripMiniLabel: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  bossStripMiniValue: { fontSize: 13, fontWeight: '700', color: '#fff', marginTop: 2 },

  // Notifications
  notifSection: { marginBottom: 20 },
  notifHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: Radius.full,
    width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  markAllRead: { fontSize: 13, fontWeight: '600', color: Colors.accent },
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: Radius.lg, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'transparent',
  },
  notifCardRead: { opacity: 0.5 },
  notifIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  notifCardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 3 },
  notifCardBody: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10,
  },
  showMoreText: { fontSize: 13, fontWeight: '600', color: Colors.accent },

  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: Colors.textPrimary,
    marginBottom: 12, marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, marginTop: 4,
  },
  seeAll: { fontSize: 14, color: Colors.accent, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1 },
  alertBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertText: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: 14, alignItems: 'center', paddingVertical: 14, gap: 8,
    ...Shadow.sm,
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.accent + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  emptyBtn: {
    marginTop: 12, backgroundColor: Colors.primary,
    borderRadius: 50, paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
