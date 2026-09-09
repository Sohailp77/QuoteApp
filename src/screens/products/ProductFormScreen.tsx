import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { selectAndUploadImage } from '../../utils/upload';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { useVendors } from '../../hooks/useVendors';
import { Button } from '../../components/ui/Button';
import { BarcodeScannerModal } from '../../components/BarcodeScannerModal';
import { Radius, Shadow } from '../../theme';
import { Product, CalcMethod, RoundingMode } from '../../types';
import { animateLayout } from '../../utils/animation';
import { useAppTheme } from '../../context/ThemeContext';
import { getProductCalcConfig, calculateQuantity } from '../../utils/quantityCalculator';

type RouteParams = { product?: Product };

const UNITS = ['piece', 'box', 'roll', 'bag', 'kg', 'litre', 'meter', 'container', 'packet'];

const CALC_METHODS: { key: CalcMethod; label: string; defaultInputUnit: string; icon: string }[] = [
  { key: 'direct', label: 'Direct Quantity', defaultInputUnit: '', icon: 'hand-right-outline' },
  { key: 'area', label: 'Area (SQFT/SQM)', defaultInputUnit: 'SQFT', icon: 'grid-outline' },
  { key: 'length', label: 'Length (Meter/Ft)', defaultInputUnit: 'METER', icon: 'resize-outline' },
  { key: 'weight', label: 'Weight (KG/Ton)', defaultInputUnit: 'KG', icon: 'scale-outline' },
  { key: 'volume', label: 'Volume (Liter)', defaultInputUnit: 'LITER', icon: 'beaker-outline' },
  { key: 'custom', label: 'Custom Conversion', defaultInputUnit: 'Unit', icon: 'calculator-outline' },
];

const ROUNDING_MODES: { key: RoundingMode; label: string; desc: string }[] = [
  { key: 'round_up', label: 'Round Up', desc: 'Always round up (e.g. 6.2 → 7)' },
  { key: 'allow_decimals', label: 'Allow Decimals', desc: 'Keep exact decimals (e.g. 2.5)' },
  { key: 'round_nearest', label: 'Nearest Whole', desc: 'Standard rounding (e.g. 6.6 → 7)' },
  { key: 'round_down', label: 'Round Down', desc: 'Round down (e.g. 6.9 → 6)' },
];

const BarcodeGraphic: React.FC<{ value: string }> = ({ value }) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  if (!value) return null;
  // Generate pseudo-widths based on characters in value
  const barWidths = Array.from(value).map((char) => {
    const val = char.charCodeAt(0) % 4;
    return val === 0 ? 1 : val === 1 ? 2 : val === 2 ? 3 : 4;
  });

  return (
    <View style={styles.barcodeGraphicWrap}>
      <View style={styles.barcodeLines}>
        {barWidths.map((w, index) => (
          <View
            key={index}
            style={[
              styles.barcodeBar,
              { width: w, backgroundColor: colors.textPrimary, marginRight: index % 2 === 0 ? 2 : 1 },
            ]}
          />
        ))}
      </View>
      <Text style={styles.barcodeText}>{value}</Text>
    </View>
  );
};

export const ProductFormScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets);
  const fieldStyles = createFieldStyles(colors);
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const existing: Product | undefined = route.params?.product;

  const { create: createProduct, update: updateProduct, findByBarcode } = useProducts();
  const { categories, fetch: fetchCategories, create: createCategory } = useCategories();
  const { vendors, fetch: fetchVendors } = useVendors();

  const initialCalcConfig = existing ? getProductCalcConfig(existing) : {
    calc_method: 'direct' as CalcMethod,
    input_unit: '',
    unit_coverage: 1,
    rounding_mode: 'round_up' as RoundingMode,
    selling_unit: 'piece',
  };

  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [unitPrice, setUnitPrice] = useState(existing?.unit_price?.toString() || '');
  const [costPrice, setCostPrice] = useState(existing?.cost_price?.toString() || '');
  const [stockQuantity, setStockQuantity] = useState(existing?.stock_quantity?.toString() || '');
  const [unit, setUnit] = useState(existing?.unit || 'piece');
  const [category, setCategory] = useState(existing?.category || '');
  const [calcMethod, setCalcMethod] = useState<CalcMethod>(initialCalcConfig.calc_method);
  const [inputUnit, setInputUnit] = useState(initialCalcConfig.input_unit);
  const [unitCoverage, setUnitCoverage] = useState(initialCalcConfig.unit_coverage ? initialCalcConfig.unit_coverage.toString() : '1');
  const [roundingMode, setRoundingMode] = useState<RoundingMode>(initialCalcConfig.rounding_mode);
  const [sku, setSku] = useState(existing?.sku || '');
  const [barcode, setBarcode] = useState(existing?.barcode || '');
  const [warehouseLocation, setWarehouseLocation] = useState(existing?.warehouse_location || '');
  const [productImage, setProductImage] = useState(existing?.image_url || '');
  const [vendorId, setVendorId] = useState<string | undefined>(existing?.vendor_id || undefined);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);

  // Category modal states
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleSelectCategory = (catName: string) => {
    animateLayout();
    if (category === catName) {
      setCategory('');
    } else {
      setCategory(catName);
    }
  };
  const [categoryAdding, setCategoryAdding] = useState(false);

  const isEdit = !!existing;

  const handleBarcodeScan = async (scannedCode: string) => {
    setShowBarcodeScanner(false);
    // Check for duplicate
    const duplicate = await findByBarcode(scannedCode);
    if (duplicate && duplicate.id !== existing?.id) {
      Alert.alert(
        'Barcode Already Exists',
        `Product "${duplicate.name}" already uses barcode ${scannedCode}. Cannot assign the same barcode to another product.`,
        [{ text: 'OK' }]
      );
      return;
    }
    setBarcode(scannedCode);
    if (!sku) setSku(scannedCode);
    Alert.alert('Barcode Scanned', `Barcode ${scannedCode} applied.`);
  };

  useEffect(() => {
    fetchCategories();
    fetchVendors();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Product name is required'); return; }
    
    const price = parseFloat(unitPrice);
    if (!unitPrice || isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Enter a valid MRP');
      return;
    }

    const cPrice = costPrice.trim() ? parseFloat(costPrice) : undefined;
    if (costPrice.trim() && (isNaN(cPrice as number) || (cPrice as number) < 0)) {
      Alert.alert('Error', 'Enter a valid cost price');
      return;
    }

    const stock = stockQuantity.trim() ? parseInt(stockQuantity, 10) : undefined;
    if (stockQuantity.trim() && (isNaN(stock as number) || (stock as number) < 0)) {
      Alert.alert('Error', 'Enter a valid stock quantity');
      return;
    }

    const coverageVal = parseFloat(unitCoverage);
    if (calcMethod !== 'direct' && (isNaN(coverageVal) || coverageVal <= 0)) {
      Alert.alert('Error', 'Enter a valid unit coverage factor');
      return;
    }

    setLoading(true);
    try {
      const selectedMethodDef = CALC_METHODS.find((m) => m.key === calcMethod);
      const defaultUnit = selectedMethodDef?.defaultInputUnit || 'SQFT';
      const finalInputUnit = calcMethod === 'direct' ? '' : (inputUnit.trim() || defaultUnit);

      const data = {
        name: name.trim(),
        description: description.trim(),
        unit_price: price,
        cost_price: cPrice,
        stock_quantity: stock,
        unit: unit.trim() || 'piece',
        category,
        sku: sku.trim(),
        barcode: barcode.trim(),
        warehouse_location: warehouseLocation.trim(),
        calc_method: calcMethod,
        input_unit: finalInputUnit,
        unit_coverage: calcMethod === 'direct' ? 1 : (coverageVal || 1),
        rounding_mode: roundingMode,
        image_url: productImage,
        vendor_id: vendorId || undefined,
      };

      if (isEdit) {
        await updateProduct(existing.id, data);
        Alert.alert('Updated', 'Product updated successfully', [
          { text: 'OK', onPress: () => nav.goBack() },
        ]);
      } else {
        await createProduct(data);
        Alert.alert('Added', 'Product added successfully', [
          { text: 'OK', onPress: () => nav.goBack() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewCategory = () => {
    setNewCategoryName('');
    setCategoryModalVisible(true);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name.');
      return;
    }
    setCategoryAdding(true);
    try {
      const newCat = await createCategory({
        name: newCategoryName.trim(),
        is_active: true,
      });
      if (newCat) {
        setCategory(newCat.name);
        setCategoryModalVisible(false);
        Alert.alert('Success', `Category "${newCat.name}" added`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add category');
    } finally {
      setCategoryAdding(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Product' : 'Add Product'}</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
        {/* Icon preview */}
        <View style={styles.iconSection}>
          <View style={styles.imageSectionContainer}>
            {productImage ? (
              <View style={styles.imageWrapper}>
                <Image source={{ uri: productImage }} style={styles.imagePreview} />
                <TouchableOpacity 
                  style={styles.removeImageBtn} 
                  onPress={() => setProductImage('')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.imagePlaceholder, uploadingImage && { opacity: 0.6 }]} 
                onPress={async () => {
                  setUploadingImage(true);
                  const url = await selectAndUploadImage();
                  setUploadingImage(false);
                  if (url) setProductImage(url);
                }}
                disabled={uploadingImage}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
                <Text style={styles.imagePlaceholderText}>
                  {uploadingImage ? 'Uploading...' : 'Add Product Image'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {name ? <Text style={styles.productNamePreview}>{name}</Text> : null}
          {unitPrice ? (
            <Text style={styles.pricePreview}>
              MRP: ₹{parseFloat(unitPrice || '0').toLocaleString('en-IN')} / {unit}
            </Text>
          ) : null}
        </View>

        {/* Product Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Info</Text>
          <View style={styles.card}>
            <Field label="Product Name *" value={name} onChangeText={setName} placeholder="e.g. Web Design Package" />
            <Field label="SKU / Code" value={sku} onChangeText={setSku} placeholder="PROD-001" />

            <View style={fieldStyles.wrap}>
              <View style={styles.fieldHeader}>
                <Text style={fieldStyles.label}>Barcode</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setShowBarcodeScanner(true)}
                    style={styles.genLink}
                  >
                    <Ionicons name="barcode-outline" size={14} color={colors.primary} />
                    <Text style={styles.genLinkText}>Scan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const rnd = '890' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
                      setBarcode(rnd);
                    }}
                    style={styles.genLink}
                  >
                    <Ionicons name="git-branch-outline" size={14} color={colors.primary} />
                    <Text style={styles.genLinkText}>Auto-Generate</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={fieldStyles.input}
                value={barcode}
                onChangeText={setBarcode}
                placeholder="e.g. 8901030752834"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>

            {barcode ? <BarcodeGraphic value={barcode} /> : null}

            <Field
              label="Warehouse Location"
              value={warehouseLocation}
              onChangeText={setWarehouseLocation}
              placeholder="e.g. Aisle 3, Shelf B"
            />
            
            {/* Category selection */}
            <View style={fieldStyles.wrap}>
              <View style={styles.categoryHeader}>
                <Text style={fieldStyles.label}>Category</Text>
                <TouchableOpacity onPress={handleAddNewCategory} style={styles.addCategoryLink}>
                  <Ionicons name="add" size={14} color={colors.primary} />
                  <Text style={styles.addCategoryLinkText}>New Category</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.categoryContainer}>
                {categories.length === 0 ? (
                  <Text style={styles.noCategoriesText}>No custom categories yet. Tap "New Category" to create one.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipsScroll}>
                    {categories.map((cat) => {
                      const isSelected = category === cat.name;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                          onPress={() => handleSelectCategory(cat.name)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            </View>

            {/* Vendor / Supplier selection */}
            <View style={fieldStyles.wrap}>
              <Text style={fieldStyles.label}>Vendor / Supplier</Text>
              <TouchableOpacity
                style={[fieldStyles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => setShowVendorModal(true)}
                activeOpacity={0.8}
              >
                <Text style={{ color: vendorId ? colors.textPrimary : colors.textMuted, fontSize: 15 }}>
                  {vendorId ? (vendors.find(v => v.id === vendorId)?.name || 'Unknown Vendor') : 'Select a vendor (optional)'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Vendor picker modal */}
            <Modal visible={showVendorModal} animationType="slide" presentationStyle="pageSheet">
              <View style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, flex: 1 }}>Select Vendor</Text>
                  <TouchableOpacity onPress={() => setShowVendorModal(false)}>
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ padding: 16 }}>
                  <TouchableOpacity
                    style={{ padding: 14, borderRadius: 10, marginBottom: 8, backgroundColor: !vendorId ? colors.primary + '20' : colors.surface, borderWidth: 1.5, borderColor: !vendorId ? colors.primary : colors.border }}
                    onPress={() => { setVendorId(undefined); setShowVendorModal(false); }}
                  >
                    <Text style={{ color: !vendorId ? colors.primary : colors.textSecondary, fontWeight: '600' }}>No Vendor</Text>
                  </TouchableOpacity>
                  {vendors.filter(v => v.is_active).map(v => (
                    <TouchableOpacity
                      key={v.id}
                      style={{ padding: 14, borderRadius: 10, marginBottom: 8, backgroundColor: vendorId === v.id ? colors.primary + '20' : colors.surface, borderWidth: 1.5, borderColor: vendorId === v.id ? colors.primary : colors.border }}
                      onPress={() => { setVendorId(v.id); setShowVendorModal(false); }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>{v.name}</Text>
                      {v.contact_person ? <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{v.contact_person}</Text> : null}
                      {v.phone ? <Text style={{ fontSize: 12, color: colors.textMuted }}>{v.phone}</Text> : null}
                    </TouchableOpacity>
                  ))}
                  {vendors.length === 0 && (
                    <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 40 }}>No vendors yet. Add vendors in the Vendors section.</Text>
                  )}
                </ScrollView>
              </View>
            </Modal>

            <View style={fieldStyles.wrap}>
              <Text style={fieldStyles.label}>Description</Text>
              <TextInput
                style={[fieldStyles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Brief description..."
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </View>
          </View>
        </View>

        {/* Pricing & Stock */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing & Stock</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="MRP (₹) *"
                  value={unitPrice}
                  onChangeText={setUnitPrice}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ width: 16 }} />
              <View style={{ flex: 1 }}>
                <Field
                  label="Cost Price (₹)"
                  value={costPrice}
                  onChangeText={setCostPrice}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Field
              label="Stock Quantity"
              value={stockQuantity}
              onChangeText={setStockQuantity}
              placeholder="0"
              keyboardType="number-pad"
            />

            <Text style={fieldStyles.label}>Selling / Stock Unit</Text>
            <View style={styles.unitGrid}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitChip, unit === u && styles.unitChipActive]}
                  onPress={() => setUnit(u)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[fieldStyles.label, { marginTop: 16 }]}>Quantity Calculation Method</Text>
            <View style={styles.calcGrid}>
              {CALC_METHODS.map((c) => {
                const isActive = calcMethod === c.key;
                return (
                  <TouchableOpacity
                    key={c.key}
                    style={[styles.calcChip, isActive && styles.calcChipActive]}
                    onPress={() => {
                      animateLayout();
                      setCalcMethod(c.key);
                      if (!inputUnit && c.defaultInputUnit) {
                        setInputUnit(c.defaultInputUnit);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={c.icon as any}
                      size={14}
                      color={isActive ? colors.primary : colors.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.calcText, isActive && styles.calcTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {calcMethod !== 'direct' && (
              <View style={styles.calcConfigWrap}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={fieldStyles.label}>Customer Input Unit</Text>
                    <TextInput
                      style={fieldStyles.input}
                      value={inputUnit}
                      onChangeText={setInputUnit}
                      placeholder={
                        calcMethod === 'area'
                          ? 'e.g. SQFT or SQM'
                          : calcMethod === 'length'
                          ? 'e.g. METER or FEET'
                          : calcMethod === 'weight'
                          ? 'e.g. KG or TON'
                          : calcMethod === 'volume'
                          ? 'e.g. LITER'
                          : 'e.g. Unit'
                      }
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={{ width: 16 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={fieldStyles.label}>Coverage / 1 {unit || 'Unit'}</Text>
                    <TextInput
                      style={fieldStyles.input}
                      value={unitCoverage}
                      onChangeText={setUnitCoverage}
                      placeholder="15"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                <Text style={styles.helperSubtext}>
                  1 {unit || 'Selling Unit'} covers {unitCoverage || '1'} {inputUnit || 'Input Unit'}s.
                </Text>

                <Text style={[fieldStyles.label, { marginTop: 14 }]}>Rounding Strategy for Quote</Text>
                <View style={styles.roundingGrid}>
                  {ROUNDING_MODES.map((r) => {
                    const isSelected = roundingMode === r.key;
                    return (
                      <TouchableOpacity
                        key={r.key}
                        style={[styles.roundingChip, isSelected && styles.roundingChipActive]}
                        onPress={() => {
                          animateLayout();
                          setRoundingMode(r.key);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={14}
                          color={isSelected ? colors.primary : colors.textMuted}
                          style={{ marginRight: 6 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.roundingTitle, isSelected && styles.roundingTitleActive]}>
                            {r.label}
                          </Text>
                          <Text style={styles.roundingDesc}>{r.desc}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Calculation Live Preview Card */}
                {(() => {
                  const sampleInputVal = 100;
                  const sampleRes = calculateQuantity({
                    calc_method: calcMethod,
                    input_qty: sampleInputVal,
                    unit_coverage: parseFloat(unitCoverage) || 1,
                    rounding_mode: roundingMode,
                    input_unit: inputUnit || 'SQFT',
                    selling_unit: unit || 'BOX',
                  });
                  return (
                    <View style={styles.previewBox}>
                      <View style={styles.previewHeader}>
                        <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                        <Text style={styles.previewTitle}>Live Calculation Preview</Text>
                      </View>
                      <Text style={styles.previewText}>
                        Customer inputs requirement: <Text style={{ fontWeight: '700' }}>{sampleInputVal} {inputUnit || 'SQFT'}</Text>
                      </Text>
                      <Text style={styles.previewMath}>
                        Math: {sampleRes.formula_text}
                      </Text>
                      <Text style={styles.previewResult}>
                        Quoted Quantity: <Text style={{ color: colors.primary, fontWeight: '800' }}>{sampleRes.final_qty} {unit || 'BOX'}</Text>
                      </Text>
                    </View>
                  );
                })()}
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Button
            title={isEdit ? 'Save Changes' : 'Add Product'}
            onPress={handleSave}
            loading={loading}
            size="lg"
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BarcodeScannerModal
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={handleBarcodeScan}
        title="Scan Product Barcode"
      />

      {/* Custom Category Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Category</Text>
            
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Category Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="e.g. Hardware"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setCategoryModalVisible(false)}
                style={[styles.modalBtn, styles.modalCancelBtn]}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateCategory}
                style={[styles.modalBtn, styles.modalCreateBtn]}
                disabled={categoryAdding}
              >
                {categoryAdding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalCreateBtnText}>Add Category</Text>
                )}
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
              {isEdit ? 'Saving Product Changes...' : 'Adding Product...'}
            </Text>
            <Text style={styles.loadingOverlaySub}>
              Syncing product details, barcode & inventory settings
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

const createFieldStyles = (colors: any) => StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    fontSize: 12, fontWeight: '700', color: colors.textSecondary,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Math.max(insets?.top || 0, 24) + 12, paddingBottom: 12, paddingHorizontal: 20,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  iconSection: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  imageSectionContainer: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  imageWrapper: {
    width: 120,
    height: 120,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    ...Shadow.md,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.statusRejected,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.sm,
  },
  productNamePreview: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  pricePreview: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  card: { backgroundColor: colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  
  // Units
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  unitChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
  },
  unitChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  unitText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  unitTextActive: { color: '#fff' },

  // Categories
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  addCategoryLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  addCategoryLinkText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  categoryContainer: { marginTop: 4 },
  categoryChipsScroll: { gap: 8 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary,
  },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  categoryChipTextActive: { color: colors.primary },
  noCategoriesText: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },

  // Barcode visualization styles
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  genLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  genLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  barcodeGraphicWrap: {
    backgroundColor: colors.surfaceAlt,
    padding: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  barcodeLines: {
    flexDirection: 'row',
    height: 48,
    alignItems: 'stretch',
    marginBottom: 6,
  },
  barcodeBar: {
    height: '100%',
  },
  barcodeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 3,
  },
  
  // Custom Modal Styles
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
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
  calcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  calcChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calcChipActive: { backgroundColor: colors.primary + '15', borderColor: colors.primary },
  calcText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  calcTextActive: { color: colors.primary, fontWeight: '700' },

  calcConfigWrap: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  helperSubtext: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  roundingGrid: {
    gap: 8,
    marginTop: 6,
  },
  roundingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: Radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roundingChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '0D',
  },
  roundingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  roundingTitleActive: {
    color: colors.primary,
  },
  roundingDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Preview Box
  previewBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: Radius.md,
    backgroundColor: colors.primary + '0F',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  previewText: {
    fontSize: 12,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  previewMath: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  previewResult: {
    fontSize: 13,
    fontWeight: '600',
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
