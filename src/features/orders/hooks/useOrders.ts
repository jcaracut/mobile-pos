import { useState, useEffect } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@core/database';
import { Order } from '@core/database/models';
import type { OrderFilter } from '../types';

interface UseOrdersReturn {
  orders: Order[];
  isLoading: boolean;
}

/**
 * Reactive order list with server-compatible filter shape.
 * Date range and search are applied client-side after the WatermelonDB query.
 */
export function useOrders(filter: OrderFilter = {}): UseOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const constraints: Parameters<typeof Q.where>[] = [];

    if (filter.status) {
      constraints.push(['status', filter.status] as unknown as Parameters<typeof Q.where>);
    }
    if (filter.paymentMethod) {
      constraints.push(['payment_method', filter.paymentMethod] as unknown as Parameters<typeof Q.where>);
    }
    if (filter.customerId) {
      constraints.push(['customer_id', filter.customerId] as unknown as Parameters<typeof Q.where>);
    }

    const query = database.get<Order>('orders').query(
      ...(constraints.map(([col, val]) => Q.where(col as string, val as string)))
    );

    // observeWithColumns re-emits when `status` changes on a record already in
    // the result set (e.g. cancel/void), not only when rows are added/removed.
    const sub = query.observeWithColumns(['status']).subscribe((rows) => {
      let result = rows;

      // Client-side filters that WatermelonDB queries can't express as simply.
      if (filter.startDate) {
        const from = filter.startDate.getTime();
        result = result.filter((o) => o.createdAt.getTime() >= from);
      }
      if (filter.endDate) {
        const to = filter.endDate.getTime();
        result = result.filter((o) => o.createdAt.getTime() <= to);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        result = result.filter((o) => o.orderNumber.toLowerCase().includes(q));
      }

      // Newest first.
      result = [...result].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setOrders(result);
      setIsLoading(false);
    });

    return () => sub.unsubscribe();
  }, [
    filter.status,
    filter.paymentMethod,
    filter.customerId,
    filter.startDate,
    filter.endDate,
    filter.search,
  ]);

  return { orders, isLoading };
}
