import { useState, useEffect } from 'react';
import { database } from '@core/database';
import { SalesAnalyticsService } from '../services/SalesAnalyticsService';
import type { HourlyBucket, DateRange } from '../types';

interface UseHourlyHeatmapReturn {
  buckets: HourlyBucket[];
  peakHour: number | null;
  isLoading: boolean;
}

export function useHourlyHeatmap(range: DateRange): UseHourlyHeatmapReturn {
  const [buckets, setBuckets] = useState<HourlyBucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sub = database
      .get('orders')
      .query()
      .observeCount()
      .subscribe(() => {
        SalesAnalyticsService.getHourlyHeatmap(range)
          .then((data) => {
            setBuckets(data);
            setIsLoading(false);
          })
          .catch(() => setIsLoading(false));
      });

    return () => sub.unsubscribe();
  }, [range.start.getTime(), range.end.getTime()]);

  const peakHour =
    buckets.length > 0
      ? buckets.reduce((peak, b) => (b.orderCount > peak.orderCount ? b : peak), buckets[0]!)
          .hour
      : null;

  return { buckets, peakHour, isLoading };
}
