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
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuotes } from '../../hooks/useQuotes';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { useTaxRates } from '../../hooks/useTaxRates';
import { useCustomers } from '../../hooks/useCustomers';
import { Button } from '../../components/ui/Button';
import { Radius, Shadow } from '../../theme';
import { QuoteItem, Product, Customer } from '../../types';
import { BarcodeScannerModal } from '../../components/BarcodeScannerModal';
import { useAppTheme } from '../../context/ThemeContext';
import { calculateQuantity, getProductCalcConfig } from '../../utils/quantityCalculator';

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

interface LineItem extends Omit<QuoteItem, 'id' | 'quote_id'> {}

export const CreateQuoteScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets);
  const fieldStyles = createFieldStyles(colors);
  const nav = useNavigation<any>();
  const route = useRoute<RouteProp<{ params?: { quoteId?: string } }, 'params'>>();
  const quoteId = route.params?.quoteId;
  const { create, fetchById, updateQuoteDetails } = useQuotes();
  const { products, fetch: fetchProducts } = useProducts();
  const { categories, fetch: fetchCategories } = useCategories();
  const { taxRates, fetch: fetchTaxRates } = useTaxRates();
  const { fetch: fetchCustomers, search: searchCustomers, create: createCustomer } = useCustomers();
  const [isEdit, setIsEdit] = useState(false);

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState('30');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [taxPct, setTaxPct] = useState('18');
  const [discountType, setDiscountType] = useState<'pct' | 'amt'>('pct');
  const [discountVal, setDiscountVal] = useState('0');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [loading, setLoading] = useState(false);

  // Custom tax modal states
  const [customTaxModalVisible, setCustomTaxModalVisible] = useState(false);
  const [customTaxInput, setCustomTaxInput] = useState('');

  // Item calculator modal states
  const [calculatorModalVisible, setCalculatorModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [calcMode, setCalcMode] = useState<'simple' | 'size' | 'area' | 'length' | 'weight'>('simple');
  const [pcs, setPcs] = useState('1');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [area, setArea] = useState('');
  const [reqQty, setReqQty] = useState('');
  const [rate, setRate] = useState('0');
  const [itemDiscount, setItemDiscount] = useState('0');
  const [productName, setProductName] = useState('');

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
    fetchCategories();
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (quoteId) {
      setIsEdit(true);
      setLoading(true);
      fetchById(quoteId).then((q) => {
        if (q) {
          setClientName(q.client_name || '');
          setClientEmail(q.client_email || '');
          setClientPhone(q.client_phone || '');
          setSelectedCustomerId(q.customer_id);
          setNotes(q.notes || '');
          setLineItems(q.items || []);
          
          if (q.valid_until && q.created_at) {
            const diffTime = Math.abs(new Date(q.valid_until).getTime() - new Date(q.created_at).getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setValidDays(diffDays.toString());
          }
          
          const taxVal = q.tax || 0;
          const sub = q.subtotal || 0;
          const pct = sub > 0 ? Math.round((taxVal / sub) * 100) : 18;
          setTaxPct(pct.toString());
          
          if (q.discount && sub > 0) {
            const discPct = (q.discount / sub) * 100;
            setDiscountVal(discPct.toFixed(2).replace(/\.00$/, ''));
            setDiscountType('pct');
          } else {
            setDiscountVal((q.discount || 0).toString());
            setDiscountType('amt');
          }
        }
        setLoading(false);
      }).catch((err) => {
        console.error('Failed to load quote details for editing:', err);
        setLoading(false);
      });
    }
  }, [quoteId, fetchById]);

  // Dynamic Area calculation hook
  useEffect(() => {
    const l = parseFloat(length) || 0;
    const w = parseFloat(width) || 0;
    if (l > 0 && w > 0) {
      setArea((l * w).toString());
    }
  }, [length, width]);

  const getItemCalcResult = () => {
    const pConfig = selectedProduct ? getProductCalcConfig(selectedProduct) : {
      calc_method: 'direct' as const,
      input_unit: '',
      unit_coverage: 1,
      rounding_mode: 'round_up' as const,
      selling_unit: 'piece',
    };

    const pCount = parseFloat(pcs) || 1;
    const l = parseFloat(length) || 0;
    const w = parseFloat(width) || 0;
    const a = parseFloat(area) || 0;
    const rQty = parseFloat(reqQty) || 0;

    let inputRequirement = 0;
    if (pConfig.calc_method === 'area') {
      if (l > 0 && w > 0) inputRequirement = l * w;
      else if (a > 0) inputRequirement = a;
      else if (rQty > 0) inputRequirement = rQty;
    } else if (pConfig.calc_method === 'length') {
      inputRequirement = l > 0 ? l : rQty;
    } else if (pConfig.calc_method === 'direct') {
      inputRequirement = pCount;
    } else {
      inputRequirement = rQty > 0 ? rQty : pCount;
    }

    return calculateQuantity({
      calc_method: pConfig.calc_method,
      input_qty: inputRequirement,
      length: l,
      width: w,
      pcs: pCount,
      unit_coverage: pConfig.unit_coverage,
      rounding_mode: pConfig.rounding_mode,
      input_unit: pConfig.input_unit,
      selling_unit: pConfig.selling_unit,
    });
  };

  const calcQty = () => {
    return getItemCalcResult().final_qty;
  };

  const calcLineTotal = () => {
    const qty = calcQty();
    const r = parseFloat(rate) || 0;
    const d = parseFloat(itemDiscount) || 0;
    return qty * r * (1 - d / 100);
  };

  const subtotal = lineItems.reduce((s, i) => s + i.line_total, 0);
  const rawDiscVal = parseFloat(discountVal) || 0;
  const discount = discountType === 'pct' ? (subtotal * rawDiscVal) / 100 : rawDiscVal;
  const discountPctCalculated = subtotal > 0 ? (discount / subtotal) * 100 : 0;
  const tax = ((subtotal - discount) * (parseFloat(taxPct) || 0)) / 100;
  const total = Math.max(0, subtotal - discount + tax);

  const activeTaxes = taxRates.filter((t) => t.is_active);

  const addProduct = (product: Product) => {
    const pConfig = getProductCalcConfig(product);
    setSelectedProduct(product);
    setProductName(product.name);
    setRate(product.unit_price.toString());
    setPcs('1');
    setLength('');
    setWidth('');
    setArea('');
    setReqQty('');
    setItemDiscount('0');

    setCalcMode(pConfig.calc_method as any);

    setEditingIndex(null);
    setCalculatorModalVisible(true);
    setShowProductPicker(false);
  };

  const editProduct = (index: number) => {
    const item = lineItems[index];
    const matched = products.find(p => p.id === item.product_id);
    setSelectedProduct(matched || null);
    
    setProductName(item.product_name);
    setRate(item.unit_price.toString());
    setPcs((item.pcs || 1).toString());
    setLength((item.length || '').toString());
    setWidth((item.width || '').toString());
    setArea((item.area || '').toString());
    setReqQty((item.input_qty || '').toString());
    setItemDiscount((item.discount || 0).toString());
    setCalcMode((item.calc_method || item.calc_mode || 'direct') as any);
    setEditingIndex(index);
    setCalculatorModalVisible(true);
  };

  const handleSaveLineItem = () => {
    const calcRes = getItemCalcResult();
    const r = parseFloat(rate) || 0;
    const d = parseFloat(itemDiscount) || 0;
    const qty = calcRes.final_qty;
    const total = qty * r * (1 - d / 100);

    if (qty <= 0) {
      Alert.alert('Error', 'Calculated quantity must be greater than zero.');
      return;
    }

    const newItem: LineItem = {
      product_id: selectedProduct?.id,
      product_name: productName,
      unit_price: r,
      quantity: qty,
      discount: d,
      line_total: total,
      calc_method: calcRes.calc_method || (calcMode as any),
      input_qty: calcRes.input_qty,
      input_unit: calcRes.input_unit,
      selling_unit: calcRes.selling_unit,
      unit_coverage: calcRes.unit_coverage,
      calculated_qty: calcRes.calculated_qty,
      rounding_mode: calcRes.rounding_mode,
      formula_text: calcRes.formula_text,
      pcs: parseFloat(pcs) || 1,
      length: parseFloat(length) || undefined,
      width: parseFloat(width) || undefined,
      area: parseFloat(area) || undefined,
    };

    if (editingIndex !== null) {
      const updated = [...lineItems];
      updated[editingIndex] = newItem;
      setLineItems(updated);
    } else {
      setLineItems([...lineItems, newItem]);
    }
    setCalculatorModalVisible(false);
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

      // Save as new customer if not already linked
      let customerId = selectedCustomerId;
      if (!customerId && clientName.trim()) {
        try {
          const newCust = await createCustomer({
            name: clientName.trim(),
            email: clientEmail.trim(),
            phone: clientPhone.trim(),
            billing_address: '',
            gst_number: '',
          });
          customerId = newCust?.id;
        } catch {}
      }

      if (isEdit && quoteId) {
        const updatedQuote = await updateQuoteDetails(quoteId, {
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          subtotal,
          discount,
          tax,
          total,
          notes,
          valid_until: validUntil.toISOString(),
          customer_id: customerId,
          items: lineItems,
        });

        if (updatedQuote) {
          Alert.alert('Success', 'Quote updated successfully!', [
            {
              text: 'View & Share PDF',
              onPress: () => nav.replace('QuoteDetail', { quoteId: updatedQuote.id }),
            },
            { text: 'OK', onPress: () => nav.goBack() },
          ]);
        } else {
          Alert.alert('Success', 'Quote updated successfully!', [
            { text: 'OK', onPress: () => nav.goBack() },
          ]);
        }
      } else {
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
            customer_id: customerId,
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
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create quote');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (c: Customer) => {
    setClientName(c.name || '');
    setClientEmail(c.email || '');
    setClientPhone(c.phone || '');
    setSelectedCustomerId(c.id);
    setShowSuggestions(false);
    setCustomerSuggestions([]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Quote' : 'New Quote'}</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Details</Text>
          <View style={styles.card}>
            {/* Customer Name with Autocomplete */}
            <View style={fieldStyles.wrap}>
              <Text style={fieldStyles.label}>Client Name *</Text>
              <TextInput
                style={fieldStyles.input}
                value={clientName}
                onChangeText={async (text) => {
                  setClientName(text);
                  setSelectedCustomerId(undefined);
                  if (text.trim().length >= 1) {
                    const results = await searchCustomers(text);
                    setCustomerSuggestions(results);
                    setShowSuggestions(results.length > 0);
                  } else {
                    setShowSuggestions(false);
                    setCustomerSuggestions([]);
                  }
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 350)}
                placeholder="Type to search or enter new name"
                placeholderTextColor={colors.textMuted}
              />
              {showSuggestions && customerSuggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  {customerSuggestions.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.suggestionRow}
                      onPress={() => handleSelectCustomer(c)}
                      onPressIn={() => handleSelectCustomer(c)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.suggestionAvatar}>
                        <Text style={styles.suggestionAvatarText}>{(c.name[0] || 'C').toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionName}>{c.name}</Text>
                        {c.email ? <Text style={styles.suggestionDetail}>{c.email}</Text> : null}
                        {c.phone ? <Text style={styles.suggestionDetail}>{c.phone}</Text> : null}
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {selectedCustomerId && (
                <View style={styles.crmLinkedBadge}>
                  <Ionicons name="person-circle-outline" size={14} color="#10B981" />
                  <Text style={styles.crmLinkedText}>CRM customer linked</Text>
                </View>
              )}
            </View>
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
                <Ionicons name="barcode-outline" size={16} color={colors.primary} />
                <Text style={styles.addItemText}>Scan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addItemBtn}
                onPress={() => setShowProductPicker(true)}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
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
              <Ionicons name="cube-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptyItemsText}>Tap to add products</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.card}>
              {lineItems.map((item, idx) => (
                <View key={idx} style={[styles.lineItem, idx > 0 && styles.lineItemBorder]}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => editProduct(idx)}>
                    <View style={styles.lineItemTop}>
                      <Text style={styles.lineItemName} numberOfLines={1}>{item.product_name}</Text>
                      <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 4 }}>
                        <Ionicons name="close-circle" size={18} color={colors.statusRejected} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.lineItemBottom}>
                      <View style={{ gap: 2 }}>
                        <Text style={styles.lineItemPrice}>
                          MRP: {formatCurrency(item.unit_price)} per unit
                        </Text>
                        {item.formula_text ? (
                          <Text style={styles.lineItemDimensions}>
                            {item.formula_text}
                          </Text>
                        ) : (
                          <Text style={styles.lineItemDimensions}>
                            Qty: {item.quantity} {item.selling_unit || ''}
                          </Text>
                        )}
                        {item.discount > 0 && (
                          <Text style={styles.lineItemDiscount}>{item.discount}% off</Text>
                        )}
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
            <View style={fieldStyles.wrap}>
              <View style={styles.discountHeaderRow}>
                <Text style={fieldStyles.label}>Discount</Text>
                <View style={styles.discountToggleGroup}>
                  <TouchableOpacity
                    style={[styles.discountChip, discountType === 'pct' && styles.discountChipActive]}
                    onPress={() => setDiscountType('pct')}
                  >
                    <Text style={[styles.discountChipText, discountType === 'pct' && styles.discountChipTextActive]}>% Percentage</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.discountChip, discountType === 'amt' && styles.discountChipActive]}
                    onPress={() => setDiscountType('amt')}
                  >
                    <Text style={[styles.discountChipText, discountType === 'amt' && styles.discountChipTextActive]}>₹ Amount</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={fieldStyles.input}
                value={discountVal}
                onChangeText={setDiscountVal}
                placeholder={discountType === 'pct' ? 'Enter percentage (e.g. 10)' : 'Enter amount in ₹'}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
              {subtotal > 0 && parseFloat(discountVal) > 0 && (
                <View style={styles.discountCalcBadge}>
                  <Ionicons name="calculator-outline" size={14} color={colors.primary} />
                  <Text style={styles.discountCalcText}>
                    {discountType === 'pct'
                      ? `${discountVal}% discount = -${formatCurrency(discount)}`
                      : `-${formatCurrency(discount)} discount = ${discountPctCalculated.toFixed(1)}% of subtotal`}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Tax Slabs Chips Selector */}
            <View style={styles.taxSelectorContainer}>
              <Text style={fieldStyles.label}>Tax Slab</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                {activeTaxes.map((rate) => {
                  const isSelected = parseFloat(taxPct) === rate.percentage;
                  return (
                    <TouchableOpacity
                      key={rate.id}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected
                      ]}
                      onPress={() => setTaxPct(rate.percentage.toString())}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {rate.name} ({rate.percentage}%)
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.chip,
                    !activeTaxes.some((t) => t.percentage === parseFloat(taxPct)) && styles.chipSelected
                  ]}
                  onPress={() => {
                    setCustomTaxInput(taxPct);
                    setCustomTaxModalVisible(true);
                  }}
                >
                  <Text style={[styles.chipText, !activeTaxes.some((t) => t.percentage === parseFloat(taxPct)) && styles.chipTextSelected]}>
                    Custom ({taxPct}%)
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            <Field label="Valid for (days)" value={validDays} onChangeText={setValidDays} placeholder="30" keyboardType="numeric" />
          </View>

          {/* Total preview */}
          <View style={styles.totalCard}>
            <Row label="Subtotal (MRP)" value={formatCurrency(subtotal)} />
            {discount > 0 && (
              <Row
                label={`Discount ${discountType === 'pct' ? `(${discountVal}%)` : `(${discountPctCalculated.toFixed(1)}%)`}`}
                value={`-${formatCurrency(discount)}`}
                valueColor={colors.statusAccepted}
              />
            )}
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
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Button title={isEdit ? 'Save Changes' : 'Create Quote'} onPress={handleCreate} loading={loading} size="lg" />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Product Picker Modal */}
      <Modal visible={showProductPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Product</Text>
            <TouchableOpacity onPress={() => setShowProductPicker(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.productRow} onPress={() => addProduct(item)}>
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
                    {item.category} {item.stock_quantity !== undefined ? `• Stock: ${item.stock_quantity}` : ''}
                  </Text>
                </View>
                <Text style={styles.productPrice}>MRP: {formatCurrency(item.unit_price)}</Text>
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

      {/* Custom Tax Rate Modal */}
      <Modal
        visible={customTaxModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomTaxModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Custom Tax Rate</Text>
            
            <View style={fieldStyles.wrap}>
              <Text style={styles.fieldLabel}>Tax Percentage (%) *</Text>
              <TextInput
                style={styles.modalInput}
                value={customTaxInput}
                onChangeText={setCustomTaxInput}
                placeholder="e.g. 18"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                autoFocus
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setCustomTaxModalVisible(false)}
                style={[styles.modalBtn, styles.modalCancelBtn]}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const parsed = parseFloat(customTaxInput);
                  if (!isNaN(parsed) && parsed >= 0) {
                    setTaxPct(parsed.toString());
                    setCustomTaxModalVisible(false);
                  } else {
                    Alert.alert('Error', 'Please enter a valid percentage.');
                  }
                }}
                style={[styles.modalBtn, styles.modalCreateBtn]}
              >
                <Text style={styles.modalCreateBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Item Calculator Modal */}
      <Modal
        visible={calculatorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCalculatorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 450, width: '100%' }]}>
            <Text style={styles.modalTitle}>
              {editingIndex !== null ? 'Edit Quote Item' : 'Configure Quote Item'}
            </Text>
            <Text style={styles.modalProductName}>{productName}</Text>

            {selectedProduct && (() => {
              const pConfig = getProductCalcConfig(selectedProduct);
              return (
                <View style={styles.productBadgeWrap}>
                  <Text style={styles.productBadgeName}>{selectedProduct.name}</Text>
                  <Text style={styles.productBadgeSub}>
                    Selling Unit: <Text style={{ fontWeight: '700' }}>{pConfig.selling_unit}</Text> • MRP: <Text style={{ fontWeight: '700' }}>₹{selectedProduct.unit_price}/{pConfig.selling_unit}</Text>
                  </Text>
                  {pConfig.calc_method !== 'direct' && (
                    <Text style={styles.productBadgeRule}>
                      Rule: 1 {pConfig.selling_unit} = {pConfig.unit_coverage} {pConfig.input_unit} ({pConfig.rounding_mode.replace('_', ' ')})
                    </Text>
                  )}
                </View>
              );
            })()}

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {(() => {
                const pConfig = selectedProduct ? getProductCalcConfig(selectedProduct) : {
                  calc_method: 'direct' as const,
                  input_unit: '',
                  unit_coverage: 1,
                  rounding_mode: 'round_up' as const,
                  selling_unit: 'piece',
                };
                const calcRes = getItemCalcResult();

                return (
                  <View>
                    {pConfig.calc_method === 'direct' ? (
                      <Field
                        label={`Quantity (${pConfig.selling_unit})`}
                        value={pcs}
                        onChangeText={setPcs}
                        placeholder="1"
                        keyboardType="numeric"
                      />
                    ) : pConfig.calc_method === 'area' ? (
                      <View style={{ gap: 10 }}>
                        <Text style={fieldStyles.label}>Enter Area or Dimensions ({pConfig.input_unit})</Text>
                        <View style={styles.row}>
                          <View style={{ flex: 1 }}>
                            <Field
                              label="Length"
                              value={length}
                              onChangeText={setLength}
                              placeholder="e.g. 10"
                              keyboardType="numeric"
                            />
                          </View>
                          <View style={{ width: 12 }} />
                          <View style={{ flex: 1 }}>
                            <Field
                              label="Width"
                              value={width}
                              onChangeText={setWidth}
                              placeholder="e.g. 10"
                              keyboardType="numeric"
                            />
                          </View>
                        </View>
                        <Field
                          label={`Direct Area (${pConfig.input_unit})`}
                          value={area || reqQty}
                          onChangeText={(v) => {
                            setArea(v);
                            setReqQty(v);
                          }}
                          placeholder="e.g. 100"
                          keyboardType="numeric"
                        />
                      </View>
                    ) : pConfig.calc_method === 'length' ? (
                      <View style={{ gap: 10 }}>
                        <Field
                          label={`Required Length (${pConfig.input_unit})`}
                          value={length || reqQty}
                          onChangeText={(v) => {
                            setLength(v);
                            setReqQty(v);
                          }}
                          placeholder="e.g. 25"
                          keyboardType="numeric"
                        />
                      </View>
                    ) : (
                      <View style={{ gap: 10 }}>
                        <Field
                          label={`Required Quantity / Weight / Volume (${pConfig.input_unit || 'Unit'})`}
                          value={reqQty}
                          onChangeText={setReqQty}
                          placeholder="e.g. 100"
                          keyboardType="numeric"
                        />
                      </View>
                    )}

                    {/* Quantity calculation live preview card */}
                    <View style={styles.calcPreviewCard}>
                      <View style={styles.calcPreviewHeader}>
                        <Ionicons name="calculator" size={16} color={colors.primary} />
                        <Text style={styles.calcPreviewCardTitle}>Calculated Selling Quantity</Text>
                      </View>

                      {pConfig.calc_method !== 'direct' ? (
                        <>
                          <Text style={styles.calcPreviewMath}>{calcRes.formula_text}</Text>
                          <View style={styles.calcResultRow}>
                            <Text style={styles.calcResultLabel}>Quoted Quantity:</Text>
                            <Text style={styles.calcResultVal}>
                              {calcRes.final_qty} {calcRes.selling_unit}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <View style={styles.calcResultRow}>
                          <Text style={styles.calcResultLabel}>Selling Quantity:</Text>
                          <Text style={styles.calcResultVal}>
                            {calcRes.final_qty} {calcRes.selling_unit}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })()}

              <View style={[styles.row, { marginTop: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Field
                    label={`MRP / ${selectedProduct?.unit || 'Unit'} (₹)`}
                    value={rate}
                    onChangeText={setRate}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field
                    label="Discount (%)"
                    value={itemDiscount}
                    onChangeText={setItemDiscount}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Item calculator live breakdown */}
              {(() => {
                const calcRes = getItemCalcResult();
                const qty = calcRes.final_qty;
                const r = parseFloat(rate) || 0;
                const d = parseFloat(itemDiscount) || 0;
                const mrpTotal = qty * r;
                const discAmt = mrpTotal * (d / 100);
                return (
                  <View style={styles.itemCalcBreakdownCard}>
                    <View style={styles.itemCalcBreakdownRow}>
                      <Text style={styles.itemCalcBreakdownLabel}>MRP Subtotal ({qty} {calcRes.selling_unit || 'units'} × ₹{r}):</Text>
                      <Text style={styles.itemCalcBreakdownValue}>₹{mrpTotal.toLocaleString('en-IN')}</Text>
                    </View>
                    {d > 0 && (
                      <View style={styles.itemCalcBreakdownRow}>
                        <Text style={styles.itemCalcBreakdownLabel}>Item Discount ({d}%):</Text>
                        <Text style={[styles.itemCalcBreakdownValue, { color: colors.statusAccepted }]}>
                          -₹{discAmt.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}

              <View style={styles.calcTotalBox}>
                <Text style={styles.calcTotalLabel}>Net Line Total</Text>
                <Text style={styles.calcTotalVal}>{formatCurrency(calcLineTotal())}</Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setCalculatorModalVisible(false)}
                style={[styles.modalBtn, styles.modalCancelBtn]}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveLineItem}
                style={[styles.modalBtn, styles.modalCreateBtn]}
              >
                <Text style={styles.modalCreateBtnText}>Save Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Global Processing Modal Overlay */}
      <Modal visible={loading} transparent animationType="fade">
        <View style={styles.loadingOverlayModal}>
          <View style={styles.loadingOverlayBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingOverlayTitle}>
              {isEdit ? 'Saving Changes...' : 'Creating Quote...'}
            </Text>
            <Text style={styles.loadingOverlaySub}>
              Saving items, taxes & calculating pricing breakdown
            </Text>
          </View>
        </View>
      </Modal>
    </View>
    </KeyboardAvoidingView>
  );
};

const Field: React.FC<{
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: any;
}> = ({ label, value, onChangeText, placeholder, keyboardType }) => {
  const { colors } = useAppTheme();
  const fieldStyles = createFieldStyles(colors);
  return (
  <View style={fieldStyles.wrap}>
    <Text style={fieldStyles.label}>{label}</Text>
    <TextInput
      style={fieldStyles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType={keyboardType}
    />
  </View>
  );
};

const Row: React.FC<{ label: string; value: string; valueColor?: string; bold?: boolean }> = ({
  label, value, valueColor, bold,
}) => {
  const { colors } = useAppTheme();
  return (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
    <Text style={{ fontSize: bold ? 16 : 14, fontWeight: bold ? '800' : '400', color: colors.textSecondary }}>
      {label}
    </Text>
    <Text style={{ fontSize: bold ? 18 : 14, fontWeight: bold ? '800' : '600', color: valueColor || colors.textPrimary }}>
      {value}
    </Text>
  </View>
  );
};

const createFieldStyles = (colors: any) => StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
});

const createStyles = (colors: any, insets?: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Math.max(insets?.top || 0, 24) + 12,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    ...Shadow.sm,
  },
  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '15',
    borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  addItemText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  emptyItems: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyItemsText: { fontSize: 14, color: colors.textMuted },
  lineItem: { paddingVertical: 12 },
  lineItemBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  lineItemTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  lineItemName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1, marginRight: 8 },
  lineItemBottom: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineItemPrice: { flex: 1, fontSize: 13, color: colors.textSecondary },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceAlt, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  qtyBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, minWidth: 20, textAlign: 'center' },
  lineTotal: { fontSize: 15, fontWeight: '700', color: colors.primary },
  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    marginTop: 12,
    ...Shadow.sm,
  },
  divider: { height: 1, backgroundColor: colors.divider, marginBottom: 8 },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 100,
    ...Shadow.sm,
  },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  productRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  productIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  productRowImage: {
    width: 40,
    height: 40,
    resizeMode: 'cover',
  },
  productName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  productCategory: { fontSize: 12, color: colors.textSecondary },
  productPrice: { fontSize: 16, fontWeight: '700', color: colors.primary },
  modalEmpty: { padding: 40, alignItems: 'center' },
  modalEmptyText: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  
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
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: colors.primary + '12',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  // Autocomplete
  suggestionsBox: {
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: colors.border,
    marginTop: 4,
    overflow: 'hidden',
    ...Shadow.md,
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  suggestionAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primary + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  suggestionAvatarText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  suggestionName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  suggestionDetail: { fontSize: 12, color: colors.textSecondary },
  crmLinkedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 6,
    backgroundColor: '#10B98118',
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  crmLinkedText: { fontSize: 12, fontWeight: '600', color: '#10B981' },
  
  // Calculator Modal styling
  modalProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 16,
  },
  calcModeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  calcModeTabsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  calcModeTabChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calcModeTabChipActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  calcModeTabChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  calcModeTabChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  productBadgeWrap: {
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  productBadgeName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  productBadgeSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  productBadgeRule: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
    fontStyle: 'italic',
  },

  calcPreviewCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: 12,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calcPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  calcPreviewCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  calcPreviewMath: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  calcResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border + '60',
  },
  calcResultLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  calcResultVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },

  calcTotalBox: {
    backgroundColor: colors.primary + '08',
    padding: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.primary + '15',
  },
  calcTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  calcTotalVal: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  lineItemDimensions: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  lineItemDiscount: {
    fontSize: 11,
    color: colors.statusAccepted,
    fontWeight: '600',
    marginTop: 2,
  },
  
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    ...Shadow.md,
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  modalInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  modalCancelBtn: {
    backgroundColor: colors.surfaceAlt,
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalCreateBtn: {
    backgroundColor: colors.primary,
  },
  modalCreateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  discountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  discountToggleGroup: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.full,
    padding: 2,
  },
  discountChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  discountChipActive: {
    backgroundColor: colors.primary,
  },
  discountChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  discountChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  discountCalcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: colors.primary + '12',
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  discountCalcText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  itemCalcBreakdownCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: 10,
    marginTop: 10,
    gap: 4,
  },
  itemCalcBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCalcBreakdownLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  itemCalcBreakdownValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  loadingOverlayModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingOverlayBox: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    ...Shadow.lg,
  },
  loadingOverlayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  loadingOverlaySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
