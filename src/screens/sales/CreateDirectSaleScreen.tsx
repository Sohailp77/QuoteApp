import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDirectSales } from '../../hooks/useDirectSales';
import { useAppStore } from '../../store/useAppStore';
import { useAppTheme } from '../../context/ThemeContext';
import { AppBackground } from '../../components/AppBackground';
import { Radius, Shadow } from '../../theme';
import { DirectSaleItem } from '../../types';

export const CreateDirectSaleScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = createStyles(colors, insets);
  const nav = useNavigation();
  const { create, loading } = useDirectSales();
  const { products, taxRates } = useAppStore();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<Omit<DirectSaleItem, 'id'>[]>([]);
  const [discount, setDiscount] = useState('0');
  const [taxRateId, setTaxRateId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Bank Transfer'>('Cash');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partial' | 'Pending'>('Paid');
  const [notes, setNotes] = useState('');

  const [showProductModal, setShowProductModal] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const discountVal = parseFloat(discount) || 0;
  const discountAmount = (subtotal * discountVal) / 100;
  const afterDiscount = subtotal - discountAmount;
  
  const taxObj = taxRates.find(t => t.id === taxRateId);
  const taxPercent = taxObj ? taxObj.percentage : 0;
  const taxAmount = (afterDiscount * taxPercent) / 100;
  const grandTotal = afterDiscount + taxAmount;

  const handleAddItem = (prod: any) => {
    setShowProductModal(false);
    const newItem = {
      product_id: prod.id,
      product_name: prod.name,
      quantity: 1,
      unit_price: prod.unit_price,
      discount: 0,
      line_total: prod.unit_price,
    };
    setItems([...items, newItem]);
  };

  const handleAddCustomItem = () => {
    const newItem = {
      product_name: 'Custom Item',
      quantity: 1,
      unit_price: 0,
      discount: 0,
      line_total: 0,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof DirectSaleItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    // Recalculate item total
    const itemDiscount = (item.unit_price * item.quantity * item.discount) / 100;
    item.line_total = (item.unit_price * item.quantity) - itemDiscount;
    
    newItems[index] = item;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (items.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    try {
      await create({
        customer_name: customerName,
        customer_phone: customerPhone,
        items,
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total: grandTotal,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        notes,
      });
      nav.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.screen}>
      <AppBackground />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>New Sale</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Details (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Customer Name"
            placeholderTextColor={colors.textMuted}
            value={customerName}
            onChangeText={setCustomerName}
          />
          <TextInput
            style={styles.input}
            placeholder="Customer Phone"
            placeholderTextColor={colors.textMuted}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowProductModal(true)}>
                <Text style={styles.linkText}>+ Product</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddCustomItem}>
                <Text style={styles.linkText}>+ Custom</Text>
              </TouchableOpacity>
            </View>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0, height: 36 }]}
                  value={item.product_name}
                  onChangeText={(val) => updateItem(index, 'product_name', val)}
                  placeholder="Item Name"
                />
                <TouchableOpacity onPress={() => removeItem(index)} style={{ padding: 8 }}>
                  <Ionicons name="close-circle" size={20} color="#E53935" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Qty</Text>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity onPress={() => updateItem(index, 'quantity', Math.max(1, item.quantity - 1))}>
                      <Ionicons name="remove-circle-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => updateItem(index, 'quantity', item.quantity + 1)}>
                      <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Price (₹)</Text>
                  <TextInput
                    style={[styles.input, { height: 36, marginBottom: 0 }]}
                    value={item.unit_price.toString()}
                    onChangeText={(val) => updateItem(index, 'unit_price', parseFloat(val) || 0)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Disc %</Text>
                  <TextInput
                    style={[styles.input, { height: 36, marginBottom: 0 }]}
                    value={item.discount.toString()}
                    onChangeText={(val) => updateItem(index, 'discount', parseFloat(val) || 0)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <Text style={styles.itemTotal}>Total: ₹{item.line_total.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary Details</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Overall Discount (%)</Text>
              <TextInput
                style={styles.input}
                value={discount}
                onChangeText={setDiscount}
                keyboardType="numeric"
              />
            </View>
          </View>
          <Text style={styles.label}>Tax Rate</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={[styles.chip, !taxRateId && styles.chipActive]}
              onPress={() => setTaxRateId('')}
            >
              <Text style={[styles.chipText, !taxRateId && styles.chipTextActive]}>None</Text>
            </TouchableOpacity>
            {taxRates.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.chip, taxRateId === t.id && styles.chipActive]}
                onPress={() => setTaxRateId(t.id)}
              >
                <Text style={[styles.chipText, taxRateId === t.id && styles.chipTextActive]}>
                  {t.name} ({t.percentage}%)
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.segments}>
            {['Cash', 'Card', 'UPI', 'Bank Transfer'].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.segment, paymentMethod === m && styles.segmentActive]}
                onPress={() => setPaymentMethod(m as any)}
              >
                <Text style={[styles.segmentText, paymentMethod === m && styles.segmentTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Payment Status</Text>
          <View style={styles.segments}>
            {['Paid', 'Partial', 'Pending'].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.segment, paymentStatus === m && styles.segmentActive]}
                onPress={() => setPaymentStatus(m as any)}
              >
                <Text style={[styles.segmentText, paymentStatus === m && styles.segmentTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Notes (Optional)"
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Subtotal:</Text>
          <Text style={styles.summaryText}>₹{subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Tax:</Text>
          <Text style={styles.summaryText}>₹{taxAmount.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 8 }]}>
          <Text style={styles.grandTotalText}>Total:</Text>
          <Text style={styles.grandTotalText}>₹{grandTotal.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Sale'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showProductModal} animationType="slide">
        <View style={[styles.screen, { paddingTop: Math.max(insets?.top || 0, 24) + 12 }]}>
          <View style={[styles.header, { paddingHorizontal: 20 }]}>
            <Text style={styles.title}>Select Product</Text>
            <TouchableOpacity onPress={() => setShowProductModal(false)}>
              <Text style={styles.linkText}>Close</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={products}
            keyExtractor={p => p.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.productCard} onPress={() => handleAddItem(item)}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productPrice}>₹{item.unit_price}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ padding: 20 }}
          />
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: any, insets: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Math.max(insets?.top || 0, 24) + 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  content: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.md,
    padding: 12,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 12 },
  linkText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  itemCard: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 8 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 36 },
  qtyText: { fontSize: 16, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  itemTotal: { textAlign: 'right', fontWeight: '700', color: colors.primary },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  segments: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  segment: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  segmentTextActive: { color: '#fff' },
  footer: {
    backgroundColor: colors.surface,
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Shadow.md,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryText: { fontSize: 14, color: colors.textSecondary },
  grandTotalText: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productName: { fontSize: 16, fontWeight: '600' },
  productPrice: { fontSize: 16, color: colors.primary, fontWeight: '700' },
});
