import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';
import type { Product } from './Product';

export class Category extends Model {
  static table = 'categories';
  static associations = {
    products: { type: 'has_many' as const, foreignKey: 'category_id' },
  };

  @field('name') name!: string;
  @field('color') color!: string | null;
  @field('icon') icon!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('products') products!: Query<Product>;
}
