import { useState, useEffect } from 'react';
import { database } from '@core/database';
import { Inventory, Product } from '@core/database/models';
import type { ProductWithStock } from '../types';

interface UseLowStockAlertsReturn {
  alerts: ProductWithStock[];
  outOfStock: ProductWithStock[];
  isLoading: boolean;
}

/**
 * Reactively watches inventory for low-stock and out-of-stock conditions.
 * Updates automatically whenever the inventory table changes.
 */
export function useLowStockAlerts(): UseLowStockAlertsReturn {
  const [inventoryRows, setInventoryRows] = useState<Inventory[]>([]);
  const [productMap, setProductMap] = useState<Map<string, Product>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const invSub = database
      .get<Inventory>('inventory')
      .query()
      .observe()
      .subscribe((rows) => {
        setInventoryRows(rows);
        setIsLoading(false);
      });

    return () => invSub.unsubscribe();
  }, []);

  useEffect(() => {
    const productSub = database
      .get<Product>('products')
      .query()
      .observe()
      .subscribe((rows) => {
        setProductMap(new Map(rows.map((p) => [p.id, p])));
      });

    return () => productSub.unsubscribe();
  }, []);

  const lowStock: ProductWithStock[] = [];
  const outOfStock: ProductWithStock[] = [];

  for (const inv of inventoryRows) {
    const product = productMap.get(inv.productId);
    if (!product || !product.isActive) continue;

    const entry: ProductWithStock = { product, inventory: inv, categoryName: null };

    if (inv.isOutOfStock) {
      outOfStock.push(entry);
    } else if (inv.isLowStock) {
      lowStock.push(entry);
    }
  }

  lowStock.sort((a, b) => (a.inventory?.quantity ?? 0) - (b.inventory?.quantity ?? 0));

  return { alerts: lowStock, outOfStock, isLoading };
}
