import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';
import type { Order } from './Order';

export class Customer extends Model {
  static table = 'customers';
  static associations = {
    orders: { type: 'has_many' as const, foreignKey: 'customer_id' },
  };

  @field('name') name!: string;
  @field('email') email!: string | null;
  @field('phone') phone!: string | null;
  @field('address') address!: string | null;
  @field('total_spent') totalSpent!: number;
  @field('visit_count') visitCount!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('orders') orders!: Query<Order>;
}
