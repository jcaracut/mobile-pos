import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, fontSize } from '@theme/index';
import type { ProductWithStock } from '../../types';

interface LowStockBannerProps {
  outOfStock: ProductWithStock[];
  lowStock: ProductWithStock[];
  onSeeAll?: () => void;
}

export function LowStockBanner({ outOfStock, lowStock, onSeeAll }: LowStockBannerProps) {
  const total = outOfStock.length + lowStock.length;
  if (total === 0) return null;

  return (
    <TouchableOpacity style={styles.banner} onPress={onSeeAll} activeOpacity={0.8}>
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>⚠️</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>
          {outOfStock.length > 0 ? `${outOfStock.length} out of stock` : ''}
          {outOfStock.length > 0 && lowStock.length > 0 ? '  •  ' : ''}
          {lowStock.length > 0 ? `${lowStock.length} running low` : ''}
        </Text>
        <Text style={styles.subtitle}>Tap to review inventory</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  iconBox: { marginRight: spacing.sm },
  iconText: { fontSize: 20 },
  content: { flex: 1 },
  title: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  subtitle: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.textMuted },
});
