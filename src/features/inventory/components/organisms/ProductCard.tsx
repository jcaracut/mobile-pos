import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { colors, spacing, radius, fontSize } from '@theme/index';
import { centsToPHP } from '@shared/utils/formatMoney';
import type { ProductRow } from '../../types';

interface ProductCardProps {
  data: ProductRow;
  onEdit?: () => void;
  onToggleAvailable?: (next: boolean) => void;
}

export function ProductCard({ data, onEdit, onToggleAvailable }: ProductCardProps) {
  const { product, categoryName } = data;
  const available = product.isActive;

  return (
    <View style={[styles.card, !available && styles.cardUnavailable]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, !available && styles.nameMuted]} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={styles.price}>{centsToPHP(product.price)}</Text>
        </View>
        {categoryName !== null ? <Text style={styles.category}>{categoryName}</Text> : null}
        {product.description !== null && product.description.length > 0 ? (
          <Text style={styles.description} numberOfLines={2}>{product.description}</Text>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.availRow}>
          <Switch
            value={available}
            onValueChange={(v) => onToggleAvailable?.(v)}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.surface}
          />
          <Text style={[styles.availLabel, available ? styles.availOn : styles.availOff]}>
            {available ? 'Available' : 'Unavailable'}
          </Text>
        </View>
        {onEdit !== undefined && (
          <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.7}>
            <Text style={styles.editBtnText}>✏️ Edit</Text>
          </TouchableOpacity>
        )}
      </View>
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
  cardUnavailable: { opacity: 0.6 },
  header: { marginBottom: spacing.sm },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: 2,
  },
  name: { flex: 1, fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  nameMuted: { color: colors.textMuted },
  price: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  category: { fontSize: fontSize.xs, color: colors.primary, marginTop: 2 },
  description: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 4 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  availLabel: { fontSize: fontSize.sm, fontWeight: '600' },
  availOn: { color: colors.primary },
  availOff: { color: colors.textMuted },

  editBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  editBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textOnPrimary },
});
