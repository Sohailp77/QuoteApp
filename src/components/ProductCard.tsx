import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { Colors, Radius, Shadow } from '../theme';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onDelete: () => void;
}

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress, onDelete }) => {
  const isOutOfStock = product.stock_quantity !== undefined && product.stock_quantity === 0;
  const isLowStock = product.stock_quantity !== undefined && product.stock_quantity > 0 && product.stock_quantity <= 5;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <Ionicons name="cube-outline" size={24} color={Colors.accent} />
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
                color={isOutOfStock ? Colors.statusRejected : isLowStock ? Colors.statusExpired : Colors.textMuted} 
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
          <Text style={styles.price}>{formatCurrency(product.unit_price)}</Text>
          {product.cost_price !== undefined ? (
            <Text style={styles.costPrice}>Cost: {formatCurrency(product.cost_price)}</Text>
          ) : null}
          
          <TouchableOpacity 
            onPress={onDelete} 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.statusRejected} />
          </TouchableOpacity>
        </View>
      </View>

      {product.sku ? (
        <Text style={styles.sku}>SKU: {product.sku}</Text>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.accent + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  desc: { fontSize: 12, color: Colors.textSecondary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  catText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  unit: { fontSize: 11, color: Colors.textMuted },
  
  // Stock styles
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  stockText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  stockOut: { color: Colors.statusRejected },
  stockLow: { color: Colors.statusExpired },

  rightSide: { alignItems: 'flex-end', gap: 6 },
  price: { fontSize: 17, fontWeight: '700', color: Colors.primary },
  costPrice: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  deleteBtn: { marginTop: 4 },
  sku: { fontSize: 11, color: Colors.textMuted, marginTop: 8 },
});
