import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuotes } from '../../hooks/useQuotes';
import { useProducts } from '../../hooks/useProducts';
import { useTaxRates } from '../../hooks/useTaxRates';
import { Button } from '../../components/ui/Button';
import { Colors, Radius, Shadow } from '../../theme';
import { QuoteItem, Product } from '../../types';
import { BarcodeScannerModal } from '../../components/BarcodeScannerModal';

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

interface LineItem extends Omit<QuoteItem, 'id' | 'quote_id'> {}

export const CreateQuoteScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const { create } = useQuotes();
  const { products, fetch: fetchProducts } = useProducts();
  const { taxRates, fetch: fetchTaxRates } = useTaxRates();

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState('30');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [taxPct, setTaxPct] = useState('18');
  const [discountAmt, setDiscountAmt] = useState('0');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBarcodeScan = (barcodeData: string) => {
    // Find product by barcode or SKU
    const matched = products.find(
      (p) => 
        (p.barcode && p.barcode.trim() === barcodeData.trim()) ||
        (p.sku && p.sku.trim() === barcodeData.trim())
    );

    if (matched) {
      addProduct(matched);
      setShowBarcodeScanner(false);
      Alert.alert('Added Product', `"${matched.name}" has been added.`);
    } else {
      setShowBarcodeScanner(false);
      Alert.alert('Not Found', `No product matches barcode/SKU "${barcodeData}".`);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchTaxRates();
  }, []);

  const subtotal = lineItems.reduce((s, i) => s + i.line_total, 0);
  const discount = parseFloat(discountAmt) || 0;
  const tax = ((subtotal - discount) * (parseFloat(taxPct) || 0)) / 100;
  const total = subtotal - discount + tax;

  const activeTaxes = taxRates.filter((t) => t.is_active);

  const addProduct = (product: Product) => {
    const existing = lineItems.findIndex((i) => i.product_id === product.id);
    if (existing >= 0) {
      const updated = [...lineItems];
      updated[existing].quantity += 1;
      updated[existing].line_total =
        updated[existing].unit_price *
        updated[existing].quantity *
        (1 - updated[existing].discount / 100);
      setLineItems(updated);
    } else {
      setLineItems([
        ...lineItems,
        {
          product_id: product.id,
          product_name: product.name,
          unit_price: product.unit_price,
          quantity: 1,
          discount: 0,
          line_total: product.unit_price,
        },
      ]);
    }
    setShowProductPicker(false);
  };

  const updateQty = (idx: number, qty: number) => {
    if (qty < 1) return;
    const updated = [...lineItems];
    updated[idx].quantity = qty;
    updated[idx].line_total =
      updated[idx].unit_price * qty * (1 - updated[idx].discount / 100);
    setLineItems(updated);
  };

  const removeItem = (idx: number) => {
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const handleCreate = async () => {
    if (!clientName.trim()) { Alert.alert('Error', 'Client name is required'); return; }
    if (!clientEmail.trim()) { Alert.alert('Error', 'Client email is required'); return; }
    if (lineItems.length === 0) { Alert.alert('Error', 'Add at least one product'); return; }

    setLoading(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + (parseInt(validDays) || 30));

      const newQuote = await create(
        {
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          status: 'Draft',
          subtotal,
          discount,
          tax,
          total,
          notes,
          valid_until: validUntil.toISOString(),
        },
        lineItems
      );

      if (newQuote) {
        Alert.alert('Success', 'Quote created successfully!', [
          {
            text: 'View & Share PDF',
            onPress: () => nav.replace('QuoteDetail', { quoteId: newQuote.id }),
          },
          { text: 'OK', onPress: () => nav.goBack() },
        ]);
      } else {
        Alert.alert('Success', 'Quote created successfully!', [
          { text: 'OK', onPress: () => nav.goBack() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create quote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Quote</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Details</Text>
          <View style={styles.card}>
            <Field label="Client Name *" value={clientName} onChangeText={setClientName} placeholder="Enter client name" />
            <Field label="Email *" value={clientEmail} onChangeText={setClientEmail} placeholder="client@email.com" keyboardType="email-address" />
            <Field label="Phone" value={clientPhone} onChangeText={setClientPhone} placeholder="+91 9876543210" keyboardType="phone-pad" />
          </View>
        </View>

        {/* Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Products</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={styles.addItemBtn}
                onPress={() => setShowBarcodeScanner(true)}
              >
                <Ionicons name="barcode-outline" size={16} color={Colors.accent} />
                <Text style={styles.addItemText}>Scan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addItemBtn}
                onPress={() => setShowProductPicker(true)}
              >
                <Ionicons name="add" size={16} color={Colors.accent} />
                <Text style={styles.addItemText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {lineItems.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyItems}
              onPress={() => setShowProductPicker(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="cube-outline" size={28} color={Colors.textMuted} />
              <Text style={styles.emptyItemsText}>Tap to add products</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.card}>
              {lineItems.map((item, idx) => (
                <View key={idx} style={[styles.lineItem, idx > 0 && styles.lineItemBorder]}>
                  <View style={styles.lineItemTop}>
                    <Text style={styles.lineItemName} numberOfLines={1}>{item.product_name}</Text>
                    <TouchableOpacity onPress={() => removeItem(idx)}>
                      <Ionicons name="close-circle" size={18} color={Colors.statusRejected} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.lineItemBottom}>
                    <Text style={styles.lineItemPrice}>{formatCurrency(item.unit_price)}/unit</Text>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQty(idx, item.quantity - 1)}
                      >
                        <Ionicons name="remove" size={14} color={Colors.textPrimary} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQty(idx, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={14} color={Colors.textPrimary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.lineTotal}>{formatCurrency(item.line_total)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing & Settings</Text>
          <View style={styles.card}>
            <Field label="Discount (₹)" value={discountAmt} onChangeText={setDiscountAmt} placeholder="0" keyboardType="numeric" />
            
            {/* Tax Slabs Chips Selector */}
            <View style={styles.taxSelectorContainer}>
              <Text style={fieldStyles.label}>Tax Slab</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                {activeTaxes.map((rate) => {
                  const isSelected = parseFloat(taxPct) === rate.rate;
                  return (
                    <TouchableOpacity
                      key={rate.id}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected
                      ]}
                      onPress={() => setTaxPct(rate.rate.toString())}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {rate.name} ({rate.rate}%)
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.chip,
                    !activeTaxes.some((t) => t.rate === parseFloat(taxPct)) && styles.chipSelected
                  ]}
                  onPress={() => {
                    Alert.prompt(
                      'Custom Tax Rate',
                      'Enter custom tax rate percentage:',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Set',
                          onPress: (val?: string) => {
                            const parsed = parseFloat(val || '');
                            if (!isNaN(parsed) && parsed >= 0) {
                              setTaxPct(parsed.toString());
                            }
                          },
                        },
                      ],
                      'plain-text',
                      taxPct
                    );
                  }}
                >
                  <Text style={[styles.chipText, !activeTaxes.some((t) => t.rate === parseFloat(taxPct)) && styles.chipTextSelected]}>
                    Custom ({taxPct}%)
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            <Field label="Valid for (days)" value={validDays} onChangeText={setValidDays} placeholder="30" keyboardType="numeric" />
          </View>

          {/* Total preview */}
          <View style={styles.totalCard}>
            <Row label="Subtotal" value={formatCurrency(subtotal)} />
            {discount > 0 && <Row label="Discount" value={`-${formatCurrency(discount)}`} valueColor={Colors.statusAccepted} />}
            {tax > 0 && <Row label={`Tax (${taxPct}%)`} value={formatCurrency(tax)} />}
            <View style={styles.divider} />
            <Row label="Total" value={formatCurrency(total)} bold />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional notes or terms..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Button title="Create Quote" onPress={handleCreate} loading={loading} size="lg" />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Product Picker Modal */}
      <Modal visible={showProductPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Product</Text>
            <TouchableOpacity onPress={() => setShowProductPicker(false)}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.productRow} onPress={() => addProduct(item)}>
                <View style={styles.productIcon}>
                  <Ionicons name="cube-outline" size={20} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productCategory}>
                    {item.category} {item.stock_quantity !== undefined ? `• Stock: ${item.stock_quantity}` : ''}
                  </Text>
                </View>
                <Text style={styles.productPrice}>{formatCurrency(item.unit_price)}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No products yet. Add products first.</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </View>
      </Modal>

      <BarcodeScannerModal
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={handleBarcodeScan}
        title="Scan Product Barcode"
      />
    </View>
  );
};

const Field: React.FC<{
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: any;
}> = ({ label, value, onChangeText, placeholder, keyboardType }) => (
  <View style={fieldStyles.wrap}>
    <Text style={fieldStyles.label}>{label}</Text>
    <TextInput
      style={fieldStyles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.textMuted}
      keyboardType={keyboardType}
    />
  </View>
);

const Row: React.FC<{ label: string; value: string; valueColor?: string; bold?: boolean }> = ({
  label, value, valueColor, bold,
}) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
    <Text style={{ fontSize: bold ? 16 : 14, fontWeight: bold ? '800' : '400', color: Colors.textSecondary }}>
      {label}
    </Text>
    <Text style={{ fontSize: bold ? 18 : 14, fontWeight: bold ? '800' : '600', color: valueColor || Colors.textPrimary }}>
      {value}
    </Text>
  </View>
);

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
});

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
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    ...Shadow.sm,
  },
  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accent + '15',
    borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  addItemText: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  emptyItems: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyItemsText: { fontSize: 14, color: Colors.textMuted },
  lineItem: { paddingVertical: 12 },
  lineItemBorder: { borderTopWidth: 1, borderTopColor: Colors.divider },
  lineItemTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  lineItemName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  lineItemBottom: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineItemPrice: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  qtyBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, minWidth: 20, textAlign: 'center' },
  lineTotal: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  totalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    marginTop: 12,
    ...Shadow.sm,
  },
  divider: { height: 1, backgroundColor: Colors.divider, marginBottom: 8 },
  notesInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 100,
    ...Shadow.sm,
  },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  productRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  productIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: Colors.accent + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  productName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  productCategory: { fontSize: 12, color: Colors.textSecondary },
  productPrice: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  modalEmpty: { padding: 40, alignItems: 'center' },
  modalEmptyText: { fontSize: 15, color: Colors.textMuted, textAlign: 'center' },
  
  // Tax Slab styles
  taxSelectorContainer: {
    marginBottom: 14,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: Colors.accent + '12',
    borderColor: Colors.accent,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.accent,
    fontWeight: '700',
  },
});
