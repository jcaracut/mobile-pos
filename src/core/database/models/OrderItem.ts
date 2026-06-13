import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type { Order } from './Order';
import type { Product } from './Product';

export class OrderItem extends Model {
  static table = 'order_items';
  static associations = {
    orders: { type: 'belongs_to' as const, key: 'order_id' },
    products: { type: 'belongs_to' as const, key: 'product_id' },
  };

  @field('order_id') orderId!: string;
  @field('product_id') productId!: string;
  @field('product_name') productName!: string;
  @field('quantity') quantity!: number;
  @field('unit_price') unitPrice!: number;
  @field('discount_amount') discountAmount!: number;
  @field('total') total!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('orders', 'order_id') order!: Query<Order>;
  @relation('products', 'product_id') product!: Query<Product>;
}
