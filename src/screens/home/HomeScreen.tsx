import React, { useEffect, useState, useMemo } from 'react';
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
import { useReorders } from '../../hooks/useReorders';
import { useDirectSales } from '../../hooks/useDirectSales';
import { useCustomers } from '../../hooks/useCustomers';
import { useVendors } from '../../hooks/useVendors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../../hooks/useNotifications';
import { useNotificationStore, loadNotificationState } from '../../store/useNotificationStore';
import { usePushNotificationManager } from '../../hooks/usePushNotificationManager';
import { useAnalytics } from '../../hooks/useAnalytics';
import { QuoteCard } from '../../components/QuoteCard';
import { Radius, Shadow } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { AppBackground } from '../../components/AppBackground';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import { animateLayout } from '../../utils/animation';

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

const APP_COMMANDS = [
  { icon: 'add-circle', label: 'Create New Quote', screen: 'Quotes', sub: 'CreateQuote', type: 'Action' },
  { icon: 'add-circle-outline', label: 'Add Product', screen: 'Products', sub: 'ProductForm', type: 'Action' },
  { icon: 'cart-outline', label: 'Create Direct Sale', screen: 'Sales', sub: 'CreateDirectSale', type: 'Action' },
  { icon: 'person-add-outline', label: 'Add Customer', screen: 'People', sub: 'CustomerForm', type: 'Action' },
  { icon: 'business-outline', label: 'Add Vendor', screen: 'Products', sub: 'VendorForm', type: 'Action' },
  { icon: 'people-outline', label: 'Add Employee', screen: 'People', sub: 'EmployeeForm', type: 'Action' },
  { icon: 'analytics-outline', label: 'Analytics Dashboard', screen: 'Home', sub: 'AnalyticsDashboard', type: 'Navigation' },
  { icon: 'cube-outline', label: 'Stock Management', screen: 'Products', sub: 'StockManagement', type: 'Navigation' },
  { icon: 'layers-outline', label: 'Reorder Stock', screen: 'Products', sub: 'ReorderStock', type: 'Navigation' },
  { icon: 'wallet-outline', label: 'Payments & Debits', screen: 'Profile', sub: 'PaymentsList', type: 'Navigation' },
  { icon: 'grid-outline', label: 'Category Manager', screen: 'Products', sub: 'CategoryManager', type: 'Navigation' },
  { icon: 'settings-outline', label: 'Company Settings', screen: 'Profile', sub: 'CompanySettings', type: 'Settings' },
  { icon: 'cash-outline', label: 'Tax Rates & GST', screen: 'Profile', sub: 'TaxRates', type: 'Settings' },
  { icon: 'location-outline', label: 'Warehouse Management', screen: 'Profile', sub: 'Warehouse', type: 'Settings' },
];

export const HomeScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const styles = createStyles(colors, insets, isDark);
  const user = useAuthStore((s) => s.user);
  const nav = useNavigation<any>();
  const { quotes, loading: qLoading, fetch: fetchQuotes } = useQuotes();
  const { employees, fetch: fetchEmployees } = useEmployees();
  const { products, fetch: fetchProducts } = useProducts();
  const { reorders, fetch: fetchReorders } = useReorders();
  const { directSales, fetch: fetchDirectSales } = useDirectSales();
  const { customers, fetch: fetchCustomers } = useCustomers();
  const { vendors, fetch: fetchVendors } = useVendors();

  const notifications = useNotifications(quotes, products);
  const { readIds, markRead, markAllRead } = useNotificationStore();
  const analytics = useAnalytics(quotes, reorders, directSales);
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
    fetchReorders();
    fetchDirectSales();
    fetchCustomers();
    fetchVendors();
  }, []);

  const handleSearchChange = (text: string) => {
    animateLayout();
    setSearchQuery(text);
  };

  // Universal Search Logic
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matchedCommands = APP_COMMANDS.filter(
      (c) => c.label.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)
    );

    const matchedQuotes = quotes.filter(
      (item) =>
        item.quote_number.toLowerCase().includes(q) ||
        item.client_name.toLowerCase().includes(q) ||
        (item.client_phone && item.client_phone.toLowerCase().includes(q)) ||
        (item.client_email && item.client_email.toLowerCase().includes(q)) ||
        (item.status && item.status.toLowerCase().includes(q))
    ).slice(0, 5);

    const matchedProducts = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
    ).slice(0, 5);

    const matchedSales = directSales.filter(
      (s) =>
        s.sale_number.toLowerCase().includes(q) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
        (s.payment_status && s.payment_status.toLowerCase().includes(q))
    ).slice(0, 5);

    const matchedCustomers = (customers || []).filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.gst_number && c.gst_number.toLowerCase().includes(q))
    ).slice(0, 5);

    const matchedVendors = (vendors || []).filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.contact_person && v.contact_person.toLowerCase().includes(q)) ||
        (v.phone && v.phone.includes(q)) ||
        (v.email && v.email.toLowerCase().includes(q))
    ).slice(0, 5);

    const matchedEmployees = employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        (e.phone && e.phone.includes(q))
    ).slice(0, 5);

    const totalCount =
      matchedCommands.length +
      matchedQuotes.length +
      matchedProducts.length +
      matchedSales.length +
      matchedCustomers.length +
      matchedVendors.length +
      matchedEmployees.length;

    return {
      commands: matchedCommands,
      quotes: matchedQuotes,
      products: matchedProducts,
      sales: matchedSales,
      customers: matchedCustomers,
      vendors: matchedVendors,
      employees: matchedEmployees,
      totalCount,
    };
  }, [searchQuery, quotes, products, directSales, customers, vendors, employees]);

  const pendingCount = quotes.filter((q) => q.status === 'Sent').length;
  const recentQuotes = quotes.slice(0, 5);

  const firstName = user?.displayName?.split(' ')[0] || 'there';
  const isBoss = user?.role === 'boss';

  // Material Pixel Squircle Tile Actions
  const squircleGridActions = [
    { icon: 'add-circle-outline', label: 'New Quote', screen: 'Quotes', sub: 'CreateQuote', stat: `${quotes.length}` },
    { icon: 'cube-outline', label: 'Products', screen: 'Products', sub: 'ProductsList', stat: `${products.length}` },
    { icon: 'people-outline', label: 'Employees', screen: 'People', sub: 'EmployeesList', stat: `${employees.length}` },
    { icon: 'wallet-outline', label: 'Payments', screen: 'Profile', sub: 'PaymentsList', stat: `${analytics.pendingPaymentsCount}` },
    { icon: 'receipt-outline', label: 'Direct Sales', screen: 'Sales', sub: 'DirectSalesList', stat: null },
    { icon: 'business-outline', label: 'Vendors', screen: 'Products', sub: 'VendorsList', stat: null },
    { icon: 'calendar-outline', label: 'Quotes', screen: 'Quotes', stat: null },
    { icon: 'stats-chart-outline', label: 'Analytics', screen: 'Home', sub: 'AnalyticsDashboard', stat: null },
    { icon: 'layers-outline', label: 'Reorder', screen: 'Products', sub: 'ReorderStock', stat: null },
    { icon: 'options-outline', label: 'Settings', screen: 'Profile', stat: null },
  ];

  const handleRefresh = () => {
    fetchQuotes();
    fetchEmployees();
    fetchProducts();
    fetchReorders();
    fetchDirectSales();
    fetchCustomers();
    fetchVendors();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBackground />

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
            <Text style={styles.greetingName}>{user?.displayName || 'user'}</Text>
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

          <TouchableOpacity
            style={styles.actionPill}
            onPress={() => nav.navigate('Sales', { screen: 'DirectSalesList' })}
            activeOpacity={0.8}
          >
            <View style={styles.pillIconCircle}>
              <Ionicons name="receipt-outline" size={16} color={colors.primary} />
            </View>
            <Text style={styles.pillText}>Sales</Text>
          </TouchableOpacity>
        </View>

        {/* ── Universal App-Wide Search Bar ────────────────────────── */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search quotes, products, vendors, customers, screens..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {searchQuery !== '' ? (
            <TouchableOpacity onPress={() => handleSearchChange('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <View style={styles.searchCircleBtn}>
              <Ionicons name="search" size={16} color="#fff" />
            </View>
          )}
        </View>

        {/* ── Universal Search Results Hub (Shown when search query exists) ── */}
        {searchResults && (
          <View style={styles.searchResultsPanel}>
            <View style={styles.searchPanelHeader}>
              <Text style={styles.searchPanelTitle}>SEARCH RESULTS</Text>
              <View style={styles.resultBadge}>
                <Text style={styles.resultBadgeText}>{searchResults.totalCount} matches</Text>
              </View>
            </View>

            {searchResults.totalCount === 0 ? (
              <View style={styles.noSearchMatch}>
                <Ionicons name="search-outline" size={36} color={colors.textMuted} />
                <Text style={styles.noMatchTitle}>No matching items found</Text>
                <Text style={styles.noMatchSub}>
                  No quotes, products, vendors, customers, or commands match "{searchQuery}".
                </Text>
              </View>
            ) : (
              <View style={styles.searchResultsList}>
                {/* ⚡ App Commands Section */}
                {searchResults.commands.length > 0 && (
                  <View style={styles.searchGroup}>
                    <Text style={styles.groupTitle}>ACTIONS & NAVIGATION ({searchResults.commands.length})</Text>
                    {searchResults.commands.map((c, i) => (
                      <TouchableOpacity
                        key={`cmd-${i}`}
                        style={styles.resultRow}
                        onPress={() => {
                          handleSearchChange('');
                          if (c.sub) nav.navigate(c.screen, { screen: c.sub });
                          else nav.navigate(c.screen as any);
                        }}
                      >
                        <View style={[styles.resultIconWrap, { backgroundColor: colors.primary + '18' }]}>
                          <Ionicons name={c.icon as any} size={18} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.resultMainTitle}>{c.label}</Text>
                          <Text style={styles.resultSubTitle}>{c.type} Shortcut</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 📄 Quotes Section */}
                {searchResults.quotes.length > 0 && (
                  <View style={styles.searchGroup}>
                    <Text style={styles.groupTitle}>QUOTES ({searchResults.quotes.length})</Text>
                    {searchResults.quotes.map((q) => (
                      <TouchableOpacity
                        key={`quote-${q.id}`}
                        style={styles.resultRow}
                        onPress={() => {
                          handleSearchChange('');
                          nav.navigate('Quotes', { screen: 'QuoteDetail', params: { quoteId: q.id } });
                        }}
                      >
                        <View style={[styles.resultIconWrap, { backgroundColor: '#3B82F618' }]}>
                          <Ionicons name="document-text-outline" size={18} color="#3B82F6" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.resultMainTitle}>{q.quote_number}</Text>
                            <Text style={[styles.statusTag, { color: q.status === 'Sent' ? '#3B82F6' : '#10B981' }]}>
                              {q.status}
                            </Text>
                          </View>
                          <Text style={styles.resultSubTitle}>{q.client_name} • {formatCurrency(q.total)}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 📦 Products Section */}
                {searchResults.products.length > 0 && (
                  <View style={styles.searchGroup}>
                    <Text style={styles.groupTitle}>PRODUCTS ({searchResults.products.length})</Text>
                    {searchResults.products.map((p) => (
                      <TouchableOpacity
                        key={`prod-${p.id}`}
                        style={styles.resultRow}
                        onPress={() => {
                          handleSearchChange('');
                          nav.navigate('Products', { screen: 'ProductForm', params: { product: p } });
                        }}
                      >
                        <View style={[styles.resultIconWrap, { backgroundColor: '#10B98118' }]}>
                          <Ionicons name="cube-outline" size={18} color="#10B981" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.resultMainTitle}>{p.name}</Text>
                          <Text style={styles.resultSubTitle}>
                            {p.category || 'General'} • {formatCurrency(p.unit_price)} • Stock: {p.stock_quantity || 0}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 🛒 Direct Sales Section */}
                {searchResults.sales.length > 0 && (
                  <View style={styles.searchGroup}>
                    <Text style={styles.groupTitle}>DIRECT SALES ({searchResults.sales.length})</Text>
                    {searchResults.sales.map((s) => (
                      <TouchableOpacity
                        key={`sale-${s.id}`}
                        style={styles.resultRow}
                        onPress={() => {
                          handleSearchChange('');
                          nav.navigate('Sales', { screen: 'DirectSalesList' });
                        }}
                      >
                        <View style={[styles.resultIconWrap, { backgroundColor: '#8B5CF618' }]}>
                          <Ionicons name="cart-outline" size={18} color="#8B5CF6" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.resultMainTitle}>{s.sale_number}</Text>
                          <Text style={styles.resultSubTitle}>
                            {s.customer_name || 'Walk-in'} • {formatCurrency(s.total)} ({s.payment_status})
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 👥 Customers Section */}
                {searchResults.customers.length > 0 && (
                  <View style={styles.searchGroup}>
                    <Text style={styles.groupTitle}>CUSTOMERS ({searchResults.customers.length})</Text>
                    {searchResults.customers.map((c) => (
                      <TouchableOpacity
                        key={`cust-${c.id}`}
                        style={styles.resultRow}
                        onPress={() => {
                          handleSearchChange('');
                          nav.navigate('People', { screen: 'CustomerForm', params: { customer: c } });
                        }}
                      >
                        <View style={[styles.resultIconWrap, { backgroundColor: '#EC489918' }]}>
                          <Ionicons name="person-outline" size={18} color="#EC4899" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.resultMainTitle}>{c.name}</Text>
                          <Text style={styles.resultSubTitle}>{c.phone || c.email || 'Customer'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 🤝 Vendors Section */}
                {searchResults.vendors.length > 0 && (
                  <View style={styles.searchGroup}>
                    <Text style={styles.groupTitle}>VENDORS ({searchResults.vendors.length})</Text>
                    {searchResults.vendors.map((v) => (
                      <TouchableOpacity
                        key={`vend-${v.id}`}
                        style={styles.resultRow}
                        onPress={() => {
                          handleSearchChange('');
                          nav.navigate('Products', { screen: 'VendorForm', params: { vendor: v } });
                        }}
                      >
                        <View style={[styles.resultIconWrap, { backgroundColor: '#F59E0B18' }]}>
                          <Ionicons name="business-outline" size={18} color="#F59E0B" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.resultMainTitle}>{v.name}</Text>
                          <Text style={styles.resultSubTitle}>{v.contact_person || v.phone || 'Vendor Supplier'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 🏢 Employees Section */}
                {searchResults.employees.length > 0 && (
                  <View style={styles.searchGroup}>
                    <Text style={styles.groupTitle}>TEAM / EMPLOYEES ({searchResults.employees.length})</Text>
                    {searchResults.employees.map((e) => (
                      <TouchableOpacity
                        key={`emp-${e.id}`}
                        style={styles.resultRow}
                        onPress={() => {
                          handleSearchChange('');
                          nav.navigate('People', { screen: 'EmployeeForm', params: { employee: e } });
                        }}
                      >
                        <View style={[styles.resultIconWrap, { backgroundColor: '#14B8A618' }]}>
                          <Ionicons name="people-outline" size={18} color="#14B8A6" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.resultMainTitle}>{e.name}</Text>
                          <Text style={styles.resultSubTitle}>{e.role} • {e.department}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

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

        <View style={{ height: tabBarHeight }} />
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any, insets?: any, isDark?: boolean) => StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 20 },

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

  // Universal Search Results Panel
  searchResultsPanel: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    ...Shadow.md,
  },
  searchPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  searchPanelTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  resultBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  resultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  noSearchMatch: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noMatchTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  noMatchSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  searchResultsList: {
    gap: 16,
  },
  searchGroup: {
    gap: 6,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  resultIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultMainTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  resultSubTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statusTag: {
    fontSize: 11,
    fontWeight: '700',
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
