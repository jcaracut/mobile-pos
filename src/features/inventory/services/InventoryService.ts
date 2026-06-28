import { Q } from '@nozbe/watermelondb';
import { database } from '@core/database';
import { Product } from '@core/database/models';
import type { CreateProductParams, UpdateProductParams } from '../types';

export class InventoryService {
  // ── Products ────────────────────────────────────────────────────────────────

  static async createProduct(params: CreateProductParams): Promise<Product> {
    return database.write(async () => {
      return database.get<Product>('products').create((p) => {
        p.name = params.name;
        p.sku = params.sku;
        p.barcode = params.barcode ?? null;
        p.description = params.description ?? null;
        p.price = params.price;
        p.cost = params.cost;
        p.categoryId = params.categoryId ?? null;
        p.imageUrl = params.imageUrl ?? null;
        p.isActive = true;
      });
    });
  }

  static async updateProduct(
    productId: string,
    params: UpdateProductParams
  ): Promise<Product> {
    return database.write(async () => {
      const product = await database.get<Product>('products').find(productId);
      await product.update((p) => {
        if (params.name !== undefined) p.name = params.name;
        if (params.sku !== undefined) p.sku = params.sku;
        if (params.barcode !== undefined) p.barcode = params.barcode;
        if (params.description !== undefined) p.description = params.description;
        if (params.price !== undefined) p.price = params.price;
        if (params.cost !== undefined) p.cost = params.cost;
        if (params.categoryId !== undefined) p.categoryId = params.categoryId;
        if (params.imageUrl !== undefined) p.imageUrl = params.imageUrl;
        if (params.isActive !== undefined) p.isActive = params.isActive;
      });
      return product;
    });
  }

  /**
   * Toggles whether a product is available for sale. Unavailable products are
   * hidden from the POS but remain visible and editable in the inventory list.
   */
  static async setAvailability(productId: string, isAvailable: boolean): Promise<Product> {
    return database.write(async () => {
      const product = await database.get<Product>('products').find(productId);
      await product.update((p) => {
        p.isActive = isAvailable;
      });
      return product;
    });
  }

  // ── Reads (used by hooks that need one-time fetches) ─────────────────────────

  static async findByBarcode(barcode: string): Promise<Product | null> {
    const results = await database
      .get<Product>('products')
      .query(Q.where('barcode', barcode), Q.where('is_active', true))
      .fetch();
    return results[0] ?? null;
  }

  static async findBySku(sku: string): Promise<Product | null> {
    const results = await database
      .get<Product>('products')
      .query(Q.where('sku', sku))
      .fetch();
    return results[0] ?? null;
  }
}
