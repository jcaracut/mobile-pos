import { useEffect, useState } from 'react';
import { database } from '@core/database';
import type { Order } from '@core/database/models';

export interface SalesSummary {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  isLoading: boolean;
}

export function useSalesSummary(startDate: Date, endDate: Date): SalesSummary {
  const [summary, setSummary] = useState<Omit<SalesSummary, 'isLoading'>>({
    totalRevenue: 0,
    orderCount: 0,
    averageOrderValue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    const subscription = database
      .get<Order>('orders')
      .query()
      .observe()
      .subscribe((orders) => {
        const filtered = orders.filter(
          (o) =>
            o.status === 'completed' &&
            o.createdAt.getTime() >= startMs &&
            o.createdAt.getTime() <= endMs
        );

        const totalRevenue = filtered.reduce((s, o) => s + o.total, 0);
        const orderCount = filtered.length;
        const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

        setSummary({ totalRevenue, orderCount, averageOrderValue });
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [startDate, endDate]);

  return { ...summary, isLoading };
}
