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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { Button } from '../../components/ui/Button';
import { Colors, Radius, Shadow } from '../../theme';
import { Product } from '../../types';

type RouteParams = { product?: Product };

const UNITS = ['piece', 'kg', 'litre', 'meter', 'box', 'hour', 'day', 'month'];

const BarcodeGraphic: React.FC<{ value: string }> = ({ value }) => {
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
              { width: w, backgroundColor: Colors.textPrimary, marginRight: index % 2 === 0 ? 2 : 1 },
            ]}
          />
        ))}
      </View>
      <Text style={styles.barcodeText}>{value}</Text>
    </View>
  );
};

export const ProductFormScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const existing = route.params?.product;

  const { create: createProduct, update: updateProduct } = useProducts();
  const { categories, fetch: fetchCategories, create: createCategory } = useCategories();

  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [unitPrice, setUnitPrice] = useState(existing?.unit_price?.toString() || '');
  const [costPrice, setCostPrice] = useState(existing?.cost_price?.toString() || '');
  const [stockQuantity, setStockQuantity] = useState(existing?.stock_quantity?.toString() || '');
  const [unit, setUnit] = useState(existing?.unit || 'piece');
  const [category, setCategory] = useState(existing?.category || '');
  const [sku, setSku] = useState(existing?.sku || '');
  const [barcode, setBarcode] = useState(existing?.barcode || '');
  const [warehouseLocation, setWarehouseLocation] = useState(existing?.warehouse_location || '');
  const [loading, setLoading] = useState(false);

  const isEdit = !!existing;

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Product name is required'); return; }
    
    const price = parseFloat(unitPrice);
    if (!unitPrice || isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Enter a valid unit price');
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

    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        unit_price: price,
        cost_price: cPrice,
        stock_quantity: stock,
        unit,
        category,
        sku: sku.trim(),
        barcode: barcode.trim(),
        warehouse_location: warehouseLocation.trim(),
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
    Alert.prompt(
      'New Category',
      'Enter the name of the new category:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Add',
          onPress: async (catName?: string) => {
            if (!catName || !catName.trim()) return;
            try {
              const newCat = await createCategory({
                name: catName.trim(),
                is_active: true,
              });
              if (newCat) {
                setCategory(newCat.name);
                Alert.alert('Success', `Category "${newCat.name}" added`);
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to add category');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Product' : 'Add Product'}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Icon preview */}
        <View style={styles.iconSection}>
          <View style={styles.productIconCircle}>
            <Ionicons name="cube" size={40} color={Colors.accent} />
          </View>
          {name ? <Text style={styles.productNamePreview}>{name}</Text> : null}
          {unitPrice ? (
            <Text style={styles.pricePreview}>
              ₹{parseFloat(unitPrice || '0').toLocaleString('en-IN')} / {unit}
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
                <TouchableOpacity
                  onPress={() => {
                    const rnd = '890' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
                    setBarcode(rnd);
                  }}
                  style={styles.genLink}
                >
                  <Ionicons name="git-branch-outline" size={14} color={Colors.accent} />
                  <Text style={styles.genLinkText}>Auto-Generate</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={fieldStyles.input}
                value={barcode}
                onChangeText={setBarcode}
                placeholder="e.g. 8901030752834"
                placeholderTextColor={Colors.textMuted}
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
                  <Ionicons name="add" size={14} color={Colors.accent} />
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
                          onPress={() => setCategory(isSelected ? '' : cat.name)}
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

            <View style={fieldStyles.wrap}>
              <Text style={fieldStyles.label}>Description</Text>
              <TextInput
                style={[fieldStyles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Brief description..."
                placeholderTextColor={Colors.textMuted}
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
                  label="Unit Price (₹) *"
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

            <Text style={fieldStyles.label}>Unit</Text>
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

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    fontSize: 12, fontWeight: '700', color: Colors.textSecondary,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 12, paddingHorizontal: 20,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  iconSection: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  productIconCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: Colors.accent + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  productNamePreview: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  pricePreview: { fontSize: 16, color: Colors.accent, fontWeight: '600' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  
  // Units
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  unitChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1, borderColor: Colors.border,
  },
  unitChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unitText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  unitTextActive: { color: '#fff' },

  // Categories
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  addCategoryLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  addCategoryLinkText: { fontSize: 12, fontWeight: '700', color: Colors.accent },
  categoryContainer: { marginTop: 4 },
  categoryChipsScroll: { gap: 8 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.accent + '18',
    borderColor: Colors.accent,
  },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  categoryChipTextActive: { color: Colors.accent },
  noCategoriesText: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },

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
    color: Colors.accent,
  },
  barcodeGraphicWrap: {
    backgroundColor: Colors.surfaceAlt,
    padding: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.textSecondary,
    letterSpacing: 3,
  },
});
