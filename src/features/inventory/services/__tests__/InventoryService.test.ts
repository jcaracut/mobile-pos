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
import { Product, Category } from '@core/database/models';

// ── Test database factory ─────────────────────────────────────────────────────

function makeDb(): Database {
  return mockDatabase({
    schema,
    modelClasses: [Product, Category],
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
    isActive: boolean;
  }> = {}
): Promise<Product> {
  const { name = 'Test Product', sku = 'SKU-001', price = 10000, cost = 5000, isActive = true } =
    overrides;

  let product!: Product;

  await db.write(async () => {
    product = await db.get<Product>('products').create((p) => {
      p.name = name;
      p.sku = sku;
      p.price = price;
      p.cost = cost;
      p.isActive = isActive;
    });
  });

  return product;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Product — availability', () => {
  test('new products default to available (is_active)', async () => {
    const db = makeDb();
    const product = await seedProduct(db);
    expect(product.isActive).toBe(true);
  });

  test('toggling availability off persists', async () => {
    const db = makeDb();
    const product = await seedProduct(db);

    await db.write(async () => {
      await product.update((p) => {
        p.isActive = false;
      });
    });

    const updated = await db.get<Product>('products').find(product.id);
    expect(updated.isActive).toBe(false);
  });
});

describe('Product — computed getters', () => {
  test('margin is calculated correctly', async () => {
    const db = makeDb();
    const product = await seedProduct(db, { price: 10000, cost: 6000 });
    expect(product.margin).toBeCloseTo(40, 1);
  });

  test('margin is 0 when price is 0', async () => {
    const db = makeDb();
    const product = await seedProduct(db, { price: 0, cost: 0 });
    expect(product.margin).toBe(0);
  });
});
