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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InventoryService } from '../../services/InventoryService';
import { CategoryService } from '../../services/CategoryService';
import { useResponsive } from '@shared/hooks/useResponsive';
import { colors, spacing, radius, fontSize } from '@theme/index';
import type { ProductRow } from '../../types';

interface ProductFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Pass existing product to edit; omit for create. */
  editing?: ProductRow;
}

interface FormState {
  name: string;
  description: string;
  pricePHP: string;
  categoryId: string;
}

interface CategoryOption {
  id: string;
  label: string;
  icon: string;
}

/** Default categories for a coffee-shop POS. Seeded on first open; users can add their own. */
const DEFAULT_CATEGORIES = [
  { name: 'Drinks', color: '#3498DB', icon: '☕' },
  { name: 'Food', color: '#F5A623', icon: '🥐' },
  { name: 'Snacks', color: '#E67E22', icon: '🍪' },
  { name: 'Desserts', color: '#E84393', icon: '🍰' },
  { name: 'Others', color: '#7F8C8D', icon: '📦' },
] as const;

const CUSTOM_CATEGORY_ICON = '🏷️';
const CUSTOM_CATEGORY_COLOR = '#7F8C8D';

function emptyForm(): FormState {
  return { name: '', description: '', pricePHP: '', categoryId: '' };
}

function productToForm(data: ProductRow): FormState {
  const { product } = data;
  return {
    name: product.name,
    description: product.description ?? '',
    pricePHP: (product.price / 100).toFixed(2),
    categoryId: product.categoryId ?? '',
  };
}

/** Generates a stable, human-readable SKU from the product name. */
function generateSku(name: string): string {
  const slug =
    name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 12) || 'PROD';
  return `${slug}-${Date.now().toString(36).toUpperCase()}`;
}

export function ProductFormModal({ visible, onClose, editing }: ProductFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();

  // Seed the default categories, then return every category (including
  // user-created ones) as selectable chip options.
  async function loadCategories(): Promise<CategoryOption[]> {
    await Promise.all(DEFAULT_CATEGORIES.map((c) => CategoryService.ensureByName(c)));
    const all = await CategoryService.getAll();
    return all.map((cat) => ({
      id: cat.id,
      label: cat.name,
      icon: cat.icon ?? CUSTOM_CATEGORY_ICON,
    }));
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const options = await loadCategories();
      if (!active) return;
      setCategoryOptions(options);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleAddCategory() {
    const name = newCategory.trim();
    if (!name) return;
    try {
      const category = await CategoryService.ensureByName({
        name,
        color: CUSTOM_CATEGORY_COLOR,
        icon: CUSTOM_CATEGORY_ICON,
      });
      setCategoryOptions(await loadCategories());
      set('categoryId', category.id);
      setNewCategory('');
      setAddingCategory(false);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to add category.');
    }
  }

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
    const price = Math.round(parseFloat(form.pricePHP) * 100);
    if (isNaN(price) || price <= 0) { Alert.alert('Validation', 'Enter a valid price.'); return; }
    if (!form.categoryId) { Alert.alert('Validation', 'Please choose a category.'); return; }

    setSaving(true);
    try {
      if (editing !== undefined) {
        await InventoryService.updateProduct(editing.product.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          price,
          categoryId: form.categoryId,
        });
      } else {
        await InventoryService.createProduct({
          name: form.name.trim(),
          sku: generateSku(form.name),
          price,
          cost: 0,
          categoryId: form.categoryId,
          ...(form.description.trim() ? { description: form.description.trim() } : {}),
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
        {/* Tablet: center the form in a max-width card */}
        {isTablet && <View style={styles.tabletBackdrop} />}
        <View style={[styles.formContainer, isTablet && styles.formContainerTablet]}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
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
          <Section label="Product">
            <Field label="Name *">
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => set('name', v)}
                placeholder="e.g. Cappuccino"
                placeholderTextColor={colors.textMuted}
              />
            </Field>
            <Field label="Description">
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={form.description}
                onChangeText={(v) => set('description', v)}
                placeholder="Optional"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </Field>
            <Field label="Price (₱) *">
              <TextInput
                style={styles.input}
                value={form.pricePHP}
                onChangeText={(v) => set('pricePHP', v)}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </Field>
          </Section>

          <Section label="Category *">
            <View style={styles.categoryRow}>
              {categoryOptions.map((cat) => {
                const active = form.categoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                    onPress={() => set('categoryId', cat.id)}
                  >
                    <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                      {cat.icon} {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.categoryChip, styles.categoryChipAdd]}
                onPress={() => setAddingCategory((v) => !v)}
              >
                <Text style={[styles.categoryChipText, styles.categoryChipAddText]}>＋ New</Text>
              </TouchableOpacity>
            </View>

            {addingCategory && (
              <View style={styles.newCategoryRow}>
                <TextInput
                  style={[styles.input, styles.newCategoryInput]}
                  value={newCategory}
                  onChangeText={setNewCategory}
                  placeholder="New category name"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleAddCategory}
                />
                <TouchableOpacity style={styles.newCategoryBtn} onPress={handleAddCategory}>
                  <Text style={styles.newCategoryBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </Section>

          <View style={[styles.bottomPad, { height: insets.bottom + spacing.xxl }]} />
        </ScrollView>
        </View>
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

  tabletBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  formContainer: { flex: 1 },
  formContainerTablet: {
    alignSelf: 'center',
    width: 600,
    marginVertical: 40,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
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

  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryChipText: { fontSize: fontSize.md, color: colors.textSecondary },
  categoryChipTextActive: { color: colors.textOnPrimary, fontWeight: '600' },
  categoryChipAdd: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  categoryChipAddText: { color: colors.primary, fontWeight: '600' },

  newCategoryRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  newCategoryInput: { flex: 1 },
  newCategoryBtn: {
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  newCategoryBtnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: fontSize.md },

  bottomPad: { height: spacing.xxl },
});
