import { useState, useEffect } from 'react';
import { database } from '@core/database';
import { SalesAnalyticsService } from '../services/SalesAnalyticsService';
import type { TopSellingProduct, DateRange } from '../types';

interface UseTopSellersReturn {
  topSellers: TopSellingProduct[];
  isLoading: boolean;
}

export function useTopSellers(range: DateRange, limit = 10): UseTopSellersReturn {
  const [topSellers, setTopSellers] = useState<TopSellingProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sub = database
      .get('order_items')
      .query()
      .observeCount()
      .subscribe(() => {
        SalesAnalyticsService.getTopSellingProducts(range, limit)
          .then((data) => {
            setTopSellers(data);
            setIsLoading(false);
          })
          .catch(() => setIsLoading(false));
      });

    return () => sub.unsubscribe();
  }, [range.start.getTime(), range.end.getTime(), limit]);

  return { topSellers, isLoading };
}
