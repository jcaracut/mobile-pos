import { useState, useEffect, useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@core/database';
import { Product, Category } from '@core/database/models';
import type { ProductRow, InventoryFilter, InventorySort } from '../types';

interface UseProductsReturn {
  products: ProductRow[];
  isLoading: boolean;
  refresh: () => void;
}

/**
 * Reactive list of products joined with their category name.
 * Re-renders only when the products or categories table changes.
 */
export function useProducts(
  filter: InventoryFilter = {},
  sort: InventorySort = { field: 'name', direction: 'asc' }
): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [_tick, setTick] = useState(0);

  // Observe products table.
  useEffect(() => {
    const constraints = [];
    if (filter.isActive !== undefined) constraints.push(Q.where('is_active', filter.isActive));
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

  const result = useMemo<ProductRow[]>(() => {
    let list: ProductRow[] = products.map((product) => ({
      product,
      categoryName: product.categoryId ? (categoryMap.get(product.categoryId) ?? null) : null,
    }));

    // Client-side search that WatermelonDB can't express natively.
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        ({ product }) =>
          product.name.toLowerCase().includes(q) ||
          product.sku.toLowerCase().includes(q) ||
          (product.barcode ?? '').includes(q)
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
        case 'createdAt':
          diff = a.product.createdAt.getTime() - b.product.createdAt.getTime();
          break;
      }
      return sort.direction === 'desc' ? -diff : diff;
    });

    return list;
  }, [products, categoryMap, filter, sort]);

  return { products: result, isLoading, refresh: () => setTick((t) => t + 1) };
}
