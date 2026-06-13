import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize } from '@theme/index';

interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

export function SummaryCard({ label, value, sub, accent }: SummaryCardProps) {
  return (
    <View style={[styles.card, accent && styles.cardAccent]}>
      <Text style={[styles.label, accent && styles.labelAccent]}>{label}</Text>
      <Text style={[styles.value, accent && styles.valueAccent]}>{value}</Text>
      {sub ? <Text style={[styles.sub, accent && styles.subAccent]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardAccent: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.xs },
  labelAccent: { color: 'rgba(255,255,255,0.7)' },
  value: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  valueAccent: { color: colors.textOnPrimary },
  sub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  subAccent: { color: 'rgba(255,255,255,0.6)' },
});
