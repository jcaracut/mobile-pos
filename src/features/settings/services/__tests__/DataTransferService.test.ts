/**
 * DataTransferService unit tests.
 *
 * Uses the WatermelonDB in-memory mock adapter (no SQLite/AsyncStorage touched).
 * The service's `db` parameter lets us inject an isolated database per test.
 */
// DataTransferService transitively imports the @core/database singleton, which
// pulls in AsyncStorage. Mock it so importing the service doesn't hit a native module.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from '@core/database/schema';
import { Category, Customer, Inventory, Order, OrderItem, Product } from '@core/database/models';
import { DataTransferService } from '../DataTransferService';
import { BACKUP_FORMAT, BACKUP_VERSION, type ExportBundle } from '../../types';

// A fresh in-memory LokiJS database per test (no persistence, no SQLite).
function makeDb(): Database {
  const adapter = new LokiJSAdapter({
    schema,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
  });
  return new Database({
    adapter,
    modelClasses: [Product, Order, OrderItem, Customer, Category, Inventory],
  });
}

/** Seeds one category and one product (linked) and returns their ids. */
async function seed(db: Database): Promise<{ categoryId: string; productId: string }> {
  let categoryId = '';
  let productId = '';
  await db.write(async () => {
    const category = await db.get<Category>('categories').create((c) => {
      c.name = 'Beverages';
      c.color = '#2196F3';
      c.icon = '🥤';
    });
    categoryId = category.id;
    const product = await db.get<Product>('products').create((p) => {
      p.name = 'Espresso';
      p.sku = 'BEV-001';
      p.price = 7500;
      p.cost = 4500;
      p.categoryId = category.id;
      p.isActive = true;
    });
    productId = product.id;
  });
  return { categoryId, productId };
}

describe('DataTransferService — export', () => {
  test('exportBundle captures records with their ids and a backup envelope', async () => {
    const db = makeDb();
    const { categoryId, productId } = await seed(db);

    const bundle = await DataTransferService.exportBundle(db);

    expect(bundle.format).toBe(BACKUP_FORMAT);
    expect(bundle.version).toBe(BACKUP_VERSION);
    expect(bundle.data.categories.map((c) => c.id)).toEqual([categoryId]);
    expect(bundle.data.products.map((p) => p.id)).toEqual([productId]);
    expect(bundle.data.products[0]?.categoryId).toBe(categoryId);
  });

  test('serialize round-trips through parse', () => {
    const bundle: ExportBundle = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      schemaVersion: schema.version,
      data: { categories: [], products: [], inventory: [], customers: [], orders: [], orderItems: [] },
    };
    const parsed = DataTransferService.parse(DataTransferService.serialize(bundle));
    expect(parsed.format).toBe(BACKUP_FORMAT);
  });
});

describe('DataTransferService — import', () => {
  test('restores records into a fresh database preserving id and timestamps', async () => {
    const source = makeDb();
    const { productId } = await seed(source);
    const bundle = await DataTransferService.exportBundle(source);
    const originalCreatedAt = bundle.data.products[0]?.createdAt;

    const target = makeDb();
    const result = await DataTransferService.importBundle(bundle, target);

    expect(result.totalCreated).toBe(2); // 1 category + 1 product
    expect(result.totalUpdated).toBe(0);

    const restored = await target.get<Product>('products').find(productId);
    expect(restored.name).toBe('Espresso');
    expect(restored.createdAt.getTime()).toBe(originalCreatedAt);
  });

  test('re-importing the same bundle updates in place rather than duplicating', async () => {
    const db = makeDb();
    await seed(db);
    const bundle = await DataTransferService.exportBundle(db);

    const result = await DataTransferService.importBundle(bundle, db);

    expect(result.totalCreated).toBe(0);
    expect(result.totalUpdated).toBe(2);
    const count = await db.get<Product>('products').query().fetchCount();
    expect(count).toBe(1);
  });
});

describe('DataTransferService — validation', () => {
  test('rejects files that are not Tugkaran backups', () => {
    expect(() => DataTransferService.validateBundle({ foo: 'bar' })).toThrow(/not a Tugkaran backup/);
  });

  test('rejects backups newer than the supported version', () => {
    expect(() =>
      DataTransferService.validateBundle({ format: BACKUP_FORMAT, version: BACKUP_VERSION + 1, data: {} })
    ).toThrow(/newer than this app supports/);
  });

  test('rejects malformed JSON text', () => {
    expect(() => DataTransferService.parse('{ not json')).toThrow(/not valid JSON/);
  });

  test('rejects a table whose rows are not objects with string ids', () => {
    const bad = { format: BACKUP_FORMAT, version: BACKUP_VERSION, data: { products: [{ name: 'x' }] } };
    expect(() => DataTransferService.validateBundle(bad)).toThrow(/invalid record/);
  });
});
