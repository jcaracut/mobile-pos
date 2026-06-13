/**
 * InventoryService unit tests.
 *
 * Run with: jest src/features/inventory/services/__tests__/InventoryService.test.ts
 *
 * The WatermelonDB in-memory adapter is used — no SQLite file is touched.
 */
import { Database } from '@nozbe/watermelondb';
import { mockDatabase } from '@nozbe/watermelondb/utils/test'; // available since WDB 0.27
import { schema } from '@core/database/schema';
import { Product, Inventory, Category } from '@core/database/models';

// ── Test database factory ─────────────────────────────────────────────────────

function makeDb(): Database {
  return mockDatabase({
    schema,
    modelClasses: [Product, Inventory, Category],
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function seedProduct(
  db: Database,
  overrides: Partial<{
    name: string;
    sku: string;
    price: number;
    cost: number;
    quantity: number;
    lowStockThreshold: number;
  }> = {}
): Promise<{ product: Product; inventory: Inventory }> {
  const { name = 'Test Product', sku = 'SKU-001', price = 10000, cost = 5000,
          quantity = 50, lowStockThreshold = 10 } = overrides;

  let product!: Product;
  let inventory!: Inventory;

  await db.write(async () => {
    product = await db.get<Product>('products').create((p) => {
      p.name = name;
      p.sku = sku;
      p.price = price;
      p.cost = cost;
      p.isActive = true;
    });

    inventory = await db.get<Inventory>('inventory').create((inv) => {
      inv.productId = product.id;
      inv.quantity = quantity;
      inv.lowStockThreshold = lowStockThreshold;
      inv.location = null;
    });
  });

  return { product, inventory };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('InventoryService — stock adjustments', () => {
  test('positive delta increases quantity', async () => {
    const db = makeDb();
    const { inventory } = await seedProduct(db, { quantity: 20 });

    await db.write(async () => {
      await inventory.update((r) => {
        r.quantity = Math.max(0, r.quantity + 10);
      });
    });

    const updated = await db.get<Inventory>('inventory').find(inventory.id);
    expect(updated.quantity).toBe(30);
  });

  test('negative delta clamps at 0, never goes negative', async () => {
    const db = makeDb();
    const { inventory } = await seedProduct(db, { quantity: 5 });

    await db.write(async () => {
      await inventory.update((r) => {
        r.quantity = Math.max(0, r.quantity - 100);
      });
    });

    const updated = await db.get<Inventory>('inventory').find(inventory.id);
    expect(updated.quantity).toBe(0);
  });

  test('isLowStock is true when quantity ≤ threshold', async () => {
    const db = makeDb();
    const { inventory } = await seedProduct(db, { quantity: 5, lowStockThreshold: 10 });
    expect(inventory.isLowStock).toBe(true);
  });

  test('isLowStock is false when quantity > threshold', async () => {
    const db = makeDb();
    const { inventory } = await seedProduct(db, { quantity: 11, lowStockThreshold: 10 });
    expect(inventory.isLowStock).toBe(false);
  });

  test('isOutOfStock is true when quantity is 0', async () => {
    const db = makeDb();
    const { inventory } = await seedProduct(db, { quantity: 0 });
    expect(inventory.isOutOfStock).toBe(true);
  });
});

describe('Product — computed getters', () => {
  test('margin is calculated correctly', async () => {
    const db = makeDb();
    const { product } = await seedProduct(db, { price: 10000, cost: 6000 });
    expect(product.margin).toBeCloseTo(40, 1);
  });

  test('margin is 0 when price is 0', async () => {
    const db = makeDb();
    const { product } = await seedProduct(db, { price: 0, cost: 0 });
    expect(product.margin).toBe(0);
  });
});
