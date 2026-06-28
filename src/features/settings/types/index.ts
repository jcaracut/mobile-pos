import type { OrderStatus, PaymentMethod, PaymentStatus } from '@core/database/models/Order';

/**
 * Backup file contract.
 *
 * A backup is a single self-describing JSON document. The `format` discriminator
 * lets the importer reject files that are valid JSON but not ours, and `version`
 * gives us a hook for migrating older backups should the shape ever change.
 */
export const BACKUP_FORMAT = 'tugkaran-pos-backup';
export const BACKUP_VERSION = 1;

/** Every serialized record keeps its original id and timestamps so relations and history survive a round-trip. */
export interface BaseRecord {
  id: string;
  createdAt: number; // epoch milliseconds
  updatedAt: number;
}

export interface CategoryRecord extends BaseRecord {
  name: string;
  color: string | null;
  icon: string | null;
}

export interface ProductRecord extends BaseRecord {
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  price: number;
  cost: number;
  categoryId: string | null;
  imageUrl: string | null;
  isActive: boolean;
}

export interface InventoryRecord extends BaseRecord {
  productId: string;
  quantity: number;
  lowStockThreshold: number;
  location: string | null;
}

export interface CustomerRecord extends BaseRecord {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  totalSpent: number;
  visitCount: number;
}

export interface OrderRecord extends BaseRecord {
  orderNumber: string;
  customerId: string | null;
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes: string | null;
}

export interface OrderItemRecord extends BaseRecord {
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  total: number;
}

/** Tables are listed in dependency order — parents before the rows that reference them. */
export interface BackupData {
  categories: CategoryRecord[];
  products: ProductRecord[];
  inventory: InventoryRecord[];
  customers: CustomerRecord[];
  orders: OrderRecord[];
  orderItems: OrderItemRecord[];
}

export type TableKey = keyof BackupData;

export interface ExportBundle {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string; // ISO 8601
  schemaVersion: number;
  data: BackupData;
}

export type ExportFormat = 'json' | 'excel';

/** Per-table counts returned after an import so the UI can report what changed. */
export type ImportCounts = Record<TableKey, { created: number; updated: number }>;

export interface ImportResult {
  counts: ImportCounts;
  totalCreated: number;
  totalUpdated: number;
}
