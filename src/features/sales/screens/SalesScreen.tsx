import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSalesDashboard } from '../hooks/useSalesDashboard';
import { useTopSellers } from '../hooks/useTopSellers';
import { SummaryCard } from '../components/organisms/SummaryCard';
import { TopSellersList } from '../components/organisms/TopSellersList';
import { centsToPHP } from '@shared/utils/formatMoney';
import { monthBounds } from '@shared/utils/formatDate';
import { colors, spacing, radius, fontSize } from '@theme/index';
import type { AnalyticsPeriod } from '../types';

const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'This Week' },
  { key: 'monthly', label: 'This Month' },
];

export function SalesScreen() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('daily');
  const { dashboard, isLoading, error } = useSalesDashboard(period);
  const now = new Date();
  const { topSellers } = useTopSellers(monthBounds(now), 5);

  if (isLoading && !dashboard) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const d = dashboard;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Sales Analytics</Text>

        {/* Period picker */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPI cards */}
        <View style={styles.cardRow}>
          <SummaryCard
            label="Revenue"
            value={d ? centsToPHP(d.totalRevenueCents) : '—'}
            sub={
              d?.revenueGrowthPct != null
                ? `${d.revenueGrowthPct >= 0 ? '+' : ''}${d.revenueGrowthPct.toFixed(1)}% vs prior`
                : undefined
            }
            accent
          />
          <SummaryCard
            label="Orders"
            value={d ? String(d.totalOrderCount) : '—'}
            sub={d ? `Avg ${centsToPHP(d.averageOrderValueCents)}` : undefined}
          />
        </View>

        <View style={styles.cardRow}>
          <SummaryCard
            label="Gross Profit"
            value={d ? centsToPHP(d.totalGrossProfitCents) : '—'}
            sub={d ? `${d.grossMarginPct.toFixed(1)}% margin` : undefined}
          />
          <SummaryCard
            label="Avg Order"
            value={d ? centsToPHP(d.averageOrderValueCents) : '—'}
          />
        </View>

        {/* Sparkline placeholder — replace with a chart library */}
        {d && d.periods.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {period === 'daily' ? 'Last 7 Days' : period === 'weekly' ? 'Last 8 Weeks' : 'Last 12 Months'}
            </Text>
            <View style={styles.sparkRow}>
              {d.periods.map((p, i) => {
                const maxRevenue = Math.max(...d.periods.map((x) => x.revenueCents), 1);
                const height = Math.max(4, (p.revenueCents / maxRevenue) * 80);
                return (
                  <View key={i} style={styles.sparkCol}>
                    <View style={[styles.sparkBar, { height }]} />
                    <Text style={styles.sparkLabel} numberOfLines={1}>
                      {p.label.split(' ')[0]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Top sellers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Sellers — This Month</Text>
          <TopSellersList sellers={topSellers} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  periodRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  periodBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: 'center' },
  periodBtnActive: { backgroundColor: colors.primary },
  periodText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  periodTextActive: { color: colors.textOnPrimary },
  cardRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  section: { marginTop: spacing.lg },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  sparkRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 100, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.border },
  sparkCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  sparkBar: { width: '80%', backgroundColor: colors.primary, borderRadius: 3 },
  sparkLabel: { fontSize: 9, color: colors.textMuted, marginTop: 3 },
  errorText: { color: colors.danger, fontSize: fontSize.md },
});
