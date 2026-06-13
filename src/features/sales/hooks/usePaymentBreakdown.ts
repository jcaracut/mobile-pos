import { useState, useEffect } from 'react';
import { database } from '@core/database';
import { SalesAnalyticsService } from '../services/SalesAnalyticsService';
import type { PaymentMethodBreakdown, DateRange } from '../types';

interface UsePaymentBreakdownReturn {
  breakdown: PaymentMethodBreakdown[];
  isLoading: boolean;
}

export function usePaymentBreakdown(range: DateRange): UsePaymentBreakdownReturn {
  const [breakdown, setBreakdown] = useState<PaymentMethodBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sub = database
      .get('orders')
      .query()
      .observeCount()
      .subscribe(() => {
        SalesAnalyticsService.getPaymentBreakdown(range)
          .then((data) => {
            setBreakdown(data);
            setIsLoading(false);
          })
          .catch(() => setIsLoading(false));
      });

    return () => sub.unsubscribe();
  }, [range.start.getTime(), range.end.getTime()]);

  return { breakdown, isLoading };
}
