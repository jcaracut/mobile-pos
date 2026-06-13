import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { centsToPHP } from '@shared/utils/formatMoney';
import { colors, spacing, radius, fontSize } from '@theme/index';
import type { TopSellingProduct } from '../../types';

interface TopSellersListProps {
  sellers: TopSellingProduct[];
}

export function TopSellersList({ sellers }: TopSellersListProps) {
  if (sellers.length === 0) {
    return <Text style={styles.empty}>No sales data yet.</Text>;
  }

  const maxRevenue = sellers[0]?.revenueCents ?? 1;

  return (
    <View style={styles.container}>
      {sellers.map((seller, i) => (
        <View key={seller.productId} style={styles.row}>
          <Text style={styles.rank}>#{i + 1}</Text>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{seller.productName}</Text>
            <View style={styles.barBg}>
              <View
                style={[
                  styles.barFill,
                  { width: `${(seller.revenueCents / maxRevenue) * 100}%` },
                ]}
              />
            </View>
          </View>
          <View style={styles.stats}>
            <Text style={styles.revenue}>{centsToPHP(seller.revenueCents)}</Text>
            <Text style={styles.units}>{seller.unitsSold} sold</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  empty: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center', padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rank: { width: 28, fontSize: fontSize.sm, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  info: { flex: 1 },
  name: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  barBg: { height: 6, backgroundColor: colors.surfaceAlt, borderRadius: radius.full, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  stats: { alignItems: 'flex-end' },
  revenue: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  units: { fontSize: fontSize.xs, color: colors.textMuted },
});
