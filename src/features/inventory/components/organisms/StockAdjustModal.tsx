import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { InventoryService } from '../../services/InventoryService';
import { colors, spacing, radius, fontSize } from '@theme/index';
import { centsToPHP } from '@shared/utils/formatMoney';
import type { ProductWithStock } from '../../types';
import type { StockAdjustmentReason } from '../../types';

interface StockAdjustModalProps {
  visible: boolean;
  onClose: () => void;
  data: ProductWithStock | null;
}

const REASONS: { key: StockAdjustmentReason; label: string; icon: string; positive: boolean }[] = [
  { key: 'restock', label: 'Restock', icon: '📦', positive: true },
  { key: 'return', label: 'Return', icon: '↩️', positive: true },
  { key: 'damage', label: 'Damage', icon: '💔', positive: false },
  { key: 'theft', label: 'Theft', icon: '🚨', positive: false },
  { key: 'audit_correction', label: 'Audit Fix', icon: '📋', positive: true },
  { key: 'transfer', label: 'Transfer', icon: '🔄', positive: false },
];

export function StockAdjustModal({ visible, onClose, data }: StockAdjustModalProps) {
  const [reason, setReason] = useState<StockAdjustmentReason>('restock');
  const [deltaStr, setDeltaStr] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const currentQty = data?.inventory?.quantity ?? 0;
  const selectedReason = REASONS.find((r) => r.key === reason);
  const deltaNum = parseInt(deltaStr, 10);
  const signedDelta = !isNaN(deltaNum) && selectedReason !== undefined
    ? selectedReason.positive ? Math.abs(deltaNum) : -Math.abs(deltaNum)
    : 0;
  const newQty = Math.max(0, currentQty + signedDelta);

  function handleClose() {
    setDeltaStr('');
    setNote('');
    setReason('restock');
    onClose();
  }

  async function handleSave() {
    if (!data) return;
    if (isNaN(deltaNum) || deltaNum <= 0) {
      Alert.alert('Validation', 'Enter a positive quantity to adjust.');
      return;
    }

    setSaving(true);
    try {
      await InventoryService.adjustStock({
        productId: data.product.id,
        delta: signedDelta,
        reason,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      handleClose();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to adjust stock.');
    } finally {
      setSaving(false);
    }
  }

  if (data === null) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Adjust Stock</Text>
          <Text style={styles.productName}>{data.product.name}</Text>
          <Text style={styles.sku}>SKU: {data.product.sku} · {centsToPHP(data.product.price)}</Text>

          {/* Current → New qty indicator */}
          <View style={styles.qtyRow}>
            <View style={styles.qtyBox}>
              <Text style={styles.qtyLabel}>Current</Text>
              <Text style={styles.qtyVal}>{currentQty}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
            <View style={[styles.qtyBox, styles.qtyBoxNew]}>
              <Text style={styles.qtyLabel}>After</Text>
              <Text style={[styles.qtyVal, signedDelta > 0 && styles.qtyValPos, signedDelta < 0 && styles.qtyValNeg]}>
                {newQty}
              </Text>
            </View>
          </View>

          {/* Reason chips */}
          <Text style={styles.sectionLabel}>Reason</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reasonScroll}>
            {REASONS.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[styles.reasonChip, reason === r.key && styles.reasonChipActive]}
                onPress={() => setReason(r.key)}
              >
                <Text style={styles.reasonIcon}>{r.icon}</Text>
                <Text style={[styles.reasonLabel, reason === r.key && styles.reasonLabelActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quantity input */}
          <Text style={styles.sectionLabel}>
            Quantity ({selectedReason?.positive === true ? 'adding' : 'removing'})
          </Text>
          <TextInput
            style={styles.input}
            value={deltaStr}
            onChangeText={setDeltaStr}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
          />

          {/* Note */}
          <Text style={styles.sectionLabel}>Note (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputNote]}
            value={note}
            onChangeText={setNote}
            placeholder="Reason details…"
            placeholderTextColor={colors.textMuted}
            multiline
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.saveBtnText}>Apply Adjustment</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  productName: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary, marginTop: spacing.xs },
  sku: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.md },

  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  qtyBox: { alignItems: 'center' },
  qtyBoxNew: {},
  qtyLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 2 },
  qtyVal: { fontSize: fontSize.display, fontWeight: '700', color: colors.textPrimary },
  qtyValPos: { color: colors.success },
  qtyValNeg: { color: colors.danger },
  arrow: { fontSize: fontSize.xl, color: colors.textMuted },

  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },

  reasonScroll: { marginBottom: spacing.xs },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    gap: 4,
  },
  reasonChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  reasonIcon: { fontSize: 16 },
  reasonLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  reasonLabelActive: { color: colors.textOnPrimary, fontWeight: '600' },

  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputNote: { height: 64, textAlignVertical: 'top', marginBottom: spacing.md },

  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveBtnDisabled: { backgroundColor: colors.textMuted },
  saveBtnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: fontSize.md },
});
