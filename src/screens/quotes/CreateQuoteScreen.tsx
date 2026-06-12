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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuotes } from '../../hooks/useQuotes';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { useTaxRates } from '../../hooks/useTaxRates';
import { useCustomers } from '../../hooks/useCustomers';
import { Button } from '../../components/ui/Button';
import { Colors, Radius, Shadow } from '../../theme';
import { QuoteItem, Product, Customer } from '../../types';
import { BarcodeScannerModal } from '../../components/BarcodeScannerModal';

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

interface LineItem extends Omit<QuoteItem, 'id' | 'quote_id'> {}

export const CreateQuoteScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const { create } = useQuotes();
  const { products, fetch: fetchProducts } = useProducts();
  const { categories, fetch: fetchCategories } = useCategories();
  const { taxRates, fetch: fetchTaxRates } = useTaxRates();
  const { search: searchCustomers, create: createCustomer } = useCustomers();

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
  const [discountAmt, setDiscountAmt] = useState('0');
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
  }, []);

  // Area calculation hook
  useEffect(() => {
    if (calcMode === 'size') {
      const l = parseFloat(length) || 0;
      const w = parseFloat(width) || 0;
      if (l > 0 && w > 0) {
        setArea((l * w).toString());
      } else {
        setArea('');
      }
    }
  }, [length, width, calcMode]);

  const calcQty = () => {
    const p = parseFloat(pcs) || 0;
    if (calcMode === 'simple' || calcMode === 'weight') {
      return p;
    } else if (calcMode === 'size') {
      const l = parseFloat(length) || 0;
      const w = parseFloat(width) || 0;
      return p * l * w;
    } else if (calcMode === 'area') {
      const a = parseFloat(area) || 0;
      return p * a;
    } else if (calcMode === 'length') {
      const l = parseFloat(length) || 0;
      return p * l;
    }
    return p;
  };

  const calcLineTotal = () => {
    const qty = calcQty();
    const r = parseFloat(rate) || 0;
    const d = parseFloat(itemDiscount) || 0;
    return qty * r * (1 - d / 100);
  };
  const subtotal = lineItems.reduce((s, i) => s + i.line_total, 0);
  const discount = parseFloat(discountAmt) || 0;
  const tax = ((subtotal - discount) * (parseFloat(taxPct) || 0)) / 100;
  const total = subtotal - discount + tax;

  const activeTaxes = taxRates.filter((t) => t.is_active);

  const addProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductName(product.name);
    setRate(product.unit_price.toString());
    setPcs('1');
    setLength('');
    setWidth('');
    setArea('');
    setItemDiscount('0');

    // Resolve calc mode: product calc_type -> category calc_type -> default 'pcs'
    const cat = categories.find((c) => c.name === product.category);
    const resolvedCalcType = product.calc_type || cat?.calc_type || 'pcs';
    const defaultMode = resolvedCalcType === 'pcs' ? 'simple' : resolvedCalcType;
    setCalcMode(defaultMode as any);

    setEditingIndex(null);
    setCalculatorModalVisible(true);
    setShowProductPicker(false);
  };

  const editProduct = (index: number) => {
    const item = lineItems[index];
    // Find matching product in state
    const matched = products.find(p => p.id === item.product_id);
    setSelectedProduct(matched || null);
    
    setProductName(item.product_name);
    setRate(item.unit_price.toString());
    setPcs((item.pcs || item.quantity).toString());
    setLength((item.length || '').toString());
    setWidth((item.width || '').toString());
    setArea((item.area || '').toString());
    setItemDiscount((item.discount || 0).toString());
    setCalcMode(item.calc_mode || 'simple');
    setEditingIndex(index);
    setCalculatorModalVisible(true);
  };

  const handleSaveLineItem = () => {
    const r = parseFloat(rate) || 0;
    const d = parseFloat(itemDiscount) || 0;
    const p = parseFloat(pcs) || 0;
    const qty = calcQty();
    const total = calcLineTotal();

    if (p <= 0) {
      Alert.alert('Error', 'Quantity/Pcs must be greater than zero.');
      return;
    }

    const newItem: LineItem = {
      product_id: selectedProduct?.id,
      product_name: productName,
      unit_price: r,
      quantity: qty,
      discount: d,
      line_total: total,
      pcs: p,
      length: (calcMode === 'size' || calcMode === 'length') ? (parseFloat(length) || undefined) : undefined,
      width: calcMode === 'size' ? (parseFloat(width) || undefined) : undefined,
      area: (calcMode === 'size' || calcMode === 'area') ? (parseFloat(area) || undefined) : undefined,
      calc_mode: calcMode,
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
            {/* Customer Name with Autocomplete */}
            <View style={fieldStyles.wrap}>
              <Text style={fieldStyles.label}>Client Name *</Text>
              <TextInput
                style={fieldStyles.input}
                value={clientName}
                onChangeText={async (text) => {
                  setClientName(text);
                  setSelectedCustomerId(undefined);
                  if (text.length >= 2) {
                    const results = await searchCustomers(text);
                    setCustomerSuggestions(results);
                    setShowSuggestions(results.length > 0);
                  } else {
                    setShowSuggestions(false);
                    setCustomerSuggestions([]);
                  }
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Type to search or enter new name"
                placeholderTextColor={Colors.textMuted}
              />
              {showSuggestions && customerSuggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  {customerSuggestions.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.suggestionRow}
                      onPress={() => {
                        setClientName(c.name);
                        setClientEmail(c.email);
                        setClientPhone(c.phone);
                        setSelectedCustomerId(c.id);
                        setShowSuggestions(false);
                        setCustomerSuggestions([]);
                      }}
                    >
                      <View style={styles.suggestionAvatar}>
                        <Text style={styles.suggestionAvatarText}>{c.name[0].toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionName}>{c.name}</Text>
                        {c.email ? <Text style={styles.suggestionDetail}>{c.email}</Text> : null}
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
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
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => editProduct(idx)}>
                    <View style={styles.lineItemTop}>
                      <Text style={styles.lineItemName} numberOfLines={1}>{item.product_name}</Text>
                      <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 4 }}>
                        <Ionicons name="close-circle" size={18} color={Colors.statusRejected} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.lineItemBottom}>
                      <View style={{ gap: 2 }}>
                        <Text style={styles.lineItemPrice}>
                          {formatCurrency(item.unit_price)} per unit
                        </Text>
                        {item.calc_mode === 'size' && (
                          <Text style={styles.lineItemDimensions}>
                            Size: {item.length} × {item.width} | Area: {item.area} | Pcs: {item.pcs}
                          </Text>
                        )}
                        {item.calc_mode === 'area' && (
                          <Text style={styles.lineItemDimensions}>
                            Area: {item.area} | Pcs: {item.pcs}
                          </Text>
                        )}
                        {item.calc_mode === 'length' && (
                          <Text style={styles.lineItemDimensions}>
                            Length: {item.length} | Pcs: {item.pcs}
                          </Text>
                        )}
                        {item.calc_mode === 'weight' && (
                          <Text style={styles.lineItemDimensions}>
                            Weight: {item.pcs}
                          </Text>
                        )}
                        {item.calc_mode === 'simple' && (
                          <Text style={styles.lineItemDimensions}>
                            Qty: {item.quantity}
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
            <Field label="Discount (₹)" value={discountAmt} onChangeText={setDiscountAmt} placeholder="0" keyboardType="numeric" />
            
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
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.productRowImage} />
                  ) : (
                    <Ionicons name="cube-outline" size={20} color={Colors.accent} />
                  )}
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
            
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Tax Percentage (%) *</Text>
              <TextInput
                style={styles.modalInput}
                value={customTaxInput}
                onChangeText={setCustomTaxInput}
                placeholder="e.g. 18"
                placeholderTextColor={Colors.textMuted}
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

            {/* Calc Mode Selector */}
            <Text style={styles.calcModeLabel}>Calculation Method</Text>
            <View style={styles.calcModeTabsContainer}>
              {[
                { type: 'simple', label: 'PCS' },
                { type: 'size', label: 'Size (L × W)' },
                { type: 'area', label: 'Area' },
                { type: 'length', label: 'Length' },
                { type: 'weight', label: 'Weight (KG)' }
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.type}
                  style={[styles.calcModeTabChip, calcMode === tab.type && styles.calcModeTabChipActive]}
                  onPress={() => {
                    setCalcMode(tab.type as any);
                    if (tab.type === 'weight') {
                      setPcs('1');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.calcModeTabChipText, calcMode === tab.type && styles.calcModeTabChipTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Field
                    label={
                      calcMode === 'simple' ? 'Quantity' : 
                      calcMode === 'weight' ? 'Weight (KG)' : 
                      'Pcs / Qty'
                    }
                    value={pcs}
                    onChangeText={setPcs}
                    placeholder="1"
                    keyboardType="numeric"
                  />
                </View>
                {calcMode === 'size' && (
                  <>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Length"
                        value={length}
                        onChangeText={setLength}
                        placeholder="e.g. 4"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Width"
                        value={width}
                        onChangeText={setWidth}
                        placeholder="e.g. 3"
                        keyboardType="numeric"
                      />
                    </View>
                  </>
                )}
                {calcMode === 'length' && (
                  <>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Length"
                        value={length}
                        onChangeText={setLength}
                        placeholder="e.g. 4"
                        keyboardType="numeric"
                      />
                    </View>
                  </>
                )}
                {calcMode === 'area' && (
                  <>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Area"
                        value={area}
                        onChangeText={setArea}
                        placeholder="e.g. 12"
                        keyboardType="numeric"
                      />
                    </View>
                  </>
                )}
              </View>

              {calcMode === 'size' && (
                <View style={styles.calcPreviewRow}>
                  <Text style={styles.calcPreviewLabel}>Calculated Area:</Text>
                  <Text style={styles.calcPreviewVal}>
                    {area ? `${area} sq units` : '--'}
                  </Text>
                </View>
              )}

              {calcMode !== 'simple' && calcMode !== 'weight' && (
                <View style={styles.calcPreviewRow}>
                  <Text style={styles.calcPreviewLabel}>Total Effective Qty:</Text>
                  <Text style={styles.calcPreviewVal}>
                    {calcQty().toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                  </Text>
                </View>
              )}

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Rate / Price per Unit (₹)"
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

              <View style={styles.calcTotalBox}>
                <Text style={styles.calcTotalLabel}>Line Total</Text>
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
    overflow: 'hidden',
  },
  productRowImage: {
    width: 40,
    height: 40,
    resizeMode: 'cover',
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
  // Autocomplete
  suggestionsBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    marginTop: 4,
    overflow: 'hidden',
    ...Shadow.md,
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  suggestionAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.accent + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  suggestionAvatarText: { fontSize: 14, fontWeight: '700', color: Colors.accent },
  suggestionName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  suggestionDetail: { fontSize: 12, color: Colors.textSecondary },
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
    color: Colors.accent,
    marginBottom: 16,
  },
  calcModeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
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
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calcModeTabChipActive: {
    backgroundColor: Colors.accent + '15',
    borderColor: Colors.accent,
  },
  calcModeTabChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  calcModeTabChipTextActive: {
    color: Colors.accent,
    fontWeight: '700',
  },
  calcPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceAlt,
    padding: 10,
    borderRadius: Radius.md,
    marginBottom: 14,
  },
  calcPreviewLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  calcPreviewVal: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  calcTotalBox: {
    backgroundColor: Colors.accent + '08',
    padding: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: Colors.accent + '15',
  },
  calcTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  calcTotalVal: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.accent,
  },
  lineItemDimensions: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  lineItemDiscount: {
    fontSize: 11,
    color: Colors.statusAccepted,
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
    backgroundColor: Colors.surface,
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
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  modalInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.textPrimary,
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
    backgroundColor: Colors.surfaceAlt,
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalCreateBtn: {
    backgroundColor: Colors.primary,
  },
  modalCreateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
