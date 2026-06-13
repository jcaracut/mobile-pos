import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize } from '@theme/index';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: '#E8F5E9', text: colors.success },
  warning: { bg: '#FFF3E0', text: colors.warning },
  danger: { bg: '#FFEBEE', text: colors.danger },
  info: { bg: '#E3F2FD', text: colors.info },
  default: { bg: colors.surfaceAlt, text: colors.textSecondary },
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const style = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
