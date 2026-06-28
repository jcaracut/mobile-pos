import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors, spacing, radius, fontSize } from '@theme/index';

type ActionButtonVariant = 'primary' | 'surface';

export interface ActionButtonProps {
  icon: string;
  label: string;
  description?: string;
  variant?: ActionButtonVariant;
  disabled?: boolean;
  onPress: () => void;
}

export function ActionButton({
  icon,
  label,
  description,
  variant = 'surface',
  disabled = false,
  onPress,
}: ActionButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      style={[styles.button, isPrimary ? styles.primary : styles.surface, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.labels}>
        <Text style={[styles.label, isPrimary && styles.labelOnPrimary]}>{label}</Text>
        {description !== undefined && (
          <Text style={[styles.description, isPrimary && styles.descriptionOnPrimary]}>{description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  surface: { backgroundColor: colors.surface, borderColor: colors.border },
  disabled: { opacity: 0.5 },

  icon: { fontSize: 22, marginRight: spacing.md },
  labels: { flex: 1 },
  label: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  labelOnPrimary: { color: colors.textOnPrimary },
  description: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  descriptionOnPrimary: { color: colors.secondary },
});
