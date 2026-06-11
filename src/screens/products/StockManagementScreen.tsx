import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useProducts } from '../../hooks/useProducts';
import { useStockMovements } from '../../hooks/useStockMovements';
import { MovementType } from '../../hooks/useStockMovements';
import { Product } from '../../types';
import { Colors, Radius, Shadow } from '../../theme';

const MOVEMENT_TYPES: { type: MovementType; label: string; icon: string; color: string; sign: number }[] = [
  { type: 'in', label: 'Stock In', icon: 'add-circle', color: '#10B981', sign: 1 },
  { type: 'purchase', label: 'Purchase', icon: 'bag-add-outline', color: '#3B82F6', sign: 1 },
  { type: 'out', label: 'Stock Out', icon: 'remove-circle', color: '#F59E0B', sign: -1 },
  { type: 'adjustment', label: 'Adjustment', icon: 'sync-outline', color: '#6C63FF', sign: 1 },
  { type: 'damage', label: 'Damage', icon: 'skull-outline', color: '#EF4444', sign: -1 },
  { type: 'loss', label: 'Loss', icon: 'remove-circle-outline', color: '#EF4444', sign: -1 },
];

export const StockManagementScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const { products, loading: prodLoading, fetch: fetchProducts, update: updateProduct } = useProducts();
  const { movements, loading: movLoading, fetch: fetchMovements, recordMovement } = useStockMovements();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [movType, setMovType] = useState<MovementType>('in');
  const [qtyInput, setQtyInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [supplierInput, setSupplierInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'overview' | 'history'>('overview');
  const [reorderEdit, setReorderEdit] = useState<{ id: string; val: string } | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchMovements();
  }, []);

  const stockColor = (p: Product) => {
    if (p.stock_quantity === undefined || p.stock_quantity === null) return Colors.textMuted;
    const threshold = p.reorder_level ?? 5;
    if (p.stock_quantity === 0) return '#EF4444';
    if (p.stock_quantity <= threshold) return '#F59E0B';
    return '#10B981';
  };

  const openAdjust = (product: Product, type: MovementType) => {
    setSelectedProduct(product);
    setMovType(type);
    setQtyInput('');
    setNoteInput('');
    setSupplierInput('');
    setShowAdjustModal(true);
  };

  const handleSaveAdjustment = async () => {
    if (!selectedProduct) return;
    const qty = parseInt(qtyInput, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Enter a valid quantity');
      return;
    }

    const movDef = MOVEMENT_TYPES.find((m) => m.type === movType)!;
    const currentStock = selectedProduct.stock_quantity ?? 0;
    const newStock = movType === 'adjustment'
      ? qty // absolute override for "adjustment"
      : Math.max(0, currentStock + movDef.sign * qty);

    setSaving(true);
    try {
      await recordMovement({
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        movement_type: movType,
        quantity: qty,
        note: noteInput.trim(),
        supplier: supplierInput.trim(),
        new_stock: newStock,
      });
      setShowAdjustModal(false);
      fetchProducts();
      Alert.alert('Done', `Stock updated. New stock: ${newStock} ${selectedProduct.unit}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveReorderLevel = async (product: Product, val: string) => {
    const level = parseInt(val, 10);
    if (isNaN(level) || level < 0) { Alert.alert('Error', 'Enter a valid reorder level'); return; }
    try {
      await updateProduct(product.id, { reorder_level: level });
      setReorderEdit(null);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const selectedMovType = MOVEMENT_TYPES.find((m) => m.type === movType)!;
  const productMovements = selectedProduct
    ? movements.filter((m) => m.product_id === selectedProduct.id)
    : [];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Stock Management</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {(['overview', 'history'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'overview' ? 'Stock Overview' : 'Movement History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'overview' ? (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          refreshing={prodLoading}
          onRefresh={fetchProducts}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={52} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No products found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const sColor = stockColor(item);
            return (
              <View style={styles.stockCard}>
                <View style={styles.stockTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.productSku}>{item.category}{item.sku ? ` • ${item.sku}` : ''}</Text>
                  </View>
                  <View style={[styles.stockBadge, { backgroundColor: sColor + '18' }]}>
                    <Text style={[styles.stockCount, { color: sColor }]}>
                      {item.stock_quantity ?? '—'} {item.unit}
                    </Text>
                  </View>
                </View>

                {/* Reorder level */}
                <View style={styles.reorderRow}>
                  <Text style={styles.reorderLabel}>Reorder at:</Text>
                  {reorderEdit?.id === item.id ? (
                    <View style={styles.reorderInputRow}>
                      <TextInput
                        style={styles.reorderInput}
                        value={reorderEdit.val}
                        onChangeText={(v) => setReorderEdit({ id: item.id, val: v })}
                        keyboardType="number-pad"
                        autoFocus
                      />
                      <TouchableOpacity onPress={() => saveReorderLevel(item, reorderEdit.val)}>
                        <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setReorderEdit(null)}>
                        <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.reorderValBtn}
                      onPress={() => setReorderEdit({ id: item.id, val: String(item.reorder_level ?? 5) })}
                    >
                      <Text style={styles.reorderVal}>{item.reorder_level ?? 5}</Text>
                      <Ionicons name="pencil-outline" size={12} color={Colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Quick action buttons */}
                <View style={styles.actionRow}>
                  {MOVEMENT_TYPES.filter((m) => ['in', 'out', 'adjustment', 'damage'].includes(m.type)).map((m) => (
                    <TouchableOpacity
                      key={m.type}
                      style={[styles.movBtn, { borderColor: m.color + '50' }]}
                      onPress={() => openAdjust(item, m.type)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={m.icon as any} size={14} color={m.color} />
                      <Text style={[styles.movBtnText, { color: m.color }]}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={movements}
          keyExtractor={(m) => m.id}
          refreshing={movLoading}
          onRefresh={() => fetchMovements()}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="analytics-outline" size={52} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No movements yet</Text>
            </View>
          }
          renderItem={({ item }) => {
            const movDef = MOVEMENT_TYPES.find((m) => m.type === item.movement_type);
            return (
              <View style={styles.movCard}>
                <View style={[styles.movIconWrap, { backgroundColor: (movDef?.color || '#888') + '18' }]}>
                  <Ionicons name={(movDef?.icon || 'sync') as any} size={18} color={movDef?.color || '#888'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.movProduct}>{item.product_name}</Text>
                  <Text style={styles.movMeta}>
                    {movDef?.label} • {item.quantity} units
                    {item.note ? ` • ${item.note}` : ''}
                  </Text>
                  <Text style={styles.movDate}>
                    {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={[styles.movQty, { color: movDef?.color || Colors.textMuted }]}>
                  {movDef && movDef.sign > 0 ? '+' : '-'}{item.quantity}
                </Text>
              </View>
            );
          }}
        />
      )}

      {/* Adjustment Modal */}
      <Modal visible={showAdjustModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedMovType?.label}</Text>
            <TouchableOpacity onPress={() => setShowAdjustModal(false)}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.productLabel}>{selectedProduct?.name}</Text>
            <Text style={styles.currentStock}>
              Current Stock: {selectedProduct?.stock_quantity ?? 0} {selectedProduct?.unit}
            </Text>

            {/* Movement type switcher */}
            <View style={styles.movTypeRow}>
              {MOVEMENT_TYPES.map((m) => (
                <TouchableOpacity
                  key={m.type}
                  style={[styles.movTypeBtn, movType === m.type && { backgroundColor: m.color + '20', borderColor: m.color }]}
                  onPress={() => setMovType(m.type)}
                >
                  <Ionicons name={m.icon as any} size={16} color={m.color} />
                  <Text style={[styles.movTypeBtnText, { color: m.color }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>
              {movType === 'adjustment' ? 'Set New Stock Quantity' : 'Quantity'}
            </Text>
            <TextInput
              style={styles.fieldInput}
              value={qtyInput}
              onChangeText={setQtyInput}
              placeholder={movType === 'adjustment' ? 'Enter absolute new stock' : 'Enter quantity'}
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              autoFocus
            />

            {(movType === 'in' || movType === 'purchase') && (
              <>
                <Text style={styles.fieldLabel}>Supplier (optional)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={supplierInput}
                  onChangeText={setSupplierInput}
                  placeholder="Supplier name"
                  placeholderTextColor={Colors.textMuted}
                />
              </>
            )}

            <Text style={styles.fieldLabel}>Note (optional)</Text>
            <TextInput
              style={[styles.fieldInput, { minHeight: 80, textAlignVertical: 'top' }]}
              value={noteInput}
              onChangeText={setNoteInput}
              placeholder="Reason, reference number..."
              placeholderTextColor={Colors.textMuted}
              multiline
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSaveAdjustment}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Record Movement</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
  tabRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 4,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full, padding: 4,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: Radius.full,
  },
  tabBtnActive: { backgroundColor: Colors.surface, ...Shadow.sm },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.textPrimary },
  stockCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: 16, marginBottom: 12, ...Shadow.sm,
  },
  stockTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  productName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  productSku: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  stockBadge: { borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  stockCount: { fontSize: 14, fontWeight: '700' },
  reorderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  reorderLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  reorderInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reorderInput: {
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4,
    fontSize: 13, color: Colors.textPrimary, minWidth: 50, textAlign: 'center',
  },
  reorderValBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reorderVal: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  movBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1,
  },
  movBtnText: { fontSize: 11, fontWeight: '700' },
  movCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: 14, marginBottom: 8, ...Shadow.sm,
  },
  movIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  movProduct: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  movMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  movDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  movQty: { fontSize: 16, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  // Modal
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  modalBody: { padding: 20 },
  productLabel: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  currentStock: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 20 },
  movTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  movTypeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  movTypeBtnText: { fontSize: 12, fontWeight: '700' },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.textPrimary, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
