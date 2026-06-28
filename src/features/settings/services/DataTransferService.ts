import type { Model } from '@nozbe/watermelondb';
import type { Collection, Database } from '@nozbe/watermelondb';
import * as XLSX from 'xlsx';

import { database } from '@core/database';
import { schema } from '@core/database/schema';
import type { Category, Customer, Inventory, Order, OrderItem, Product } from '@core/database/models';

import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupData,
  type BaseRecord,
  type CategoryRecord,
  type CustomerRecord,
  type ExportBundle,
  type ImportCounts,
  type ImportResult,
  type InventoryRecord,
  type OrderItemRecord,
  type OrderRecord,
  type ProductRecord,
  type TableKey,
} from '../types';

/** A WatermelonDB raw row keyed by snake_case column name. */
type RawValues = Record<string, string | number | boolean | null>;

/**
 * Reads, serializes, and restores the full local database.
 *
 * Export produces a single self-contained {@link ExportBundle}; import merges a
 * bundle back in by primary id (upsert), so re-importing a backup is idempotent
 * and never duplicates rows. Excel output is read-only — only JSON can be imported.
 *
 * The `db` parameter defaults to the app singleton; tests inject an isolated database.
 */
export class DataTransferService {
  // ── Export ──────────────────────────────────────────────────────────────────

  static async exportBundle(db: Database = database): Promise<ExportBundle> {
    const [categories, products, inventory, customers, orders, orderItems] = await Promise.all([
      db.get<Category>('categories').query().fetch(),
      db.get<Product>('products').query().fetch(),
      db.get<Inventory>('inventory').query().fetch(),
      db.get<Customer>('customers').query().fetch(),
      db.get<Order>('orders').query().fetch(),
      db.get<OrderItem>('order_items').query().fetch(),
    ]);

    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      schemaVersion: schema.version,
      data: {
        categories: categories.map(toCategoryRecord),
        products: products.map(toProductRecord),
        inventory: inventory.map(toInventoryRecord),
        customers: customers.map(toCustomerRecord),
        orders: orders.map(toOrderRecord),
        orderItems: orderItems.map(toOrderItemRecord),
      },
    };
  }

  static serialize(bundle: ExportBundle): string {
    return JSON.stringify(bundle, null, 2);
  }

  /** Builds an .xlsx workbook (one sheet per table) and returns its raw bytes, ready to write to disk. */
  static toExcelBytes(bundle: ExportBundle): Uint8Array {
    const workbook = XLSX.utils.book_new();
    appendSheet(workbook, 'Categories', bundle.data.categories);
    appendSheet(workbook, 'Products', bundle.data.products);
    appendSheet(workbook, 'Inventory', bundle.data.inventory);
    appendSheet(workbook, 'Customers', bundle.data.customers);
    appendSheet(workbook, 'Orders', bundle.data.orders);
    appendSheet(workbook, 'OrderItems', bundle.data.orderItems);
    // `type: 'array'` yields an ArrayBuffer (XLSX.write is typed `any`); wrap it for the file API.
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    return new Uint8Array(buffer);
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  /** Parses and validates raw JSON text into a trusted bundle, or throws a user-facing error. */
  static parse(raw: string): ExportBundle {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('The selected file is not valid JSON.');
    }
    return DataTransferService.validateBundle(parsed);
  }

  static validateBundle(value: unknown): ExportBundle {
    if (!isObject(value)) throw new Error('Backup file is empty or malformed.');
    if (value.format !== BACKUP_FORMAT) throw new Error('This file is not a Tugkaran backup.');
    if (typeof value.version !== 'number') throw new Error('Backup is missing a version number.');
    if (value.version > BACKUP_VERSION) {
      throw new Error(`Backup version ${value.version} is newer than this app supports.`);
    }
    if (!isObject(value.data)) throw new Error('Backup contains no data.');
    const data = value.data;
    return {
      format: BACKUP_FORMAT,
      version: value.version,
      exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : '',
      schemaVersion: typeof value.schemaVersion === 'number' ? value.schemaVersion : 0,
      data: {
        categories: requireRows<CategoryRecord>(data, 'categories'),
        products: requireRows<ProductRecord>(data, 'products'),
        inventory: requireRows<InventoryRecord>(data, 'inventory'),
        customers: requireRows<CustomerRecord>(data, 'customers'),
        orders: requireRows<OrderRecord>(data, 'orders'),
        orderItems: requireRows<OrderItemRecord>(data, 'orderItems'),
      },
    };
  }

  static async importBundle(bundle: ExportBundle, db: Database = database): Promise<ImportResult> {
    let counts: ImportCounts = emptyCounts();
    await db.write(async () => {
      const prepared = await DataTransferService.prepareImport(bundle.data, db);
      counts = prepared.counts;
      await db.batch(...prepared.models);
    });
    return summarize(counts);
  }

  // ── Internals ─────────────────────────────────────────────────────────────────

  /** Prepares (but does not commit) all create/update operations. Must run inside a writer. */
  private static async prepareImport(
    data: BackupData,
    db: Database
  ): Promise<{ models: Model[]; counts: ImportCounts }> {
    const counts = emptyCounts();
    const models: Model[] = [];
    const collect = async <TModel extends Model, TRecord extends BaseRecord>(
      key: TableKey,
      table: string,
      records: ReadonlyArray<TRecord>,
      toRaw: (record: TRecord) => RawValues,
      assign: (model: TModel, record: TRecord) => void
    ): Promise<void> => {
      const result = await DataTransferService.upsert<TModel, TRecord>(db, table, records, toRaw, assign);
      models.push(...result.models);
      counts[key] = { created: result.created, updated: result.updated };
    };

    await collect<Category, CategoryRecord>('categories', 'categories', data.categories, categoryToRaw, assignCategory);
    await collect<Product, ProductRecord>('products', 'products', data.products, productToRaw, assignProduct);
    await collect<Inventory, InventoryRecord>('inventory', 'inventory', data.inventory, inventoryToRaw, assignInventory);
    await collect<Customer, CustomerRecord>('customers', 'customers', data.customers, customerToRaw, assignCustomer);
    await collect<Order, OrderRecord>('orders', 'orders', data.orders, orderToRaw, assignOrder);
    await collect<OrderItem, OrderItemRecord>('orderItems', 'order_items', data.orderItems, orderItemToRaw, assignOrderItem);

    return { models, counts };
  }

  /** Upserts one table by id: existing rows are updated in place, unknown rows created with their original id. */
  private static async upsert<TModel extends Model, TRecord extends BaseRecord>(
    db: Database,
    table: string,
    records: ReadonlyArray<TRecord>,
    toRaw: (record: TRecord) => RawValues,
    assign: (model: TModel, record: TRecord) => void
  ): Promise<{ models: Model[]; created: number; updated: number }> {
    const collection: Collection<TModel> = db.get<TModel>(table);
    const existing = await collection.query().fetch();
    const byId = new Map(existing.map((m) => [m.id, m]));

    const models: Model[] = [];
    let created = 0;
    let updated = 0;
    for (const record of records) {
      const current = byId.get(record.id);
      if (current) {
        models.push(current.prepareUpdate((m) => assign(m, record)));
        updated += 1;
      } else {
        models.push(collection.prepareCreateFromDirtyRaw(toRaw(record)));
        created += 1;
      }
    }
    return { models, created, updated };
  }
}

// ── Model → record (export) ─────────────────────────────────────────────────────

function toCategoryRecord(c: Category): CategoryRecord {
  return { id: c.id, name: c.name, color: c.color, icon: c.icon, ...stamps(c) };
}

function toProductRecord(p: Product): ProductRecord {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    description: p.description,
    price: p.price,
    cost: p.cost,
    categoryId: p.categoryId,
    imageUrl: p.imageUrl,
    isActive: p.isActive,
    ...stamps(p),
  };
}

function toInventoryRecord(i: Inventory): InventoryRecord {
  return {
    id: i.id,
    productId: i.productId,
    quantity: i.quantity,
    lowStockThreshold: i.lowStockThreshold,
    location: i.location,
    ...stamps(i),
  };
}

function toCustomerRecord(c: Customer): CustomerRecord {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    address: c.address,
    totalSpent: c.totalSpent,
    visitCount: c.visitCount,
    ...stamps(c),
  };
}

function toOrderRecord(o: Order): OrderRecord {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerId: o.customerId,
    status: o.status,
    subtotal: o.subtotal,
    discountAmount: o.discountAmount,
    taxAmount: o.taxAmount,
    total: o.total,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    notes: o.notes,
    ...stamps(o),
  };
}

function toOrderItemRecord(oi: OrderItem): OrderItemRecord {
  return {
    id: oi.id,
    orderId: oi.orderId,
    productId: oi.productId,
    productName: oi.productName,
    quantity: oi.quantity,
    unitPrice: oi.unitPrice,
    discountAmount: oi.discountAmount,
    total: oi.total,
    ...stamps(oi),
  };
}

function stamps(model: { createdAt: Date; updatedAt: Date }): { createdAt: number; updatedAt: number } {
  return { createdAt: model.createdAt.getTime(), updatedAt: model.updatedAt.getTime() };
}

// ── Record → raw (import: create new rows preserving id and timestamps) ──────────

function rawStamps(record: BaseRecord): RawValues {
  return { id: record.id, created_at: record.createdAt, updated_at: record.updatedAt };
}

function categoryToRaw(r: CategoryRecord): RawValues {
  return { ...rawStamps(r), name: r.name, color: r.color, icon: r.icon };
}

function productToRaw(r: ProductRecord): RawValues {
  return {
    ...rawStamps(r),
    name: r.name,
    sku: r.sku,
    barcode: r.barcode,
    description: r.description,
    price: r.price,
    cost: r.cost,
    category_id: r.categoryId,
    image_url: r.imageUrl,
    is_active: r.isActive,
  };
}

function inventoryToRaw(r: InventoryRecord): RawValues {
  return {
    ...rawStamps(r),
    product_id: r.productId,
    quantity: r.quantity,
    low_stock_threshold: r.lowStockThreshold,
    location: r.location,
  };
}

function customerToRaw(r: CustomerRecord): RawValues {
  return {
    ...rawStamps(r),
    name: r.name,
    email: r.email,
    phone: r.phone,
    address: r.address,
    total_spent: r.totalSpent,
    visit_count: r.visitCount,
  };
}

function orderToRaw(r: OrderRecord): RawValues {
  return {
    ...rawStamps(r),
    order_number: r.orderNumber,
    customer_id: r.customerId,
    status: r.status,
    subtotal: r.subtotal,
    discount_amount: r.discountAmount,
    tax_amount: r.taxAmount,
    total: r.total,
    payment_method: r.paymentMethod,
    payment_status: r.paymentStatus,
    notes: r.notes,
  };
}

function orderItemToRaw(r: OrderItemRecord): RawValues {
  return {
    ...rawStamps(r),
    order_id: r.orderId,
    product_id: r.productId,
    product_name: r.productName,
    quantity: r.quantity,
    unit_price: r.unitPrice,
    discount_amount: r.discountAmount,
    total: r.total,
  };
}

// ── Record → model setters (import: update existing rows in place) ───────────────

function assignCategory(m: Category, r: CategoryRecord): void {
  m.name = r.name;
  m.color = r.color;
  m.icon = r.icon;
}

function assignProduct(m: Product, r: ProductRecord): void {
  m.name = r.name;
  m.sku = r.sku;
  m.barcode = r.barcode;
  m.description = r.description;
  m.price = r.price;
  m.cost = r.cost;
  m.categoryId = r.categoryId;
  m.imageUrl = r.imageUrl;
  m.isActive = r.isActive;
}

function assignInventory(m: Inventory, r: InventoryRecord): void {
  m.productId = r.productId;
  m.quantity = r.quantity;
  m.lowStockThreshold = r.lowStockThreshold;
  m.location = r.location;
}

function assignCustomer(m: Customer, r: CustomerRecord): void {
  m.name = r.name;
  m.email = r.email;
  m.phone = r.phone;
  m.address = r.address;
  m.totalSpent = r.totalSpent;
  m.visitCount = r.visitCount;
}

function assignOrder(m: Order, r: OrderRecord): void {
  m.orderNumber = r.orderNumber;
  m.customerId = r.customerId;
  m.status = r.status;
  m.subtotal = r.subtotal;
  m.discountAmount = r.discountAmount;
  m.taxAmount = r.taxAmount;
  m.total = r.total;
  m.paymentMethod = r.paymentMethod;
  m.paymentStatus = r.paymentStatus;
  m.notes = r.notes;
}

function assignOrderItem(m: OrderItem, r: OrderItemRecord): void {
  m.orderId = r.orderId;
  m.productId = r.productId;
  m.productName = r.productName;
  m.quantity = r.quantity;
  m.unitPrice = r.unitPrice;
  m.discountAmount = r.discountAmount;
  m.total = r.total;
}

// ── Validation & misc helpers ───────────────────────────────────────────────────

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Returns a typed view of one table's rows, defaulting to empty when the table is absent. */
function requireRows<T extends BaseRecord>(data: Record<string, unknown>, key: string): T[] {
  const value = data[key];
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`Backup field "${key}" must be a list.`);
  for (const row of value) {
    if (!isObject(row) || typeof row.id !== 'string') {
      throw new Error(`Backup field "${key}" contains an invalid record.`);
    }
  }
  // Shape is verified above; column values are re-sanitized by WatermelonDB on insert.
  return value as T[];
}

function appendSheet(workbook: XLSX.WorkBook, name: string, rows: ReadonlyArray<BaseRecord>): void {
  // Epoch timestamps are unreadable in a spreadsheet — surface ISO strings instead.
  const readable = rows.map((row) => ({
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  }));
  const sheet = XLSX.utils.json_to_sheet(readable);
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

const TABLE_KEYS: ReadonlyArray<TableKey> = [
  'categories',
  'products',
  'inventory',
  'customers',
  'orders',
  'orderItems',
];

function emptyCounts(): ImportCounts {
  const counts = {} as ImportCounts;
  for (const key of TABLE_KEYS) counts[key] = { created: 0, updated: 0 };
  return counts;
}

function summarize(counts: ImportCounts): ImportResult {
  let totalCreated = 0;
  let totalUpdated = 0;
  for (const key of TABLE_KEYS) {
    totalCreated += counts[key].created;
    totalUpdated += counts[key].updated;
  }
  return { counts, totalCreated, totalUpdated };
}
