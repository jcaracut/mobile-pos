import type { Product } from '@core/database/models/Product';

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

export interface CreateCategoryParams {
  name: string;
  color?: string;
  icon?: string;
}

// ── Read projections ──────────────────────────────────────────────────────────

/** Flat read projection used in lists — avoids async relation traversal in UI. */
export interface ProductRow {
  product: Product;
  categoryName: string | null;
}

// ── Filter / sort ─────────────────────────────────────────────────────────────

export interface InventoryFilter {
  search?: string;
  categoryId?: string;
  /** When set, restricts to products with this availability (is_active). */
  isActive?: boolean;
}

export type InventorySortField = 'name' | 'price' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface InventorySort {
  field: InventorySortField;
  direction: SortDirection;
}
