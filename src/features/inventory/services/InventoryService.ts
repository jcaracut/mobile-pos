import { Q } from '@nozbe/watermelondb';
import { database } from '@core/database';
import { Product, Inventory } from '@core/database/models';
import type {
  CreateProductParams,
  UpdateProductParams,
  AdjustStockParams,
  ProductWithStock,
} from '../types';

export class InventoryService {
  // ── Products ────────────────────────────────────────────────────────────────

  static async createProduct(params: CreateProductParams): Promise<Product> {
    return database.write(async () => {
      const product = await database.get<Product>('products').create((p) => {
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

      await database.get<Inventory>('inventory').create((inv) => {
        inv.productId = product.id;
        inv.quantity = params.initialQuantity;
        inv.lowStockThreshold = params.lowStockThreshold;
        inv.location = params.location ?? null;
      });

      return product;
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
   * Soft-deletes a product and its inventory record.
   * Does not hard-delete so order_items history is preserved.
   */
  static async archiveProduct(productId: string): Promise<void> {
    await database.write(async () => {
      const product = await database.get<Product>('products').find(productId);
      await product.update((p) => {
        p.isActive = false;
      });
    });
  }

  // ── Stock adjustments ────────────────────────────────────────────────────────

  static async adjustStock(params: AdjustStockParams): Promise<Inventory> {
    return database.write(async () => {
      const invRecords = await database
        .get<Inventory>('inventory')
        .query(Q.where('product_id', params.productId))
        .fetch();

      const inv = invRecords[0];
      if (!inv) {
        throw new Error(`No inventory record for product ${params.productId}`);
      }

      await inv.update((record) => {
        record.quantity = Math.max(0, record.quantity + params.delta);
      });

      return inv;
    });
  }

  static async setStockLevel(productId: string, quantity: number): Promise<Inventory> {
    return database.write(async () => {
      const invRecords = await database
        .get<Inventory>('inventory')
        .query(Q.where('product_id', productId))
        .fetch();

      const inv = invRecords[0];
      if (!inv) throw new Error(`No inventory record for product ${productId}`);

      await inv.update((record) => {
        record.quantity = Math.max(0, quantity);
      });

      return inv;
    });
  }

  static async updateThreshold(
    productId: string,
    lowStockThreshold: number
  ): Promise<Inventory> {
    return database.write(async () => {
      const invRecords = await database
        .get<Inventory>('inventory')
        .query(Q.where('product_id', productId))
        .fetch();

      const inv = invRecords[0];
      if (!inv) throw new Error(`No inventory record for product ${productId}`);

      await inv.update((record) => {
        record.lowStockThreshold = lowStockThreshold;
      });

      return inv;
    });
  }

  // ── Reads (used by hooks that need one-time fetches) ─────────────────────────

  static async getLowStockProducts(): Promise<ProductWithStock[]> {
    const products = await database
      .get<Product>('products')
      .query(Q.where('is_active', true))
      .fetch();

    const invRecords = await database.get<Inventory>('inventory').query().fetch();

    const invByProduct = new Map(invRecords.map((i) => [i.productId, i]));

    return products
      .map((product) => ({
        product,
        inventory: invByProduct.get(product.id) ?? null,
        categoryName: null, // resolved reactively in hooks via observation
      }))
      .filter(({ inventory }) => inventory !== null && inventory.isLowStock);
  }

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
