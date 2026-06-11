import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useProducts } from '../../hooks/useProducts';
import { BarcodeScannerModal } from '../../components/BarcodeScannerModal';
import { Colors, Radius, Shadow } from '../../theme';
import { Button } from '../../components/ui/Button';
import { Product } from '../../types';

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export const WarehouseScreen: React.FC = () => {
  const nav = useNavigation();
  const { products, update: updateProduct } = useProducts();
  const [showScanner, setShowScanner] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);

  // Adjustment form states
  const [adjustMode, setAdjustMode] = useState<'add' | 'deduct'>('add');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Found in Warehouse');
  const [customReason, setCustomReason] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleScan = (barcode: string) => {
    setShowScanner(false);
    const matched = products.find(
      (p) =>
        (p.barcode && p.barcode.trim() === barcode.trim()) ||
        (p.sku && p.sku.trim() === barcode.trim())
    );

    if (matched) {
      setScannedProduct(matched);
      // Reset form defaults based on adjustment direction
      setAdjustQty('');
      setAdjustMode('add');
      setAdjustReason('Found in Warehouse');
      setCustomReason('');
    } else {
      Alert.alert('Not Found', `Product with barcode/SKU "${barcode}" not found in inventory.`);
    }
  };

  const handleSaveAdjustment = async () => {
    if (!scannedProduct) return;
    const qty = parseInt(adjustQty, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Required', 'Please enter a valid adjustment quantity greater than 0.');
      return;
    }

    const reason = adjustReason === 'Other' ? customReason.trim() : adjustReason;
    if (adjustReason === 'Other' && !reason) {
      Alert.alert('Required', 'Please enter a reason for the adjustment.');
      return;
    }

    const currentStock = scannedProduct.stock_quantity || 0;
    const change = adjustMode === 'add' ? qty : -qty;
    const newStock = Math.max(0, currentStock + change);

    if (adjustMode === 'deduct' && currentStock < qty) {
      Alert.alert(
        'Insufficient Stock',
        `Current stock is ${currentStock}. Cannot deduct ${qty}. Do you want to set stock to 0?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deduct All (Set to 0)',
            style: 'destructive',
            onPress: () => performAdjustment(0, reason),
          },
        ]
      );
    } else {
      performAdjustment(newStock, reason);
    }
  };

  const performAdjustment = async (targetStock: number, reason: string) => {
    if (!scannedProduct) return;
    setUpdating(true);
    try {
      const updated = await updateProduct(scannedProduct.id, {
        stock_quantity: targetStock,
      });
      if (updated) {
        setScannedProduct(updated);
        Alert.alert(
          'Success',
          `Inventory adjusted successfully. New stock: ${targetStock} units.`
        );
        // Reset form
        setAdjustQty('');
        setCustomReason('');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to adjust stock.');
    } finally {
      setUpdating(false);
    }
  };

  const addReasons = ['Received Shipment', 'Found in Warehouse', 'Stock Return', 'Other'];
  const deductReasons = ['Stolen/Damaged', 'Loss/Shrinkage', 'Correction Audit', 'Other'];

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Warehouse Control</Text>
        <TouchableOpacity onPress={() => setShowScanner(true)} style={styles.scanBtn}>
          <Ionicons name="barcode-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!scannedProduct ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="cube-outline" size={60} color={Colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>Warehouse Scan Desk</Text>
            <Text style={styles.emptySub}>
              Scan a product barcode or SKU to inspect location, pricing, cost, and adjust real-time warehouse count.
            </Text>
            <Button
              title="Scan Barcode"
              icon="barcode-outline"
              onPress={() => setShowScanner(true)}
              size="lg"
            />
          </View>
        ) : (
          <View style={styles.dashboardContainer}>
            {/* Product Card Info */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.prodHeaderMain}>
                  <Text style={styles.prodName}>{scannedProduct.name}</Text>
                  <Text style={styles.prodCategory}>{scannedProduct.category || 'No Category'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.reScanBtn}
                  onPress={() => setShowScanner(true)}
                >
                  <Ionicons name="scan-outline" size={16} color={Colors.accent} />
                  <Text style={styles.reScanText}>Scan Another</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <View style={styles.metaRow}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>SKU / Code</Text>
                  <Text style={styles.metaValue}>{scannedProduct.sku || 'N/A'}</Text>
                </View>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Barcode</Text>
                  <Text style={styles.metaValue}>{scannedProduct.barcode || 'N/A'}</Text>
                </View>
              </View>

              <View style={[styles.metaRow, { marginTop: 12 }]}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Warehouse Location</Text>
                  <View style={styles.locBadge}>
                    <Ionicons name="location-outline" size={14} color={Colors.accent} />
                    <Text style={styles.locBadgeText}>
                      {scannedProduct.warehouse_location || 'Not Specified'}
                    </Text>
                  </View>
                </View>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Stock Balance</Text>
                  <Text
                    style={[
                      styles.stockCount,
                      (scannedProduct.stock_quantity || 0) === 0
                        ? styles.stockOut
                        : (scannedProduct.stock_quantity || 0) <= 5
                        ? styles.stockLow
                        : styles.stockOk,
                    ]}
                  >
                    {scannedProduct.stock_quantity || 0} {scannedProduct.unit}s
                  </Text>
                </View>
              </View>
            </View>

            {/* Financial Margins Card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Pricing & Margin</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Selling Price</Text>
                  <Text style={styles.priceValue}>{formatCurrency(scannedProduct.unit_price)}</Text>
                </View>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Cost Price</Text>
                  <Text style={styles.priceValue}>
                    {scannedProduct.cost_price ? formatCurrency(scannedProduct.cost_price) : '₹0.00'}
                  </Text>
                </View>
              </View>

              {scannedProduct.cost_price && (
                <View style={styles.marginAlert}>
                  <Ionicons name="trending-up-outline" size={16} color={Colors.statusAccepted} />
                  <Text style={styles.marginText}>
                    Gross Margin: {formatCurrency(scannedProduct.unit_price - scannedProduct.cost_price)} ({Math.round(((scannedProduct.unit_price - scannedProduct.cost_price) / scannedProduct.unit_price) * 100)}%)
                  </Text>
                </View>
              )}
            </View>

            {/* Stock Adjuster Panel */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Adjust Stock Quantity</Text>

              {/* Add / Deduct Mode Selector */}
              <View style={styles.adjustModeRow}>
                <TouchableOpacity
                  style={[styles.modeBtn, adjustMode === 'add' && styles.modeBtnAdd]}
                  onPress={() => {
                    setAdjustMode('add');
                    setAdjustReason('Found in Warehouse');
                  }}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color={adjustMode === 'add' ? '#fff' : Colors.textSecondary}
                  />
                  <Text style={[styles.modeText, adjustMode === 'add' && styles.modeTextActive]}>
                    Add stock
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeBtn, adjustMode === 'deduct' && styles.modeBtnDeduct]}
                  onPress={() => {
                    setAdjustMode('deduct');
                    setAdjustReason('Loss/Shrinkage');
                  }}
                >
                  <Ionicons
                    name="remove-circle-outline"
                    size={20}
                    color={adjustMode === 'deduct' ? '#fff' : Colors.textSecondary}
                  />
                  <Text style={[styles.modeText, adjustMode === 'deduct' && styles.modeTextActive]}>
                    Deduct stock
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Adjustment quantity field */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Quantity to adjust</Text>
                <TextInput
                  style={styles.qtyInput}
                  value={adjustQty}
                  onChangeText={setAdjustQty}
                  placeholder="e.g. 10"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>

              {/* Reasons Chips Selection */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Adjustment Reason</Text>
                <View style={styles.reasonsContainer}>
                  {(adjustMode === 'add' ? addReasons : deductReasons).map((r) => {
                    const isSelected = adjustReason === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[styles.reasonChip, isSelected && styles.reasonChipActive]}
                        onPress={() => setAdjustReason(r)}
                      >
                        <Text
                          style={[
                            styles.reasonChipText,
                            isSelected && styles.reasonChipTextActive,
                          ]}
                        >
                          {r}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Custom reason description input */}
              {adjustReason === 'Other' && (
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Custom Reason Description</Text>
                  <TextInput
                    style={styles.reasonInput}
                    value={customReason}
                    onChangeText={setCustomReason}
                    placeholder="Enter audit correction reason..."
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              )}

              <View style={{ marginTop: 16 }}>
                <Button
                  title={adjustMode === 'add' ? 'Add to Stock' : 'Deduct from Stock'}
                  onPress={handleSaveAdjustment}
                  loading={updating}
                  variant={adjustMode === 'add' ? 'primary' : 'danger'}
                  size="lg"
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
        title="Scan Warehouse Barcode"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  scanBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { paddingBottom: 80 },
  
  // Empty State UI
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 30,
    gap: 16,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: Colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  // Scanned State dashboard UI
  dashboardContainer: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    gap: 12,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  prodHeaderMain: {
    flex: 1,
    paddingRight: 10,
  },
  prodName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  prodCategory: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  reScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent + '15',
  },
  reScanText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  locBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
  },
  stockCount: {
    fontSize: 16,
    fontWeight: '800',
  },
  stockOut: { color: Colors.statusRejected },
  stockLow: { color: Colors.statusExpired },
  stockOk: { color: Colors.statusAccepted },

  // Margins Section
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  marginAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.statusAccepted + '15',
    padding: 10,
    borderRadius: Radius.md,
    marginTop: 4,
  },
  marginText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.statusAccepted,
  },

  // Stock Adjuster Panel styles
  adjustModeRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  modeBtnAdd: {
    backgroundColor: Colors.statusAccepted,
    borderColor: Colors.statusAccepted,
  },
  modeBtnDeduct: {
    backgroundColor: Colors.statusRejected,
    borderColor: Colors.statusRejected,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modeTextActive: {
    color: '#fff',
  },
  fieldWrap: {
    gap: 6,
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  qtyInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reasonChipActive: {
    backgroundColor: Colors.accent + '15',
    borderColor: Colors.accent,
  },
  reasonChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  reasonChipTextActive: {
    color: Colors.accent,
    fontWeight: '700',
  },
  reasonInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
});
