import React, { useEffect } from 'react';
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
import { StatCard } from '../../components/ui/StatCard';
import { QuoteCard } from '../../components/QuoteCard';
import { Colors, Spacing } from '../../theme';

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

export const HomeScreen: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const nav = useNavigation<any>();
  const { quotes, loading: qLoading, fetch: fetchQuotes } = useQuotes();
  const { employees, fetch: fetchEmployees } = useEmployees();
  const { products, fetch: fetchProducts } = useProducts();

  useEffect(() => {
    fetchQuotes();
    fetchEmployees();
    fetchProducts();
  }, []);

  const totalRevenue = quotes
    .filter((q) => q.status === 'Accepted')
    .reduce((sum, q) => sum + q.total, 0);
  const pendingCount = quotes.filter((q) => q.status === 'Sent').length;
  const recentQuotes = quotes.slice(0, 5);
  const firstName = user?.displayName?.split(' ')[0] || 'there';

  return (
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={qLoading}
          onRefresh={() => { fetchQuotes(); fetchEmployees(); fetchProducts(); }}
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
        {user?.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
          </View>
        )}
      </View>

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
          value={formatCurrency(totalRevenue)}
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
          { icon: 'add-circle-outline', label: 'New Quote', screen: 'CreateQuote' },
          { icon: 'person-add-outline', label: 'Add Employee', screen: 'EmployeeForm' },
          { icon: 'cube-outline', label: 'Add Product', screen: 'ProductForm' },
        ].map((action) => (
          <TouchableOpacity
            key={action.screen}
            style={styles.actionBtn}
            onPress={() => nav.navigate(action.screen)}
            activeOpacity={0.8}
          >
            <View style={styles.actionIcon}>
              <Ionicons name={action.icon as any} size={22} color={Colors.accent} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
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
            onPress={() => nav.navigate('CreateQuote')}
          >
            <Text style={styles.emptyBtnText}>Create Quote</Text>
          </TouchableOpacity>
        </View>
      ) : (
        recentQuotes.map((quote) => (
          <QuoteCard
            key={quote.id}
            quote={quote}
            onPress={() => nav.navigate('QuoteDetail', { quoteId: quote.id })}
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
    paddingBottom: 24,
  },
  greeting: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  subGreeting: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  seeAll: { fontSize: 14, color: Colors.accent, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1 },
  alertBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertText: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  emptyBtn: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 50,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
