import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, relation, children } from '@nozbe/watermelondb/decorators';
import type { Customer } from './Customer';
import type { OrderItem } from './OrderItem';

export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'gcash' | 'maya' | 'bank_transfer';
export type PaymentStatus = 'unpaid' | 'paid' | 'partial' | 'refunded';

export class Order extends Model {
  static table = 'orders';
  static associations = {
    customers: { type: 'belongs_to' as const, key: 'customer_id' },
    order_items: { type: 'has_many' as const, foreignKey: 'order_id' },
  };

  @field('order_number') orderNumber!: string;
  @field('customer_id') customerId!: string | null;
  @field('status') status!: OrderStatus;
  @field('subtotal') subtotal!: number;
  @field('discount_amount') discountAmount!: number;
  @field('tax_amount') taxAmount!: number;
  @field('total') total!: number;
  @field('payment_method') paymentMethod!: PaymentMethod;
  @field('payment_status') paymentStatus!: PaymentStatus;
  @field('notes') notes!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('customers', 'customer_id') customer!: Query<Customer>;
  @children('order_items') items!: Query<OrderItem>;
}
