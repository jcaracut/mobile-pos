import type { PaymentMethod } from '@core/database/models/Order';

// ── Period granularity ────────────────────────────────────────────────────────

export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

// ── Aggregated metrics ────────────────────────────────────────────────────────

export interface PeriodSummary {
  label: string;
  /** Start of this period bucket */
  periodStart: Date;
  revenueCents: number;
  orderCount: number;
  averageOrderValueCents: number;
  grossProfitCents: number;
  grossMarginPct: number;
}

export interface SalesDashboard {
  totalRevenueCents: number;
  totalOrderCount: number;
  averageOrderValueCents: number;
  totalGrossProfitCents: number;
  grossMarginPct: number;
  /** Revenue vs same period prior */
  revenueGrowthPct: number | null;
  periods: PeriodSummary[];
}

// ── Top sellers ───────────────────────────────────────────────────────────────

export interface TopSellingProduct {
  productId: string;
  productName: string;
  unitsSold: number;
  revenueCents: number;
  profitCents: number;
}

// ── Payment breakdown ─────────────────────────────────────────────────────────

export interface PaymentMethodBreakdown {
  method: PaymentMethod;
  orderCount: number;
  revenueCents: number;
  sharePct: number;
}

// ── Hourly heatmap (for finding peak hours) ───────────────────────────────────

export interface HourlyBucket {
  /** 0–23 */
  hour: number;
  orderCount: number;
  revenueCents: number;
}
