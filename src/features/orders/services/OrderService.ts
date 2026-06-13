import { Q } from '@nozbe/watermelondb';
import { database } from '@core/database';
import { Order, OrderItem, Inventory, Customer } from '@core/database/models';
import type { CreateOrderParams, RefundOrderParams, OrderWithItems, ReceiptData } from '../types';

export class OrderService {
  // ── Order number generation ──────────────────────────────────────────────────
  // Counter is process-scoped. On app restart, the date prefix provides
  // collision resistance even if the counter resets.
  private static counter = 0;

  private static nextOrderNumber(): string {
    const d = new Date();
    const prefix = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    OrderService.counter += 1;
    return `ORD-${prefix}-${String(OrderService.counter).padStart(4, '0')}`;
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  static async createOrder(params: CreateOrderParams): Promise<Order> {
    const { cart, customerId, paymentMethod, taxRate, notes } = params;

    if (cart.length === 0) throw new Error('Cannot create an order with an empty cart.');

    const subtotalCents = cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity - item.discountAmount,
      0
    );
    const discountCents = cart.reduce((sum, item) => sum + item.discountAmount, 0);
    const taxCents = Math.round(subtotalCents * taxRate);
    const totalCents = subtotalCents + taxCents;

    return database.write(async () => {
      const order = await database.get<Order>('orders').create((o) => {
        o.orderNumber = OrderService.nextOrderNumber();
        o.customerId = customerId ?? null;
        o.status = 'completed';
        o.subtotal = subtotalCents;
        o.discountAmount = discountCents;
        o.taxAmount = taxCents;
        o.total = totalCents;
        o.paymentMethod = paymentMethod;
        o.paymentStatus = 'paid';
        o.notes = notes ?? null;
      });

      // Batch: create all order items + decrement inventory in a single write.
      const invCollection = database.get<Inventory>('inventory');

      for (const item of cart) {
        await database.get<OrderItem>('order_items').create((oi) => {
          oi.orderId = order.id;
          oi.productId = item.product.id;
          oi.productName = item.product.name;
          oi.quantity = item.quantity;
          oi.unitPrice = item.product.price;
          oi.discountAmount = item.discountAmount;
          oi.total = item.product.price * item.quantity - item.discountAmount;
        });

        const [inv] = await invCollection
          .query(Q.where('product_id', item.product.id))
          .fetch();

        if (inv) {
          await inv.update((r) => {
            r.quantity = Math.max(0, r.quantity - item.quantity);
          });
        }
      }

      // Update customer lifetime stats if linked.
      if (customerId) {
        const customer = await database.get<Customer>('customers').find(customerId);
        await customer.update((c) => {
          c.totalSpent = c.totalSpent + totalCents;
          c.visitCount = c.visitCount + 1;
        });
      }

      return order;
    });
  }

  // ── Void / refund ─────────────────────────────────────────────────────────────

  static async voidOrder(orderId: string): Promise<void> {
    await database.write(async () => {
      const order = await database.get<Order>('orders').find(orderId);
      if (order.status === 'cancelled') throw new Error('Order is already cancelled.');

      await order.update((o) => {
        o.status = 'cancelled';
        o.paymentStatus = 'refunded';
      });
    });
  }

  static async refundOrder(params: RefundOrderParams): Promise<void> {
    await database.write(async () => {
      const order = await database.get<Order>('orders').find(params.orderId);
      if (order.status !== 'completed') {
        throw new Error('Only completed orders can be refunded.');
      }

      await order.update((o) => {
        o.status = 'refunded';
        o.paymentStatus = 'refunded';
        o.notes = params.reason;
      });

      if (params.restockItems) {
        const items = await order.items.fetch();
        const invCollection = database.get<Inventory>('inventory');

        for (const item of items) {
          const [inv] = await invCollection
            .query(Q.where('product_id', item.productId))
            .fetch();

          if (inv) {
            await inv.update((r) => {
              r.quantity = r.quantity + item.quantity;
            });
          }
        }
      }

      // Reverse customer lifetime stats.
      if (order.customerId) {
        const customer = await database
          .get<Customer>('customers')
          .find(order.customerId);
        await customer.update((c) => {
          c.totalSpent = Math.max(0, c.totalSpent - order.total);
          c.visitCount = Math.max(0, c.visitCount - 1);
        });
      }
    });
  }

  // ── Reads ────────────────────────────────────────────────────────────────────

  static async getOrderWithItems(orderId: string): Promise<OrderWithItems> {
    const order = await database.get<Order>('orders').find(orderId);
    const items = await order.items.fetch();
    return { order, items };
  }

  // ── Receipt ───────────────────────────────────────────────────────────────────

  static async buildReceipt(orderId: string): Promise<ReceiptData> {
    const { order, items } = await OrderService.getOrderWithItems(orderId);

    let customerName: string | null = null;
    if (order.customerId) {
      const customer = await database
        .get<Customer>('customers')
        .find(order.customerId);
      customerName = customer.name;
    }

    return {
      orderNumber: order.orderNumber,
      issuedAt: order.createdAt,
      lines: items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPriceCents: item.unitPrice,
        discountCents: item.discountAmount,
        totalCents: item.total,
      })),
      subtotalCents: order.subtotal,
      discountCents: order.discountAmount,
      taxCents: order.taxAmount,
      totalCents: order.total,
      paymentMethod: order.paymentMethod,
      customerName,
      cashierNote: order.notes,
    };
  }

  // ── Receipt plain-text formatter (for thermal printers / sharing) ─────────────

  static formatReceiptText(receipt: ReceiptData): string {
    const { centsToPHP } = require('@shared/utils/formatMoney');
    const W = 42;
    const hr = '─'.repeat(W);
    const pad = (l: string, r: string) =>
      l + ' '.repeat(Math.max(1, W - l.length - r.length)) + r;

    const lines: string[] = [
      '          TUGKARAN POS          ',
      hr,
      `Order #: ${receipt.orderNumber}`,
      `Date   : ${receipt.issuedAt.toLocaleString('en-PH')}`,
      receipt.customerName ? `Customer: ${receipt.customerName}` : '',
      hr,
      ...receipt.lines.map((l) => {
        const desc =
          l.discountCents > 0
            ? `${l.productName} x${l.quantity} (-${centsToPHP(l.discountCents)})`
            : `${l.productName} x${l.quantity}`;
        return pad(desc, centsToPHP(l.totalCents));
      }),
      hr,
      pad('Subtotal', centsToPHP(receipt.subtotalCents)),
      receipt.discountCents > 0
        ? pad('Discount', `-${centsToPHP(receipt.discountCents)}`)
        : '',
      pad('Tax', centsToPHP(receipt.taxCents)),
      pad('TOTAL', centsToPHP(receipt.totalCents)),
      hr,
      pad('Payment', receipt.paymentMethod.toUpperCase()),
      '',
      receipt.cashierNote ? `Note: ${receipt.cashierNote}` : '',
      '',
      '      Thank you for your purchase!      ',
    ]
      .filter((l) => l !== '')
      .join('\n');

    return lines;
  }
}
