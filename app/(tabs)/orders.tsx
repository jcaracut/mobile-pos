import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useOrders } from '@features/orders/hooks/useOrders';
import { OrderService } from '@features/orders/services/OrderService';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { Badge } from '@shared/components/ui/Badge';
import { centsToPHP } from '@shared/utils/formatMoney';
import { formatDateTime } from '@shared/utils/formatDate';
import { colors, spacing, radius, fontSize } from '@theme/index';
import type { Order } from '@core/database/models/Order';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATUS_VARIANT = {
  completed: 'success',
  pending: 'info',
  cancelled: 'danger',
  refunded: 'warning',
} as const;

const STATUS_LABEL = {
  completed: 'Completed',
  pending: 'Pending',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

function OrderRow({ order }: { order: Order }) {
  const [cancelling, setCancelling] = useState(false);

  function confirmCancel() {
    Alert.alert(
      'Cancel Order',
      `Cancel ${order.orderNumber}?\n\nThis order will be excluded from all sales reports.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await OrderService.voidOrder(order.id);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to cancel order.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.orderNum}>{order.orderNumber}</Text>
          <Text style={styles.date}>{formatDateTime(order.createdAt)}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.total}>{centsToPHP(order.total)}</Text>
          <Badge
            label={STATUS_LABEL[order.status]}
            variant={STATUS_VARIANT[order.status] ?? 'default'}
          />
        </View>
      </View>

      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>
          {order.subtotal !== order.total
            ? `Subtotal ${centsToPHP(order.subtotal)} + Tax ${centsToPHP(order.taxAmount)}`
            : `${centsToPHP(order.total)} total`}
        </Text>
      </View>

      {order.status === 'completed' && (
        <TouchableOpacity
          style={[styles.cancelBtn, cancelling && styles.cancelBtnDisabled]}
          onPress={confirmCancel}
          disabled={cancelling}
          activeOpacity={0.7}
        >
          {cancelling ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <Text style={styles.cancelBtnText}>Cancel Order</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function OrdersScreen() {
  const { orders, isLoading } = useOrders({});

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const completed = orders.filter((o) => o.status === 'completed').length;
  const cancelled = orders.filter((o) => o.status === 'cancelled').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.heading}>Orders</Text>

        {orders.length > 0 && (
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{completed}</Text>
              <Text style={styles.summaryLabel}>Completed</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, cancelled > 0 && styles.summaryNumDanger]}>{cancelled}</Text>
              <Text style={styles.summaryLabel}>Cancelled</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{orders.length}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
          </View>
        )}

        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => <OrderRow order={item} />}
          ListEmptyComponent={
            <EmptyState
              icon="🧾"
              title="No orders yet"
              subtitle="Complete a sale on the POS tab to see it here."
            />
          }
          contentContainerStyle={orders.length === 0 ? styles.emptyList : styles.list}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },

  summary: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  summaryNumDanger: { color: colors.danger },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: colors.border },

  list: { paddingBottom: spacing.xl },
  emptyList: { flex: 1 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: spacing.xs },
  orderNum: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  date: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  total: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },

  cardMeta: { marginTop: spacing.xs },
  metaText: { fontSize: fontSize.xs, color: colors.textSecondary },

  cancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
  },
  cancelBtnDisabled: { borderColor: colors.border },
  cancelBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.danger },
});
