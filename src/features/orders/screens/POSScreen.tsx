import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../hooks/useCart';
import { useCheckout } from '../hooks/useCheckout';
import { useProducts } from '@features/inventory/hooks/useProducts';
import { CartItemRow } from '../components/organisms/CartItemRow';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { centsToPHP } from '@shared/utils/formatMoney';
import { useResponsive } from '@shared/hooks/useResponsive';
import { colors, spacing, radius, fontSize } from '@theme/index';
import type { PaymentMethod } from '@core/database/models/Order';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'cash', label: 'Cash', icon: '💵' },
  { key: 'gcash', label: 'GCash', icon: '📱' },
  { key: 'maya', label: 'Maya', icon: '💙' },
];

export function POSScreen() {
  const cart = useCart(0.12);
  const checkout = useCheckout();
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [showCart, setShowCart] = useState(false);
  const { width, isTablet } = useResponsive();
  const TILE_COLS = isTablet ? 5 : 3;
  const TILE_GAP = spacing.sm;
  const TILE_WIDTH = (width - spacing.md * 2 - TILE_GAP * (TILE_COLS - 1)) / TILE_COLS;

  const { products } = useProducts(
    { ...(search.trim() ? { search: search.trim() } : {}), isActive: true },
    { field: 'name', direction: 'asc' }
  );

  const isProcessing = checkout.status === 'processing';

  const handleCompleteSale = async () => {
    if (cart.isEmpty || isProcessing) return;

    // Use the return value — do NOT check checkout.status after awaiting,
    // it is a stale closure and will read the pre-call value.
    const success = await checkout.checkout({
      cart: cart.items,
      paymentMethod,
      taxRate: cart.taxRate,
    });

    if (success) {
      const total = centsToPHP(cart.totals.totalCents);
      cart.clearCart();
      setShowCart(false);
      checkout.reset();
      Alert.alert('Sale Complete', `Order recorded!\nTotal: ${total}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Product grid */}
      <FlatList
        data={products}
        keyExtractor={(i) => i.product.id}
        numColumns={TILE_COLS}
        key={TILE_COLS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tile, { width: TILE_WIDTH }]}
            onPress={() => cart.addItem(item.product)}
            activeOpacity={0.75}
          >
            <Text style={styles.tileName} numberOfLines={2}>{item.product.name}</Text>
            <Text style={styles.tilePrice}>{centsToPHP(item.product.price)}</Text>
            {item.inventory !== null && (
              <View style={styles.tileStockRow}>
                <View
                  style={[
                    styles.stockDot,
                    item.inventory.quantity <= 0
                      ? styles.stockDotOut
                      : item.inventory.isLowStock
                      ? styles.stockDotLow
                      : styles.stockDotIn,
                  ]}
                />
                <Text style={styles.tileStock}>{item.inventory.quantity} left</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🔍"
            title="No products found"
            subtitle="Try a different search term."
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Floating cart FAB — hidden while a write is in flight */}
      {!cart.isEmpty && !isProcessing && (
        <TouchableOpacity style={styles.cartFab} onPress={() => setShowCart(true)} activeOpacity={0.85}>
          <Text style={styles.cartFabIcon}>🛒</Text>
          <Text style={styles.cartFabLabel}>{cart.itemCount} item{cart.itemCount !== 1 ? 's' : ''}</Text>
          <Text style={styles.cartFabTotal}>{centsToPHP(cart.totals.totalCents)}</Text>
        </TouchableOpacity>
      )}

      {/* Cart bottom sheet / tablet modal */}
      <Modal visible={showCart} transparent animationType="slide" onRequestClose={() => { if (!isProcessing) setShowCart(false); }}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            onPress={() => { if (!isProcessing) setShowCart(false); }}
          />
          <View style={[styles.sheet, isTablet && styles.sheetTablet]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Cart ({cart.itemCount})</Text>
              {!isProcessing && (
                <TouchableOpacity onPress={() => { cart.clearCart(); setShowCart(false); }}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.sheetItems} showsVerticalScrollIndicator={false}>
              {cart.items.map((item) => (
                <CartItemRow
                  key={item.product.id}
                  item={item}
                  onIncrement={() => cart.setQuantity(item.product.id, item.quantity + 1)}
                  onDecrement={() => cart.setQuantity(item.product.id, item.quantity - 1)}
                  onRemove={() => cart.removeItem(item.product.id)}
                />
              ))}
            </ScrollView>

            {/* Totals */}
            <View style={styles.totalsBox}>
              <TotalRow label="Subtotal" value={centsToPHP(cart.totals.subtotalCents)} />
              {cart.totals.discountCents > 0 && (
                <TotalRow
                  label="Discount"
                  value={`-${centsToPHP(cart.totals.discountCents)}`}
                  color={colors.success}
                />
              )}
              <TotalRow label={`Tax (${(cart.taxRate * 100).toFixed(0)}%)`} value={centsToPHP(cart.totals.taxCents)} />
              <View style={styles.divider} />
              <TotalRow label="TOTAL" value={centsToPHP(cart.totals.totalCents)} bold />
            </View>

            {/* Payment method */}
            <View style={styles.paymentSection}>
              <Text style={styles.paymentLabel}>Payment Method</Text>
              <View style={styles.paymentRow}>
                {PAYMENT_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.payBtn, paymentMethod === m.key && styles.payBtnActive]}
                    onPress={() => setPaymentMethod(m.key)}
                    disabled={isProcessing}
                  >
                    <Text style={styles.payBtnIcon}>{m.icon}</Text>
                    <Text style={[styles.payBtnText, paymentMethod === m.key && styles.payBtnTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {checkout.error !== null ? (
              <Text style={styles.errorText}>{checkout.error}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.chargeBtn, isProcessing && styles.chargeBtnDisabled]}
              onPress={handleCompleteSale}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.chargeBtnText}>
                  Complete Sale · {centsToPHP(cart.totals.totalCents)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TotalRow({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, bold === true && styles.totalLabelBold]}>{label}</Text>
      <Text style={[styles.totalValue, bold === true && styles.totalValueBold, color !== undefined ? { color } : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
  },
  searchIcon: { fontSize: 18, marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary },

  // Product grid
  grid: { paddingHorizontal: spacing.md, paddingBottom: 120 },
  row: { gap: spacing.sm, marginBottom: spacing.sm },
  tile: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 90,
    justifyContent: 'space-between',
  },
  tileName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs },
  tilePrice: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  tileStockRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stockDot: { width: 6, height: 6, borderRadius: 3 },
  stockDotIn: { backgroundColor: colors.inStock },
  stockDotLow: { backgroundColor: colors.lowStock },
  stockDotOut: { backgroundColor: colors.outOfStock },
  tileStock: { fontSize: fontSize.xs, color: colors.textMuted },

  // Floating cart FAB
  cartFab: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  cartFabIcon: { fontSize: 22, marginRight: spacing.sm },
  cartFabLabel: { flex: 1, fontSize: fontSize.md, fontWeight: '600', color: colors.textOnPrimary },
  cartFabTotal: { fontSize: fontSize.md, fontWeight: '700', color: colors.textOnPrimary },

  // Cart bottom sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
    maxHeight: '85%',
  },
  sheetTablet: {
    alignSelf: 'center',
    width: 560,
    marginBottom: 60,
    borderRadius: radius.lg,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sheetTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  clearText: { fontSize: fontSize.sm, color: colors.danger },
  sheetItems: { paddingHorizontal: spacing.md, maxHeight: 240 },

  // Totals
  totalsBox: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  totalLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  totalLabelBold: { fontWeight: '700', color: colors.textPrimary, fontSize: fontSize.md },
  totalValue: { fontSize: fontSize.sm, color: colors.textPrimary },
  totalValueBold: { fontWeight: '700', fontSize: fontSize.lg, color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },

  // Payment method
  paymentSection: { paddingHorizontal: spacing.md, marginTop: spacing.sm },
  paymentLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  paymentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  payBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  payBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  payBtnIcon: { fontSize: 20 },
  payBtnText: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
  payBtnTextActive: { color: colors.textOnPrimary, fontWeight: '600' },

  errorText: { color: colors.danger, fontSize: fontSize.sm, marginBottom: spacing.sm, paddingHorizontal: spacing.md },

  chargeBtn: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  chargeBtnDisabled: { backgroundColor: colors.textMuted },
  chargeBtnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: fontSize.lg },
});
