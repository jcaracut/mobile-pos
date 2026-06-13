import { Q } from '@nozbe/watermelondb';
import { database } from '@core/database';
import { Order, OrderItem, Product } from '@core/database/models';
import { dayBounds, weekBounds, monthBounds } from '@shared/utils/formatDate';
import type {
  SalesDashboard,
  PeriodSummary,
  TopSellingProduct,
  PaymentMethodBreakdown,
  HourlyBucket,
  DateRange,
  AnalyticsPeriod,
} from '../types';
import type { PaymentMethod } from '@core/database/models/Order';

export class SalesAnalyticsService {
  // ── Core query helper ────────────────────────────────────────────────────────

  private static async fetchCompletedOrders(range: DateRange): Promise<Order[]> {
    return database
      .get<Order>('orders')
      .query(
        Q.where('status', 'completed'),
        Q.where('created_at', Q.gte(range.start.getTime())),
        Q.where('created_at', Q.lte(range.end.getTime()))
      )
      .fetch();
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────

  static async getDashboard(
    period: AnalyticsPeriod,
    referenceDate: Date = new Date()
  ): Promise<SalesDashboard> {
    const current = SalesAnalyticsService.resolveRange(period, referenceDate);
    const prior = SalesAnalyticsService.priorRange(period, referenceDate);

    const [currentOrders, priorOrders] = await Promise.all([
      SalesAnalyticsService.fetchCompletedOrders(current),
      SalesAnalyticsService.fetchCompletedOrders(prior),
    ]);

    const currentRevenue = currentOrders.reduce((s, o) => s + o.total, 0);
    const priorRevenue = priorOrders.reduce((s, o) => s + o.total, 0);

    // Gross profit requires order items to access product cost.
    const currentItems = await SalesAnalyticsService.fetchOrderItems(
      currentOrders.map((o) => o.id)
    );
    const profitCents = await SalesAnalyticsService.computeProfit(currentItems);

    const orderCount = currentOrders.length;
    const avgOrderValueCents = orderCount > 0 ? Math.round(currentRevenue / orderCount) : 0;
    const grossMarginPct =
      currentRevenue > 0 ? (profitCents / currentRevenue) * 100 : 0;

    const revenueGrowthPct =
      priorRevenue > 0
        ? ((currentRevenue - priorRevenue) / priorRevenue) * 100
        : null;

    const periods = await SalesAnalyticsService.buildPeriodBuckets(period, referenceDate);

    return {
      totalRevenueCents: currentRevenue,
      totalOrderCount: orderCount,
      averageOrderValueCents: avgOrderValueCents,
      totalGrossProfitCents: profitCents,
      grossMarginPct,
      revenueGrowthPct,
      periods,
    };
  }

  // ── Period buckets (sparkline / bar chart data) ───────────────────────────────

  static async buildPeriodBuckets(
    period: AnalyticsPeriod,
    referenceDate: Date = new Date()
  ): Promise<PeriodSummary[]> {
    switch (period) {
      case 'daily':
        return SalesAnalyticsService.buildDailyBuckets(7, referenceDate);
      case 'weekly':
        return SalesAnalyticsService.buildWeeklyBuckets(8, referenceDate);
      case 'monthly':
        return SalesAnalyticsService.buildMonthlyBuckets(12, referenceDate);
      default:
        return [];
    }
  }

  private static async buildDailyBuckets(
    count: number,
    referenceDate: Date
  ): Promise<PeriodSummary[]> {
    const buckets: PeriodSummary[] = [];

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - i);
      const { start, end } = dayBounds(d);
      const orders = await SalesAnalyticsService.fetchCompletedOrders({ start, end });
      const items = await SalesAnalyticsService.fetchOrderItems(orders.map((o) => o.id));
      const revenueCents = orders.reduce((s, o) => s + o.total, 0);
      const orderCount = orders.length;
      const profitCents = await SalesAnalyticsService.computeProfit(items);

      buckets.push({
        label: d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }),
        periodStart: start,
        revenueCents,
        orderCount,
        averageOrderValueCents: orderCount > 0 ? Math.round(revenueCents / orderCount) : 0,
        grossProfitCents: profitCents,
        grossMarginPct: revenueCents > 0 ? (profitCents / revenueCents) * 100 : 0,
      });
    }

    return buckets;
  }

  private static async buildWeeklyBuckets(
    count: number,
    referenceDate: Date
  ): Promise<PeriodSummary[]> {
    const buckets: PeriodSummary[] = [];

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - i * 7);
      const { start, end } = weekBounds(d);
      const orders = await SalesAnalyticsService.fetchCompletedOrders({ start, end });
      const items = await SalesAnalyticsService.fetchOrderItems(orders.map((o) => o.id));
      const revenueCents = orders.reduce((s, o) => s + o.total, 0);
      const orderCount = orders.length;
      const profitCents = await SalesAnalyticsService.computeProfit(items);

      buckets.push({
        label: `Wk of ${start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`,
        periodStart: start,
        revenueCents,
        orderCount,
        averageOrderValueCents: orderCount > 0 ? Math.round(revenueCents / orderCount) : 0,
        grossProfitCents: profitCents,
        grossMarginPct: revenueCents > 0 ? (profitCents / revenueCents) * 100 : 0,
      });
    }

    return buckets;
  }

  private static async buildMonthlyBuckets(
    count: number,
    referenceDate: Date
  ): Promise<PeriodSummary[]> {
    const buckets: PeriodSummary[] = [];

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
      const { start, end } = monthBounds(d);
      const orders = await SalesAnalyticsService.fetchCompletedOrders({ start, end });
      const items = await SalesAnalyticsService.fetchOrderItems(orders.map((o) => o.id));
      const revenueCents = orders.reduce((s, o) => s + o.total, 0);
      const orderCount = orders.length;
      const profitCents = await SalesAnalyticsService.computeProfit(items);

      buckets.push({
        label: d.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' }),
        periodStart: start,
        revenueCents,
        orderCount,
        averageOrderValueCents: orderCount > 0 ? Math.round(revenueCents / orderCount) : 0,
        grossProfitCents: profitCents,
        grossMarginPct: revenueCents > 0 ? (profitCents / revenueCents) * 100 : 0,
      });
    }

    return buckets;
  }

  // ── Top sellers ───────────────────────────────────────────────────────────────

  static async getTopSellingProducts(
    range: DateRange,
    limit = 10
  ): Promise<TopSellingProduct[]> {
    const orders = await SalesAnalyticsService.fetchCompletedOrders(range);
    if (orders.length === 0) return [];

    const items = await SalesAnalyticsService.fetchOrderItems(orders.map((o) => o.id));

    // Aggregate by product id.
    const aggregated = new Map<
      string,
      { productName: string; unitsSold: number; revenueCents: number }
    >();

    for (const item of items) {
      const existing = aggregated.get(item.productId);
      if (existing) {
        existing.unitsSold += item.quantity;
        existing.revenueCents += item.total;
      } else {
        aggregated.set(item.productId, {
          productName: item.productName,
          unitsSold: item.quantity,
          revenueCents: item.total,
        });
      }
    }

    // Resolve cost per product for profit calculation.
    const productIds = [...aggregated.keys()];
    const products = await Promise.all(
      productIds.map((id) => database.get<Product>('products').find(id).catch(() => null))
    );
    const costMap = new Map(
      products
        .filter((p): p is Product => p !== null)
        .map((p) => [p.id, p.cost])
    );

    return [...aggregated.entries()]
      .map(([productId, data]) => {
        const costPerUnit = costMap.get(productId) ?? 0;
        const profitCents = data.revenueCents - costPerUnit * data.unitsSold;
        return { productId, ...data, profitCents };
      })
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, limit);
  }

  // ── Payment method breakdown ──────────────────────────────────────────────────

  static async getPaymentBreakdown(range: DateRange): Promise<PaymentMethodBreakdown[]> {
    const orders = await SalesAnalyticsService.fetchCompletedOrders(range);
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);

    const grouped = new Map<PaymentMethod, { count: number; revenue: number }>();

    for (const order of orders) {
      const existing = grouped.get(order.paymentMethod);
      if (existing) {
        existing.count += 1;
        existing.revenue += order.total;
      } else {
        grouped.set(order.paymentMethod, { count: 1, revenue: order.total });
      }
    }

    return [...grouped.entries()]
      .map(([method, data]) => ({
        method,
        orderCount: data.count,
        revenueCents: data.revenue,
        sharePct: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenueCents - a.revenueCents);
  }

  // ── Hourly heatmap ────────────────────────────────────────────────────────────

  static async getHourlyHeatmap(range: DateRange): Promise<HourlyBucket[]> {
    const orders = await SalesAnalyticsService.fetchCompletedOrders(range);

    const buckets = Array.from({ length: 24 }, (_, hour): HourlyBucket => ({
      hour,
      orderCount: 0,
      revenueCents: 0,
    }));

    for (const order of orders) {
      const hour = order.createdAt.getHours();
      const bucket = buckets[hour];
      if (bucket) {
        bucket.orderCount += 1;
        bucket.revenueCents += order.total;
      }
    }

    return buckets;
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private static async fetchOrderItems(orderIds: string[]): Promise<OrderItem[]> {
    if (orderIds.length === 0) return [];
    return database
      .get<OrderItem>('order_items')
      .query(Q.where('order_id', Q.oneOf(orderIds)))
      .fetch();
  }

  private static async computeProfit(items: OrderItem[]): Promise<number> {
    if (items.length === 0) return 0;

    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await Promise.all(
      productIds.map((id) => database.get<Product>('products').find(id).catch(() => null))
    );
    const costMap = new Map(
      products.filter((p): p is Product => p !== null).map((p) => [p.id, p.cost])
    );

    return items.reduce((sum, item) => {
      const costPerUnit = costMap.get(item.productId) ?? 0;
      return sum + item.total - costPerUnit * item.quantity;
    }, 0);
  }

  private static resolveRange(period: AnalyticsPeriod, ref: Date): DateRange {
    switch (period) {
      case 'daily':
        return dayBounds(ref);
      case 'weekly':
        return weekBounds(ref);
      case 'monthly':
        return monthBounds(ref);
      default:
        return dayBounds(ref);
    }
  }

  private static priorRange(period: AnalyticsPeriod, ref: Date): DateRange {
    const prior = new Date(ref);
    switch (period) {
      case 'daily':
        prior.setDate(prior.getDate() - 1);
        return dayBounds(prior);
      case 'weekly':
        prior.setDate(prior.getDate() - 7);
        return weekBounds(prior);
      case 'monthly':
        prior.setMonth(prior.getMonth() - 1);
        return monthBounds(prior);
      default:
        prior.setDate(prior.getDate() - 1);
        return dayBounds(prior);
    }
  }
}
