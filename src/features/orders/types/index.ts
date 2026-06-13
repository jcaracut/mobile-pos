import type { Order } from '@core/database/models/Order';
import type { OrderItem } from '@core/database/models/OrderItem';
import type { Product } from '@core/database/models/Product';
import type { PaymentMethod, OrderStatus } from '@core/database/models/Order';

// ── Cart ──────────────────────────────────────────────────────────────────────

export interface CartItem {
  product: Product;
  /** Always ≥ 1 */
  quantity: number;
  /** Integer cents applied as a flat per-line discount */
  discountAmount: number;
}

export interface CartTotals {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
}

// ── Write params ──────────────────────────────────────────────────────────────

export interface CreateOrderParams {
  cart: CartItem[];
  customerId?: string;
  paymentMethod: PaymentMethod;
  /** Rate as decimal, e.g. 0.12 for 12% */
  taxRate: number;
  notes?: string;
}

export interface RefundOrderParams {
  orderId: string;
  reason: string;
  restockItems: boolean;
}

// ── Read projections ──────────────────────────────────────────────────────────

export interface OrderWithItems {
  order: Order;
  items: OrderItem[];
}

// ── Receipt ───────────────────────────────────────────────────────────────────

export interface ReceiptLineItem {
  productName: string;
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
  totalCents: number;
}

export interface ReceiptData {
  orderNumber: string;
  issuedAt: Date;
  lines: ReceiptLineItem[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  paymentMethod: PaymentMethod;
  customerName: string | null;
  cashierNote: string | null;
}

// ── Filter ────────────────────────────────────────────────────────────────────

export interface OrderFilter {
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  startDate?: Date;
  endDate?: Date;
  customerId?: string;
  search?: string;
}
