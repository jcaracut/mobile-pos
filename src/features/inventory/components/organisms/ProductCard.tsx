import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Badge } from '@shared/components/ui/Badge';
import { colors, spacing, radius, fontSize } from '@theme/index';
import { centsToPHP } from '@shared/utils/formatMoney';
import { resolveStockStatus } from '../../types';
import type { ProductWithStock } from '../../types';

interface ProductCardProps {
  data: ProductWithStock;
  onEdit?: () => void;
  onAdjustStock?: () => void;
}

const STATUS_VARIANT = { in_stock: 'success', low_stock: 'warning', out_of_stock: 'danger' } as const;
const STATUS_LABEL = { in_stock: 'In Stock', low_stock: 'Low Stock', out_of_stock: 'Out of Stock' };

export function ProductCard({ data, onEdit, onAdjustStock }: ProductCardProps) {
  const { product, inventory, categoryName } = data;
  const status = resolveStockStatus(inventory);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
          <Badge label={STATUS_LABEL[status]} variant={STATUS_VARIANT[status]} />
        </View>
        <Text style={styles.sku}>SKU: {product.sku}</Text>
        {categoryName !== null ? <Text style={styles.category}>{categoryName}</Text> : null}
        {product.description !== null && product.description.length > 0 ? (
          <Text style={styles.description} numberOfLines={2}>{product.description}</Text>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={styles.metaLabel}>Price</Text>
          <Text style={styles.price}>{centsToPHP(product.price)}</Text>
        </View>
        <View style={styles.stockBox}>
          <Text style={styles.metaLabel}>Stock</Text>
          <Text style={[styles.stock, status === 'out_of_stock' && styles.stockDanger]}>
            {inventory?.quantity ?? '—'}
          </Text>
        </View>
        <View>
          <Text style={styles.metaLabel}>Margin</Text>
          <Text style={styles.margin}>{product.margin.toFixed(1)}%</Text>
        </View>
      </View>

      {(onEdit !== undefined || onAdjustStock !== undefined) && (
        <View style={styles.actions}>
          {onAdjustStock !== undefined && (
            <TouchableOpacity style={styles.actionBtn} onPress={onAdjustStock} activeOpacity={0.7}>
              <Text style={styles.actionBtnText}>📦 Adjust Stock</Text>
            </TouchableOpacity>
          )}
          {onEdit !== undefined && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnEdit]} onPress={onEdit} activeOpacity={0.7}>
              <Text style={[styles.actionBtnText, styles.actionBtnEditText]}>✏️ Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { marginBottom: spacing.sm },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: 2,
  },
  name: { flex: 1, fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  sku: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  category: { fontSize: fontSize.xs, color: colors.primary, marginTop: 2 },
  description: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 4 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  price: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  stockBox: { alignItems: 'center' },
  stock: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  stockDanger: { color: colors.danger },
  margin: { fontSize: fontSize.md, fontWeight: '700', color: colors.success },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnEdit: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  actionBtnEditText: { color: colors.textOnPrimary },
});
