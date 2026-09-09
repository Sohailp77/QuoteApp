import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProducts } from '../../hooks/useProducts';
import { ProductCard } from '../../components/ProductCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { Radius } from '../../theme';
import { animateLayout } from '../../utils/animation';
import { useAppTheme } from '../../context/ThemeContext';
import { AppBackground } from '../../components/AppBackground';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import { FilterModal, FilterGroup } from '../../components/ui/FilterModal';

export const ProductsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const styles = createStyles(colors, insets);
  const nav = useNavigation<any>();
  const { products, loading, fetch, remove } = useProducts();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [stockLevel, setStockLevel] = useState<'All' | 'In Stock' | 'Low Stock' | 'Out of Stock'>('All');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const handleSearchChange = (text: string) => {
    animateLayout();
    setSearch(text);
  };

  useEffect(() => { fetch(); }, []);

  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c))))];
  }, [products]);

  const handleResetFilters = () => {
    animateLayout();
    setActiveCategory('All');
    setStockLevel('All');
  };

  const activeFilterCount = (activeCategory !== 'All' ? 1 : 0) + (stockLevel !== 'All' ? 1 : 0);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const s = search.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(s) ||
        p.category?.toLowerCase().includes(s) ||
        p.sku?.toLowerCase().includes(s);
      
      const matchCat = activeCategory === 'All' || p.category === activeCategory;

      let matchStock = true;
      const stock = p.stock_quantity || 0;
      const reorderLevel = p.reorder_level || 5;

      if (stockLevel === 'In Stock') {
        matchStock = stock > reorderLevel;
      } else if (stockLevel === 'Low Stock') {
        matchStock = stock <= reorderLevel && stock > 0;
      } else if (stockLevel === 'Out of Stock') {
        matchStock = stock === 0;
      }

      return matchSearch && matchCat && matchStock;
    });
  }, [products, search, activeCategory, stockLevel]);

  const handleDelete = (id: string, name: string) => {
    Alert.alert(`Delete "${name}"?`, 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(id) },
    ]);
  };

  const filterGroups: FilterGroup[] = [
    {
      id: 'category',
      title: 'Category',
      options: categories.map((cat) => ({ id: cat, label: cat })),
      selectedValue: activeCategory,
      onSelect: (val) => setActiveCategory(val),
    },
    {
      id: 'stock',
      title: 'Stock Level',
      options: [
        { id: 'All', label: 'All Items' },
        { id: 'In Stock', label: 'In Stock' },
        { id: 'Low Stock', label: 'Low Stock' },
        { id: 'Out of Stock', label: 'Out of Stock' },
      ],
      selectedValue: stockLevel,
      onSelect: (val) => setStockLevel(val as any),
    },
  ];

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
          <Text style={styles.title}>Products</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => nav.navigate('StockManagement')}
            activeOpacity={0.8}
          >
            <Ionicons name="analytics-outline" size={18} color={colors.primary} />
            <Text style={styles.headerActionText}>Stock</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => nav.navigate('CategoryManager')}
            activeOpacity={0.8}
          >
            <Ionicons name="grid-outline" size={18} color={colors.primary} />
            <Text style={styles.headerActionText}>Categories</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => nav.navigate('ProductForm', {})}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search & Filter Control Row */}
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar
            value={search}
            onChangeText={handleSearchChange}
            placeholder="Search products..."
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
            {activeCategory !== 'All' && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>{activeCategory}</Text>
              </View>
            )}
            {stockLevel !== 'All' && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>{stockLevel}</Text>
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
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => nav.navigate('ProductForm', { product: item })}
            onDelete={() => handleDelete(item.id, item.name)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetch} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={52} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySub}>Try adjusting your filters or search text</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: tabBarHeight + 20, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      />

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
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Math.max(insets?.top || 0, 24) + 16, paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '15',
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  headerActionText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  addBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptySub: { fontSize: 14, color: colors.textSecondary },
});
