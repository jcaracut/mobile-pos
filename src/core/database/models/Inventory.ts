import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type { Product } from './Product';

export class Inventory extends Model {
  static table = 'inventory';
  static associations = {
    products: { type: 'belongs_to' as const, key: 'product_id' },
  };

  @field('product_id') productId!: string;
  @field('quantity') quantity!: number;
  @field('low_stock_threshold') lowStockThreshold!: number;
  @field('location') location!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('products', 'product_id') product!: Query<Product>;

  get isLowStock(): boolean {
    return this.quantity <= this.lowStockThreshold;
  }

  get isOutOfStock(): boolean {
    return this.quantity <= 0;
  }
}
