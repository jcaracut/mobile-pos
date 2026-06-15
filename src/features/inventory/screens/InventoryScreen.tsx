import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '@shared/hooks/useResponsive';
import { useProducts } from '../hooks/useProducts';
import { useLowStockAlerts } from '../hooks/useLowStockAlerts';
import { InventoryService } from '../services/InventoryService';
import { ProductCard } from '../components/organisms/ProductCard';
import { LowStockBanner } from '../components/organisms/LowStockBanner';
import { ProductFormModal } from '../components/organisms/ProductFormModal';
import { StockAdjustModal } from '../components/organisms/StockAdjustModal';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { colors, spacing, radius, fontSize } from '@theme/index';
import type { InventoryFilter, ProductWithStock } from '../types';

export function InventoryScreen() {
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const { isTablet } = useResponsive();

  const filter: InventoryFilter = {
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(showInactive ? {} : { isActive: true as const }),
  };
  const { products, isLoading } = useProducts(filter, { field: 'name', direction: 'asc' });
  const { alerts, outOfStock } = useLowStockAlerts();

  const [formVisible, setFormVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<ProductWithStock | undefined>(undefined);

  const [stockVisible, setStockVisible] = useState(false);
  const [stockTarget, setStockTarget] = useState<ProductWithStock | null>(null);

  function openAdd() {
    setEditTarget(undefined);
    setFormVisible(true);
  }

  function openEdit(item: ProductWithStock) {
    setEditTarget(item);
    setFormVisible(true);
  }

  function openStockAdjust(item: ProductWithStock) {
    setStockTarget(item);
    setStockVisible(true);
  }

  function handleArchive(item: ProductWithStock) {
    Alert.alert(
      'Archive Product',
      `"${item.product.name}" will be hidden from the POS. Sales history is preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await InventoryService.archiveProduct(item.product.id);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to archive.');
            }
          },
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Inventory</Text>
          <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowInactive((v) => !v)}>
            <Text style={styles.toggleBtnText}>{showInactive ? 'Active only' : 'Show all'}</Text>
          </TouchableOpacity>
        </View>

        <LowStockBanner outOfStock={outOfStock} lowStock={alerts} />

        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, SKU, or barcode…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />

        <FlatList
          data={products}
          keyExtractor={(item) => item.product.id}
          numColumns={isTablet ? 2 : 1}
          key={isTablet ? 'tablet' : 'phone'}
          columnWrapperStyle={isTablet ? styles.tabletRow : undefined}
          renderItem={({ item }) => (
            <View style={isTablet ? styles.tabletCard : undefined}>
              <ProductCard
                data={item}
                onEdit={() => openEdit(item)}
                onAdjustStock={() => openStockAdjust(item)}
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="📦"
              title="No products found"
              subtitle={search ? 'Try a different search term.' : 'Tap + to add your first product.'}
            />
          }
          contentContainerStyle={products.length === 0 ? styles.emptyList : styles.list}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* FAB — add product */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <ProductFormModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        {...(editTarget !== undefined ? { editing: editTarget } : {})}
      />

      <StockAdjustModal
        visible={stockVisible}
        onClose={() => { setStockVisible(false); setStockTarget(null); }}
        data={stockTarget}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heading: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary },
  toggleBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtnText: { fontSize: fontSize.xs, color: colors.textSecondary },

  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },

  list: { paddingBottom: 90 },
  emptyList: { flex: 1 },
  tabletRow: { gap: spacing.md },
  tabletCard: { flex: 1 },

  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: { fontSize: 28, color: colors.textOnPrimary, lineHeight: 32 },
});
