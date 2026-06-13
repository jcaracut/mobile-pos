import type { Product } from '@core/database/models/Product';
import type { Inventory } from '@core/database/models/Inventory';

// ── Write params ──────────────────────────────────────────────────────────────

export interface CreateProductParams {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  /** Integer cents */
  price: number;
  /** Integer cents */
  cost: number;
  categoryId?: string;
  imageUrl?: string;
  initialQuantity: number;
  lowStockThreshold: number;
  location?: string;
}

export interface UpdateProductParams {
  name?: string;
  sku?: string;
  barcode?: string | null;
  description?: string | null;
  price?: number;
  cost?: number;
  categoryId?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface AdjustStockParams {
  productId: string;
  /** Positive = restock, negative = manual deduction */
  delta: number;
  reason: StockAdjustmentReason;
  note?: string;
}

export type StockAdjustmentReason =
  | 'restock'
  | 'damage'
  | 'theft'
  | 'return'
  | 'audit_correction'
  | 'transfer';

export interface CreateCategoryParams {
  name: string;
  color?: string;
  icon?: string;
}

// ── Read projections ──────────────────────────────────────────────────────────

/** Flat read projection used in lists — avoids async relation traversal in UI. */
export interface ProductWithStock {
  product: Product;
  inventory: Inventory | null;
  categoryName: string | null;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export function resolveStockStatus(inv: Inventory | null): StockStatus {
  if (!inv || inv.quantity <= 0) return 'out_of_stock';
  if (inv.isLowStock) return 'low_stock';
  return 'in_stock';
}

// ── Filter / sort ─────────────────────────────────────────────────────────────

export interface InventoryFilter {
  search?: string;
  categoryId?: string;
  stockStatus?: StockStatus;
  isActive?: boolean;
}

export type InventorySortField = 'name' | 'price' | 'quantity' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface InventorySort {
  field: InventorySortField;
  direction: SortDirection;
}
