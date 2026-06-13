export { InventoryService } from './services/InventoryService';
export { CategoryService } from './services/CategoryService';
export { useProducts } from './hooks/useProducts';
export { useLowStockAlerts } from './hooks/useLowStockAlerts';
export { useCategories } from './hooks/useCategories';
export type {
  CreateProductParams,
  UpdateProductParams,
  AdjustStockParams,
  StockAdjustmentReason,
  CreateCategoryParams,
  ProductWithStock,
  StockStatus,
  InventoryFilter,
  InventorySort,
  InventorySortField,
  SortDirection,
} from './types';
export { resolveStockStatus } from './types';
