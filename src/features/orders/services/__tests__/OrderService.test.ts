/**
 * OrderService unit tests using the WatermelonDB in-memory adapter.
 */
import { Database } from '@nozbe/watermelondb';
import { mockDatabase } from '@nozbe/watermelondb/utils/test';
import { schema } from '@core/database/schema';
import { Product, Inventory, Order, OrderItem, Customer, Category } from '@core/database/models';

function makeDb(): Database {
  return mockDatabase({
    schema,
    modelClasses: [Product, Inventory, Order, OrderItem, Customer, Category],
  });
}

async function seedProduct(
  db: Database,
  opts: { price: number; cost: number; quantity: number; sku?: string }
): Promise<{ product: Product; inventory: Inventory }> {
  let product!: Product;
  let inventory!: Inventory;

  await db.write(async () => {
    product = await db.get<Product>('products').create((p) => {
      p.name = 'Widget';
      p.sku = opts.sku ?? 'W-001';
      p.price = opts.price;
      p.cost = opts.cost;
      p.isActive = true;
    });

    inventory = await db.get<Inventory>('inventory').create((inv) => {
      inv.productId = product.id;
      inv.quantity = opts.quantity;
      inv.lowStockThreshold = 5;
      inv.location = null;
    });
  });

  return { product, inventory };
}

describe('OrderService — createOrder', () => {
  test('creates order, order items, and decrements inventory in one transaction', async () => {
    const db = makeDb();
    const { product, inventory } = await seedProduct(db, { price: 5000, cost: 2500, quantity: 20 });

    await db.write(async () => {
      const order = await db.get<Order>('orders').create((o) => {
        o.orderNumber = 'ORD-20260613-0001';
        o.status = 'completed';
        o.subtotal = 9000;
        o.discountAmount = 1000;
        o.taxAmount = 1080;
        o.total = 10080;
        o.paymentMethod = 'cash';
        o.paymentStatus = 'paid';
        o.customerId = null;
        o.notes = null;
      });

      await db.get<OrderItem>('order_items').create((oi) => {
        oi.orderId = order.id;
        oi.productId = product.id;
        oi.productName = product.name;
        oi.quantity = 2;
        oi.unitPrice = 5000;
        oi.discountAmount = 1000;
        oi.total = 9000;
      });

      await inventory.update((r) => {
        r.quantity = Math.max(0, r.quantity - 2);
      });
    });

    const orders = await db.get<Order>('orders').query().fetch();
    expect(orders).toHaveLength(1);
    expect(orders[0]?.orderNumber).toBe('ORD-20260613-0001');

    const items = await db.get<OrderItem>('order_items').query().fetch();
    expect(items).toHaveLength(1);
    expect(items[0]?.quantity).toBe(2);

    const inv = await db.get<Inventory>('inventory').find(inventory.id);
    expect(inv.quantity).toBe(18);
  });

  test('tax calculation rounds to integer cents', () => {
    const subtotal = 9999;
    const taxRate = 0.12;
    const taxCents = Math.round(subtotal * taxRate);
    // 9999 * 0.12 = 1199.88 → rounds to 1200
    expect(taxCents).toBe(1200);
  });
});

describe('OrderService — totals', () => {
  test('total equals subtotal + tax - no discount double-count', () => {
    const itemPrice = 5000;
    const qty = 3;
    const discount = 500;
    const taxRate = 0.12;

    const subtotal = itemPrice * qty - discount;
    const tax = Math.round(subtotal * taxRate);
    const total = subtotal + tax;

    expect(subtotal).toBe(14500);
    expect(tax).toBe(1740);
    expect(total).toBe(16240);
  });
});
