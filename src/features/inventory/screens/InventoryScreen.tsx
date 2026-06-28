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
import { InventoryService } from '../services/InventoryService';
import { ProductCard } from '../components/organisms/ProductCard';
import { ProductFormModal } from '../components/organisms/ProductFormModal';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { colors, spacing, radius, fontSize } from '@theme/index';
import type { InventoryFilter, ProductRow } from '../types';

export function InventoryScreen() {
  const [search, setSearch] = useState('');
  const { isTablet } = useResponsive();

  // Inventory lists every product (available and unavailable) so any can be toggled.
  const filter: InventoryFilter = {
    ...(search.trim() ? { search: search.trim() } : {}),
  };
  const { products, isLoading } = useProducts(filter, { field: 'name', direction: 'asc' });

  const [formVisible, setFormVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<ProductRow | undefined>(undefined);

  function openAdd() {
    setEditTarget(undefined);
    setFormVisible(true);
  }

  function openEdit(item: ProductRow) {
    setEditTarget(item);
    setFormVisible(true);
  }

  async function handleToggleAvailable(item: ProductRow, next: boolean) {
    try {
      await InventoryService.setAvailability(item.product.id, next);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update availability.');
    }
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
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Products</Text>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search products…"
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
                onToggleAvailable={(next) => handleToggleAvailable(item, next)}
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
