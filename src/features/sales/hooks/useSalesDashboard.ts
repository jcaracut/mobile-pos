import { useState, useEffect, useRef } from 'react';
import { database } from '@core/database';
import { SalesAnalyticsService } from '../services/SalesAnalyticsService';
import type { SalesDashboard, AnalyticsPeriod } from '../types';

interface UseSalesDashboardReturn {
  dashboard: SalesDashboard | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetches and rebuilds the sales dashboard whenever the orders table changes
 * or the period/referenceDate changes. Uses a reactive subscription on the
 * orders table as the invalidation trigger; aggregation runs in a service.
 */
export function useSalesDashboard(
  period: AnalyticsPeriod,
  referenceDate: Date = new Date()
): UseSalesDashboardReturn {
  const [dashboard, setDashboard] = useState<SalesDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Stable reference so the effect closure doesn't re-register on every render.
  const refDateRef = useRef(referenceDate);
  refDateRef.current = referenceDate;

  useEffect(() => {
    setIsLoading(true);

    // Watch the orders table as an invalidation signal.
    const sub = database
      .get('orders')
      .query()
      .observeCount()
      .subscribe(() => {
        SalesAnalyticsService.getDashboard(period, refDateRef.current)
          .then((data) => {
            setDashboard(data);
            setError(null);
            setIsLoading(false);
          })
          .catch((err: unknown) => {
            setError(err instanceof Error ? err.message : 'Failed to load analytics.');
            setIsLoading(false);
          });
      });

    return () => sub.unsubscribe();
  }, [period, tick]);

  return { dashboard, isLoading, error, refresh: () => setTick((t) => t + 1) };
}
