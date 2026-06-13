import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { centsToPHP } from '@shared/utils/formatMoney';
import { colors, spacing, radius, fontSize } from '@theme/index';
import type { CartItem } from '../../types';

interface CartItemRowProps {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

export function CartItemRow({ item, onIncrement, onDecrement, onRemove }: CartItemRowProps) {
  const lineTotal = item.product.price * item.quantity - item.discountAmount;

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.product.name}</Text>
        <Text style={styles.price}>{centsToPHP(item.product.price)} each</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.btn} onPress={onDecrement}>
          <Text style={styles.btnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qty}>{item.quantity}</Text>
        <TouchableOpacity style={styles.btn} onPress={onIncrement}>
          <Text style={styles.btnText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.right}>
        <Text style={styles.total}>{centsToPHP(lineTotal)}</Text>
        <TouchableOpacity onPress={onRemove}>
          <Text style={styles.remove}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  info: { flex: 1 },
  name: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  price: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  btn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textPrimary },
  qty: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, minWidth: 24, textAlign: 'center' },
  right: { alignItems: 'flex-end', gap: 4 },
  total: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  remove: { fontSize: fontSize.xs, color: colors.textMuted, padding: 4 },
});
