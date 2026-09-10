import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDirectSales } from '../../hooks/useDirectSales';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../context/ThemeContext';
import { AppBackground } from '../../components/AppBackground';
import { Radius, Shadow } from '../../theme';
import { DirectSaleItem, Product } from '../../types';
import { BarcodeScannerModal } from '../../components/BarcodeScannerModal';
import { calculateQuantity, getProductCalcConfig } from '../../utils/quantityCalculator';

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Field component ──────────────────────────────────────────────────────────
const Field: React.FC<{
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
}> = ({ label, value, onChangeText, placeholder, keyboardType }) => {
  const { colors } = useAppTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: Radius.md,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          color: colors.textPrimary,
          borderWidth: 1,
          borderColor: colors.border,
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
      />
    </View>
  );
};

export const CreateDirectSaleScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = createStyles(colors, insets);
  const nav = useNavigation<any>();
  const { create, loading } = useDirectSales();
  const { products, taxRates } = useAppStore();
  const currentUser = useAuthStore((s: any) => s.user);

  // Sale-level fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<Omit<DirectSaleItem, 'id'>[]>([]);
  const [discount, setDiscount] = useState('0');
  const [taxRateId, setTaxRateId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Bank Transfer'>('Cash');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partial' | 'Pending'>('Paid');
  const [notes, setNotes] = useState('');

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showCalcModal, setShowCalcModal] = useState(false);

  // Item calculator state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [productName, setProductName] = useState('');
  const [pcs, setPcs] = useState('1');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [area, setArea] = useState('');
  const [reqQty, setReqQty] = useState('');
  const [rate, setRate] = useState('0');
  const [itemDiscount, setItemDiscount] = useState('0');

  // Auto-calculate area from L x W
  useEffect(() => {
    const l = parseFloat(length) || 0;
    const w = parseFloat(width) || 0;
    if (l > 0 && w > 0) setArea((l * w).toString());
  }, [length, width]);

  // Totals
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const discountVal = parseFloat(discount) || 0;
  const discountAmount = (subtotal * discountVal) / 100;
  const afterDiscount = subtotal - discountAmount;
  const taxObj = taxRates.find((t: any) => t.id === taxRateId);
  const taxPercent = taxObj ? (taxObj as any).percentage : 0;
  const taxAmount = (afterDiscount * taxPercent) / 100;
  const grandTotal = afterDiscount + taxAmount;

  // Calculator helpers
  const getCalcResult = () => {
    const pConfig = selectedProduct
      ? getProductCalcConfig(selectedProduct)
      : { calc_method: 'direct' as const, input_unit: '', unit_coverage: 1, rounding_mode: 'round_up' as const, selling_unit: 'piece' };

    const pCount = parseFloat(pcs) || 1;
    const l = parseFloat(length) || 0;
    const w = parseFloat(width) || 0;
    const a = parseFloat(area) || 0;
    const rQty = parseFloat(reqQty) || 0;

    let inputReq = 0;
    if (pConfig.calc_method === 'area') {
      inputReq = l > 0 && w > 0 ? l * w : a > 0 ? a : rQty;
    } else if (pConfig.calc_method === 'length') {
      inputReq = l > 0 ? l : rQty;
    } else if (pConfig.calc_method === 'direct') {
      inputReq = pCount;
    } else {
      inputReq = rQty > 0 ? rQty : pCount;
    }

    return calculateQuantity({
      calc_method: pConfig.calc_method,
      input_qty: inputReq,
      length: l,
      width: w,
      pcs: pCount,
      unit_coverage: pConfig.unit_coverage,
      rounding_mode: pConfig.rounding_mode,
      input_unit: pConfig.input_unit,
      selling_unit: pConfig.selling_unit,
    });
  };

  const calcLineTotal = () => {
    const qty = getCalcResult().final_qty;
    const r = parseFloat(rate) || 0;
    const d = parseFloat(itemDiscount) || 0;
    return qty * r * (1 - d / 100);
  };

  const openCalcForProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setProductName(prod.name);
    setRate(prod.unit_price.toString());
    setPcs('1');
    setLength('');
    setWidth('');
    setArea('');
    setReqQty('');
    setItemDiscount('0');
    setEditingIndex(null);
    setShowProductModal(false);
    setShowCalcModal(true);
  };

  const editItem = (index: number) => {
    const item = items[index] as any;
    const matched = products.find((p: any) => p.id === item.product_id);
    setSelectedProduct(matched || null);
    setProductName(item.product_name);
    setRate(item.unit_price.toString());
    setPcs((item.pcs || 1).toString());
    setLength((item.length || '').toString());
    setWidth((item.width || '').toString());
    setArea((item.area || '').toString());
    setReqQty((item.input_qty || '').toString());
    setItemDiscount((item.discount || 0).toString());
    setEditingIndex(index);
    setShowCalcModal(true);
  };

  const handleBarcodeScan = (data: string) => {
    const matched = products.find(
      (p: any) =>
        (p.barcode && p.barcode.trim() === data.trim()) ||
        (p.sku && p.sku.trim() === data.trim())
    );
    if (matched) {
      setShowBarcodeScanner(false);
      openCalcForProduct(matched);
    } else {
      setShowBarcodeScanner(false);
      Alert.alert('Not Found', `No product matches barcode/SKU "${data}".`);
    }
  };

  const handleSaveItem = () => {
    const calcRes = getCalcResult();
    const r = parseFloat(rate) || 0;
    const d = parseFloat(itemDiscount) || 0;
    const qty = calcRes.final_qty;
    const total = qty * r * (1 - d / 100);

    if (qty <= 0) {
      Alert.alert('Error', 'Calculated quantity must be greater than 0.');
      return;
    }

    const newItem: any = {
      product_id: selectedProduct?.id,
      product_name: productName,
      quantity: qty,
      unit_price: r,
      discount: d,
      line_total: total,
      pcs: parseFloat(pcs) || 1,
      length: parseFloat(length) || undefined,
      width: parseFloat(width) || undefined,
      area: parseFloat(area) || undefined,
      input_qty: parseFloat(reqQty) || undefined,
      formula_text: calcRes.formula_text,
      calc_method: calcRes.calc_method,
      selling_unit: calcRes.selling_unit,
    };

    if (editingIndex !== null) {
      const updated = [...items];
      updated[editingIndex] = newItem;
      setItems(updated);
    } else {
      setItems([...items, newItem]);
    }
    setShowCalcModal(false);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (items.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }
    const createdByName = currentUser?.displayName || currentUser?.email || 'Staff';
    const createdByRole = currentUser?.role === 'boss' ? 'Business Owner' : 'Employee';

    try {
      await create({
        customer_name: customerName,
        customer_phone: customerPhone,
        items: items as DirectSaleItem[],
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total: grandTotal,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        notes,
        created_by_name: createdByName,
        created_by_role: createdByRole,
        user_id: currentUser?.id,
      });
      nav.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const renderCalcModal = () => {
    const pConfig = selectedProduct
      ? getProductCalcConfig(selectedProduct)
      : { calc_method: 'direct' as const, input_unit: '', unit_coverage: 1, rounding_mode: 'round_up' as const, selling_unit: 'piece' };
    const calcRes = getCalcResult();
    const qty = calcRes.final_qty;
    const r = parseFloat(rate) || 0;
    const d = parseFloat(itemDiscount) || 0;
    const mrpTotal = qty * r;
    const discAmt = mrpTotal * (d / 100);

    return (
      <Modal visible={showCalcModal} transparent animationType="slide" onRequestClose={() => setShowCalcModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.calcOverlay}>
            <View style={styles.calcSheet}>
              <Text style={styles.calcTitle}>
                {editingIndex !== null ? 'Edit Item' : 'Configure Item'}
              </Text>
              <Text style={styles.calcProductName}>{productName}</Text>

              {selectedProduct && (
                <View style={styles.productBadgeWrap}>
                  <Text style={styles.productBadgeSub}>
                    Selling Unit: <Text style={{ fontWeight: '700' }}>{pConfig.selling_unit}</Text>
                    {'  '}MRP: <Text style={{ fontWeight: '700' }}>Rs.{selectedProduct.unit_price}/{pConfig.selling_unit}</Text>
                  </Text>
                  {pConfig.calc_method !== 'direct' && (
                    <Text style={styles.productBadgeRule}>
                      Rule: 1 {pConfig.selling_unit} = {pConfig.unit_coverage} {pConfig.input_unit} ({pConfig.rounding_mode.replace('_', ' ')})
                    </Text>
                  )}
                </View>
              )}

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {pConfig.calc_method === 'direct' ? (
                  <Field label={`Quantity (${pConfig.selling_unit})`} value={pcs} onChangeText={setPcs} placeholder="1" keyboardType="numeric" />
                ) : pConfig.calc_method === 'area' ? (
                  <View style={{ gap: 10 }}>
                    <Text style={styles.calcSectionLabel}>Dimensions ({pConfig.input_unit})</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Field label="Length" value={length} onChangeText={setLength} placeholder="e.g. 10" keyboardType="numeric" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Field label="Width" value={width} onChangeText={setWidth} placeholder="e.g. 10" keyboardType="numeric" />
                      </View>
                    </View>
                    <Field
                      label={`Direct Area (${pConfig.input_unit})`}
                      value={area || reqQty}
                      onChangeText={(v) => { setArea(v); setReqQty(v); }}
                      placeholder="e.g. 100"
                      keyboardType="numeric"
                    />
                  </View>
                ) : pConfig.calc_method === 'length' ? (
                  <Field
                    label={`Required Length (${pConfig.input_unit})`}
                    value={length || reqQty}
                    onChangeText={(v) => { setLength(v); setReqQty(v); }}
                    placeholder="e.g. 25"
                    keyboardType="numeric"
                  />
                ) : (
                  <Field
                    label={`Required Qty / Weight (${pConfig.input_unit || 'Unit'})`}
                    value={reqQty}
                    onChangeText={setReqQty}
                    placeholder="e.g. 100"
                    keyboardType="numeric"
                  />
                )}

                <View style={styles.calcPreviewCard}>
                  <View style={styles.calcPreviewHeader}>
                    <Ionicons name="calculator" size={16} color={colors.primary} />
                    <Text style={styles.calcPreviewTitle}>Calculated Selling Quantity</Text>
                  </View>
                  {pConfig.calc_method !== 'direct' ? (
                    <>
                      <Text style={styles.calcPreviewMath}>{calcRes.formula_text}</Text>
                      <View style={styles.calcResultRow}>
                        <Text style={styles.calcResultLabel}>Selling Quantity:</Text>
                        <Text style={styles.calcResultVal}>{calcRes.final_qty} {calcRes.selling_unit}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.calcResultRow}>
                      <Text style={styles.calcResultLabel}>Quantity:</Text>
                      <Text style={styles.calcResultVal}>{calcRes.final_qty} {calcRes.selling_unit}</Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Field label={`Price/${pConfig.selling_unit} (Rs.)`} value={rate} onChangeText={setRate} placeholder="0" keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Item Discount (%)" value={itemDiscount} onChangeText={setItemDiscount} placeholder="0" keyboardType="numeric" />
                  </View>
                </View>

                <View style={styles.itemCalcBreakdown}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>MRP ({qty} {calcRes.selling_unit} x Rs.{r}):</Text>
                    <Text style={styles.breakdownValue}>Rs.{mrpTotal.toLocaleString('en-IN')}</Text>
                  </View>
                  {d > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Item Discount ({d}%):</Text>
                      <Text style={[styles.breakdownValue, { color: colors.statusAccepted }]}>-Rs.{discAmt.toLocaleString('en-IN')}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.calcTotalBox}>
                  <Text style={styles.calcTotalLabel}>Net Line Total</Text>
                  <Text style={styles.calcTotalVal}>{formatCurrency(calcLineTotal())}</Text>
                </View>
              </ScrollView>

              <View style={styles.calcActions}>
                <TouchableOpacity style={styles.calcCancelBtn} onPress={() => setShowCalcModal(false)}>
                  <Text style={styles.calcCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.calcSaveBtn} onPress={handleSaveItem}>
                  <Text style={styles.calcSaveText}>Save Item</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.screen}>
        <AppBackground />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>New Sale</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Customer */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Details (Optional)</Text>
            <View style={styles.card}>
              <Field label="Customer Name" value={customerName} onChangeText={setCustomerName} placeholder="Walk-in Customer" />
              <Field label="Phone" value={customerPhone} onChangeText={setCustomerPhone} placeholder="+91 9876543210" keyboardType="phone-pad" />
            </View>
          </View>

          {/* Items */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Items</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={styles.addItemBtn} onPress={() => setShowBarcodeScanner(true)}>
                  <Ionicons name="barcode-outline" size={16} color={colors.primary} />
                  <Text style={styles.addItemText}>Scan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addItemBtn} onPress={() => setShowProductModal(true)}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={styles.addItemText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {items.length === 0 ? (
              <TouchableOpacity style={styles.emptyItems} onPress={() => setShowProductModal(true)} activeOpacity={0.8}>
                <Ionicons name="cube-outline" size={28} color={colors.textMuted} />
                <Text style={styles.emptyItemsText}>Tap to add products</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.card}>
                {items.map((item: any, idx: number) => (
                  <View key={idx} style={[styles.lineItem, idx > 0 && styles.lineItemBorder]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => editItem(idx)}>
                      <View style={styles.lineItemTop}>
                        <Text style={styles.lineItemName} numberOfLines={1}>{item.product_name}</Text>
                        <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 4 }}>
                          <Ionicons name="close-circle" size={18} color={colors.statusRejected} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.lineItemBottom}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.lineItemPrice} numberOfLines={1}>Rs.{item.unit_price} per unit</Text>
                          {item.formula_text ? (
                            <Text style={styles.lineItemDimensions} numberOfLines={2}>{item.formula_text}</Text>
                          ) : (
                            <Text style={styles.lineItemDimensions} numberOfLines={1}>Qty: {item.quantity} {item.selling_unit || ''}</Text>
                          )}
                          {item.discount > 0 && <Text style={styles.lineItemDiscount}>{item.discount}% off</Text>}
                        </View>
                        <Text style={styles.lineTotal}>{formatCurrency(item.line_total)}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing & Settings</Text>
            <View style={styles.card}>
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.fieldLabel}>Overall Discount (%)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={discount}
                  onChangeText={setDiscount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <Text style={styles.fieldLabel}>Tax Rate</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <TouchableOpacity style={[styles.chip, !taxRateId && styles.chipActive]} onPress={() => setTaxRateId('')}>
                  <Text style={[styles.chipText, !taxRateId && styles.chipTextActive]}>None</Text>
                </TouchableOpacity>
                {taxRates.map((t: any) => (
                  <TouchableOpacity key={t.id} style={[styles.chip, taxRateId === t.id && styles.chipActive]} onPress={() => setTaxRateId(t.id)}>
                    <Text style={[styles.chipText, taxRateId === t.id && styles.chipTextActive]}>{t.name} ({t.percentage}%)</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Payment Method</Text>
              <View style={styles.segments}>
                {(['Cash', 'Card', 'UPI', 'Bank Transfer'] as const).map((m) => (
                  <TouchableOpacity key={m} style={[styles.segment, paymentMethod === m && styles.segmentActive]} onPress={() => setPaymentMethod(m)}>
                    <Text style={[styles.segmentText, paymentMethod === m && styles.segmentTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Payment Status</Text>
              <View style={styles.segments}>
                {(['Paid', 'Partial', 'Pending'] as const).map((m) => (
                  <TouchableOpacity key={m} style={[styles.segment, paymentStatus === m && styles.segmentActive]} onPress={() => setPaymentStatus(m)}>
                    <Text style={[styles.segmentText, paymentStatus === m && styles.segmentTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Any additional notes..."
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

            {/* Totals */}
            <View style={[styles.card, { marginTop: 12 }]}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
              </View>
              {discountAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.statusRejected }]}>Discount ({discountVal}%):</Text>
                  <Text style={[styles.totalValue, { color: colors.statusRejected }]}>-{formatCurrency(discountAmount)}</Text>
                </View>
              )}
              {taxAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax ({taxPercent}% {(taxObj as any)?.name || ''}):</Text>
                  <Text style={styles.totalValue}>+{formatCurrency(taxAmount)}</Text>
                </View>
              )}
              <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 6 }]}>
                <Text style={styles.grandTotalLabel}>Grand Total:</Text>
                <Text style={[styles.grandTotalValue, { color: colors.primary }]}>{formatCurrency(grandTotal)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Sale</Text>}
            </TouchableOpacity>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>

        {/* Product Picker Modal */}
        <Modal visible={showProductModal} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Product</Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={products}
              keyExtractor={(p: any) => p.id}
              renderItem={({ item }: any) => (
                <TouchableOpacity style={styles.productRow} onPress={() => openCalcForProduct(item)}>
                  <View style={styles.productIcon}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.productRowImage} />
                    ) : (
                      <Ionicons name="cube-outline" size={20} color={colors.primary} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.productCategory}>
                      {item.category}{item.stock_quantity !== undefined ? ` • Stock: ${item.stock_quantity}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.productPrice}>Rs.{item.unit_price}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                  <Ionicons name="cube-outline" size={40} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, marginTop: 10 }}>No products. Add products first.</Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 60 }}
            />
          </View>
        </Modal>

        <BarcodeScannerModal
          visible={showBarcodeScanner}
          onClose={() => setShowBarcodeScanner(false)}
          onScan={handleBarcodeScan}
          title="Scan Product Barcode"
        />

        {renderCalcModal()}
      </View>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: any, insets: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Math.max(insets?.top || 0, 24) + 12,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  content: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  card: { backgroundColor: colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '20', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  addItemText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  emptyItems: { backgroundColor: colors.surface, borderRadius: Radius.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyItemsText: { fontSize: 14, color: colors.textMuted },
  lineItem: { paddingVertical: 12 },
  lineItemBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  lineItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  lineItemName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginRight: 8 },
  lineItemBottom: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  lineItemPrice: { fontSize: 12, color: colors.textMuted },
  lineItemDimensions: { fontSize: 12, color: colors.textSecondary },
  lineItemDiscount: { fontSize: 11, color: colors.statusAccepted, fontWeight: '600' },
  lineTotal: { fontSize: 15, fontWeight: '700', color: colors.primary, flexShrink: 0, marginLeft: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { backgroundColor: colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  segments: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  segment: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  segmentTextActive: { color: '#fff' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { fontSize: 14, color: colors.textSecondary },
  totalValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  grandTotalLabel: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  grandTotalValue: { fontSize: 19, fontWeight: '800' },
  saveBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: Radius.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Product Picker
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  productIcon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productRowImage: { width: 44, height: 44 },
  productName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  productCategory: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  productPrice: { fontSize: 14, fontWeight: '700', color: colors.primary },
  // Calculator Modal
  calcOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  calcSheet: { backgroundColor: colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: 24, ...Shadow.lg },
  calcTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  calcProductName: { fontSize: 14, color: colors.textSecondary, marginBottom: 14 },
  productBadgeWrap: { backgroundColor: colors.surfaceAlt, borderRadius: Radius.md, padding: 12, marginBottom: 16, gap: 4 },
  productBadgeSub: { fontSize: 13, color: colors.textSecondary },
  productBadgeRule: { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 2 },
  calcSectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  calcPreviewCard: { backgroundColor: colors.surfaceAlt, borderRadius: Radius.md, padding: 14, marginVertical: 10, gap: 6 },
  calcPreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calcPreviewTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  calcPreviewMath: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
  calcResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calcResultLabel: { fontSize: 13, color: colors.textSecondary },
  calcResultVal: { fontSize: 16, fontWeight: '800', color: colors.primary },
  itemCalcBreakdown: { backgroundColor: colors.surfaceAlt, borderRadius: Radius.md, padding: 12, gap: 6, marginTop: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  breakdownValue: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  calcTotalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primary + '15', borderRadius: Radius.md, padding: 14, marginTop: 12 },
  calcTotalLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  calcTotalVal: { fontSize: 18, fontWeight: '800', color: colors.primary },
  calcActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  calcCancelBtn: { flex: 1, padding: 14, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border },
  calcCancelText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
  calcSaveBtn: { flex: 1, padding: 14, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  calcSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
