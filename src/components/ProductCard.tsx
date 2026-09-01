import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { Radius, Shadow } from '../theme';
import { useAppTheme } from '../context/ThemeContext';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onDelete: () => void;
}

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress, onDelete }) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const isOutOfStock = product.stock_quantity !== undefined && product.stock_quantity === 0;
  const isLowStock = product.stock_quantity !== undefined && product.stock_quantity > 0 && product.stock_quantity <= 5;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <Ionicons name="cube-outline" size={24} color={colors.primary} />
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{product.name}</Text>
          {product.description ? (
            <Text style={styles.desc} numberOfLines={1}>{product.description}</Text>
          ) : null}
          
          <View style={styles.meta}>
            {product.category ? (
              <View style={styles.catBadge}>
                <Text style={styles.catText}>{product.category}</Text>
              </View>
            ) : null}
            <Text style={styles.unit}>per {product.unit || 'unit'}</Text>
          </View>

          {/* Stock display */}
          {product.stock_quantity !== undefined ? (
            <View style={styles.stockRow}>
              <Ionicons 
                name={isOutOfStock ? "alert-circle-outline" : "ellipse"} 
                size={isOutOfStock ? 14 : 8} 
                color={isOutOfStock ? colors.statusRejected : isLowStock ? colors.statusExpired : colors.textMuted} 
              />
              <Text style={[
                styles.stockText, 
                isOutOfStock && styles.stockOut, 
                isLowStock && styles.stockLow
              ]}>
                {isOutOfStock ? 'Out of stock' : isLowStock ? `Low Stock: ${product.stock_quantity} ${product.unit}s` : `Stock: ${product.stock_quantity} ${product.unit}s`}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.rightSide}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Sale</Text>
            <Text style={styles.price}>{formatCurrency(product.unit_price)}</Text>
          </View>
          {product.cost_price !== undefined ? (
            <View style={styles.priceRow}>
              <Text style={styles.costLabel}>Cost</Text>
              <Text style={styles.costPrice}>{formatCurrency(product.cost_price)}</Text>
            </View>
          ) : null}
          
          <TouchableOpacity 
            onPress={onDelete} 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={16} color={colors.statusRejected} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardFooter}>
        {product.sku ? (
          <Text style={styles.sku}>SKU: {product.sku}</Text>
        ) : null}
        {product.barcode ? (
          <View style={styles.footerField}>
            <Ionicons name="barcode-outline" size={12} color={colors.textMuted} />
            <Text style={styles.sku}>{product.barcode}</Text>
          </View>
        ) : null}
        {product.warehouse_location ? (
          <View style={styles.footerField}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={styles.sku}>{product.warehouse_location}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
    ...Shadow.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  desc: { fontSize: 12, color: colors.textSecondary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  catText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  unit: { fontSize: 11, color: colors.textMuted },
  
  // Stock styles
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  stockText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  stockOut: { color: colors.statusRejected },
  stockLow: { color: colors.statusExpired },

  rightSide: { alignItems: 'flex-end', gap: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  priceLabel: { fontSize: 10, fontWeight: '700', color: colors.primary + 'AA', textTransform: 'uppercase', letterSpacing: 0.3 },
  costLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  price: { fontSize: 16, fontWeight: '800', color: colors.primary },
  costPrice: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  deleteBtn: { marginTop: 4 },
  sku: { fontSize: 11, color: colors.textMuted },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 8,
  },
  footerField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
