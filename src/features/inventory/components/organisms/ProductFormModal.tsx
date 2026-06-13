import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { InventoryService } from '../../services/InventoryService';
import { useCategories } from '../../hooks/useCategories';
import { colors, spacing, radius, fontSize } from '@theme/index';
import type { ProductWithStock } from '../../types';

interface ProductFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Pass existing product to edit; omit for create. */
  editing?: ProductWithStock;
}

interface FormState {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  pricePHP: string;
  costPHP: string;
  categoryId: string;
  initialQuantity: string;
  lowStockThreshold: string;
}

function emptyForm(): FormState {
  return {
    name: '',
    sku: '',
    barcode: '',
    description: '',
    pricePHP: '',
    costPHP: '',
    categoryId: '',
    initialQuantity: '0',
    lowStockThreshold: '5',
  };
}

function productToForm(data: ProductWithStock): FormState {
  const { product, inventory } = data;
  return {
    name: product.name,
    sku: product.sku,
    barcode: product.barcode ?? '',
    description: product.description ?? '',
    pricePHP: (product.price / 100).toFixed(2),
    costPHP: (product.cost / 100).toFixed(2),
    categoryId: product.categoryId ?? '',
    initialQuantity: String(inventory?.quantity ?? 0),
    lowStockThreshold: String(inventory?.lowStockThreshold ?? 5),
  };
}

export function ProductFormModal({ visible, onClose, editing }: ProductFormModalProps) {
  const { categories } = useCategories();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(editing !== undefined ? productToForm(editing) : emptyForm());
    }
  }, [visible, editing]);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { Alert.alert('Validation', 'Product name is required.'); return; }
    if (!form.sku.trim()) { Alert.alert('Validation', 'SKU is required.'); return; }
    const price = Math.round(parseFloat(form.pricePHP) * 100);
    const cost = Math.round(parseFloat(form.costPHP) * 100);
    if (isNaN(price) || price <= 0) { Alert.alert('Validation', 'Enter a valid price.'); return; }
    if (isNaN(cost) || cost < 0) { Alert.alert('Validation', 'Enter a valid cost.'); return; }

    setSaving(true);
    try {
      if (editing !== undefined) {
        await InventoryService.updateProduct(editing.product.id, {
          name: form.name.trim(),
          sku: form.sku.trim(),
          barcode: form.barcode.trim() || null,
          description: form.description.trim() || null,
          price,
          cost,
          categoryId: form.categoryId || null,
        });
      } else {
        const qty = parseInt(form.initialQuantity, 10);
        const threshold = parseInt(form.lowStockThreshold, 10);
        await InventoryService.createProduct({
          name: form.name.trim(),
          sku: form.sku.trim(),
          price,
          cost,
          initialQuantity: isNaN(qty) ? 0 : Math.max(0, qty),
          lowStockThreshold: isNaN(threshold) ? 5 : Math.max(0, threshold),
          ...(form.barcode.trim() ? { barcode: form.barcode.trim() } : {}),
          ...(form.description.trim() ? { description: form.description.trim() } : {}),
          ...(form.categoryId ? { categoryId: form.categoryId } : {}),
        });
      }
      onClose();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{editing !== undefined ? 'Edit Product' : 'Add Product'}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerBtn} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.headerBtnText, styles.headerBtnSave]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          <Section label="Product Info">
            <Field label="Name *">
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => set('name', v)}
                placeholder="e.g. Bottled Water 500ml"
                placeholderTextColor={colors.textMuted}
              />
            </Field>
            <Field label="SKU *">
              <TextInput
                style={styles.input}
                value={form.sku}
                onChangeText={(v) => set('sku', v)}
                placeholder="e.g. WATER-500"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
            </Field>
            <Field label="Barcode">
              <TextInput
                style={styles.input}
                value={form.barcode}
                onChangeText={(v) => set('barcode', v)}
                placeholder="Scan or type barcode"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </Field>
            <Field label="Description">
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={form.description}
                onChangeText={(v) => set('description', v)}
                placeholder="Optional description"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </Field>
          </Section>

          <Section label="Pricing">
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Price (₱) *</Text>
                <TextInput
                  style={styles.input}
                  value={form.pricePHP}
                  onChangeText={(v) => set('pricePHP', v)}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Cost (₱) *</Text>
                <TextInput
                  style={styles.input}
                  value={form.costPHP}
                  onChangeText={(v) => set('costPHP', v)}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </Section>

          <Section label="Category">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              <TouchableOpacity
                style={[styles.categoryChip, form.categoryId === '' && styles.categoryChipActive]}
                onPress={() => set('categoryId', '')}
              >
                <Text style={[styles.categoryChipText, form.categoryId === '' && styles.categoryChipTextActive]}>
                  None
                </Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, form.categoryId === cat.id && styles.categoryChipActive]}
                  onPress={() => set('categoryId', cat.id)}
                >
                  <Text style={[styles.categoryChipText, form.categoryId === cat.id && styles.categoryChipTextActive]}>
                    {cat.icon !== null ? `${cat.icon} ` : ''}{cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Section>

          {editing === undefined && (
            <Section label="Initial Stock">
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Starting Qty</Text>
                  <TextInput
                    style={styles.input}
                    value={form.initialQuantity}
                    onChangeText={(v) => set('initialQuantity', v)}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Low Stock Alert</Text>
                  <TextInput
                    style={styles.input}
                    value={form.lowStockThreshold}
                    onChangeText={(v) => set('lowStockThreshold', v)}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </Section>
          )}

          <View style={styles.bottomPad} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  headerBtn: { minWidth: 60, alignItems: 'center', paddingVertical: spacing.xs },
  headerBtnText: { fontSize: fontSize.md, color: colors.textSecondary },
  headerBtnSave: { color: colors.primary, fontWeight: '700' },

  body: { flex: 1 },

  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },

  fieldWrap: { marginBottom: spacing.sm },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
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
  inputMultiline: { height: 80, textAlignVertical: 'top' },

  row: { flexDirection: 'row', gap: spacing.sm },
  halfField: { flex: 1 },

  categoryScroll: { marginTop: spacing.xs },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryChipText: { fontSize: fontSize.sm, color: colors.textSecondary },
  categoryChipTextActive: { color: colors.textOnPrimary, fontWeight: '600' },

  bottomPad: { height: spacing.xxl },
});
