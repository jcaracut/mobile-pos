import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, relation, children } from '@nozbe/watermelondb/decorators';
import type { Category } from './Category';
import type { Inventory } from './Inventory';
import type { OrderItem } from './OrderItem';

export class Product extends Model {
  static table = 'products';
  static associations = {
    categories: { type: 'belongs_to' as const, key: 'category_id' },
    inventory: { type: 'has_many' as const, foreignKey: 'product_id' },
    order_items: { type: 'has_many' as const, foreignKey: 'product_id' },
  };

  @field('name') name!: string;
  @field('sku') sku!: string;
  @field('barcode') barcode!: string | null;
  @field('description') description!: string | null;
  @field('price') price!: number;
  @field('cost') cost!: number;
  @field('category_id') categoryId!: string | null;
  @field('image_url') imageUrl!: string | null;
  @field('is_active') isActive!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('categories', 'category_id') category!: Query<Category>;
  @children('inventory') inventory!: Query<Inventory>;
  @children('order_items') orderItems!: Query<OrderItem>;

  get margin(): number {
    return this.price > 0 ? ((this.price - this.cost) / this.price) * 100 : 0;
  }
}
