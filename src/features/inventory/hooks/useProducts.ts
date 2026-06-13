import { useState, useEffect, useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@core/database';
import { Product, Inventory, Category } from '@core/database/models';
import { resolveStockStatus } from '../types';
import type { ProductWithStock, InventoryFilter, InventorySort } from '../types';

interface UseProductsReturn {
  products: ProductWithStock[];
  isLoading: boolean;
  refresh: () => void;
}

/**
 * Reactive list of products joined with their inventory record and category name.
 * Re-renders only when the products, inventory, or categories table changes.
 */
export function useProducts(
  filter: InventoryFilter = {},
  sort: InventorySort = { field: 'name', direction: 'asc' }
): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Map<string, Inventory>>(new Map());
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [_tick, setTick] = useState(0);

  // Observe products table.
  useEffect(() => {
    const constraints = [Q.where('is_active', filter.isActive ?? true)];
    if (filter.categoryId) constraints.push(Q.where('category_id', filter.categoryId));

    const sub = database
      .get<Product>('products')
      .query(...constraints)
      .observe()
      .subscribe((rows) => {
        setProducts(rows);
        setIsLoading(false);
      });

    return () => sub.unsubscribe();
  }, [filter.isActive, filter.categoryId]);

  // Observe inventory table.
  useEffect(() => {
    const sub = database
      .get<Inventory>('inventory')
      .query()
      .observe()
      .subscribe((rows) => {
        setInventoryMap(new Map(rows.map((r) => [r.productId, r])));
      });

    return () => sub.unsubscribe();
  }, []);

  // Observe categories table.
  useEffect(() => {
    const sub = database
      .get<Category>('categories')
      .query()
      .observe()
      .subscribe((rows) => {
        setCategoryMap(new Map(rows.map((r) => [r.id, r.name])));
      });

    return () => sub.unsubscribe();
  }, []);

  const result = useMemo<ProductWithStock[]>(() => {
    let list: ProductWithStock[] = products.map((product) => ({
      product,
      inventory: inventoryMap.get(product.id) ?? null,
      categoryName: product.categoryId ? (categoryMap.get(product.categoryId) ?? null) : null,
    }));

    // Client-side filters that WatermelonDB can't express natively.
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        ({ product }) =>
          product.name.toLowerCase().includes(q) ||
          product.sku.toLowerCase().includes(q) ||
          (product.barcode ?? '').includes(q)
      );
    }

    if (filter.stockStatus) {
      list = list.filter(
        ({ inventory }) => resolveStockStatus(inventory) === filter.stockStatus
      );
    }

    // Sort.
    list.sort((a, b) => {
      let diff = 0;
      switch (sort.field) {
        case 'name':
          diff = a.product.name.localeCompare(b.product.name);
          break;
        case 'price':
          diff = a.product.price - b.product.price;
          break;
        case 'quantity':
          diff = (a.inventory?.quantity ?? 0) - (b.inventory?.quantity ?? 0);
          break;
        case 'createdAt':
          diff = a.product.createdAt.getTime() - b.product.createdAt.getTime();
          break;
      }
      return sort.direction === 'desc' ? -diff : diff;
    });

    return list;
  }, [products, inventoryMap, categoryMap, filter, sort]);

  return { products: result, isLoading, refresh: () => setTick((t) => t + 1) };
}
