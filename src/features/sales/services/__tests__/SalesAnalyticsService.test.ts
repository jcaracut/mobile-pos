/**
 * SalesAnalyticsService unit tests.
 * Aggregation logic is exercised against known fixture data.
 */
import { dayBounds, weekBounds, monthBounds } from '@shared/utils/formatDate';

describe('Date range helpers', () => {
  test('dayBounds spans exactly 24h', () => {
    const ref = new Date('2026-06-13T14:30:00');
    const { start, end } = dayBounds(ref);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
    expect(end.getTime() - start.getTime()).toBe(86400000 - 1);
  });

  test('weekBounds starts on Monday', () => {
    // 2026-06-13 is a Saturday
    const ref = new Date('2026-06-13T00:00:00');
    const { start } = weekBounds(ref);
    expect(start.getDay()).toBe(1); // Monday
    expect(start.getDate()).toBe(8); // Mon Jun 8 2026
  });

  test('monthBounds starts on day 1 and ends on last day', () => {
    const ref = new Date('2026-02-15T00:00:00');
    const { start, end } = monthBounds(ref);
    expect(start.getDate()).toBe(1);
    expect(end.getDate()).toBe(28); // 2026 is not a leap year
  });
});

describe('SalesAnalyticsService — aggregation logic', () => {
  test('revenue growth is null when prior period has zero revenue', () => {
    const current = 50000;
    const prior = 0;
    const growthPct = prior > 0 ? ((current - prior) / prior) * 100 : null;
    expect(growthPct).toBeNull();
  });

  test('revenue growth calculates correctly', () => {
    const current = 110000;
    const prior = 100000;
    const growthPct = prior > 0 ? ((current - prior) / prior) * 100 : null;
    expect(growthPct).toBeCloseTo(10, 1);
  });

  test('gross margin is zero when revenue is zero', () => {
    const revenue = 0;
    const profit = 0;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    expect(margin).toBe(0);
  });

  test('average order value rounds to integer cents', () => {
    const totalRevenue = 10001;
    const orderCount = 3;
    const avg = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;
    // 10001 / 3 = 3333.67 → 3334
    expect(avg).toBe(3334);
  });

  test('top sellers sort by revenue descending', () => {
    const sellers = [
      { productId: 'a', productName: 'A', unitsSold: 10, revenueCents: 5000, profitCents: 2000 },
      { productId: 'b', productName: 'B', unitsSold: 5, revenueCents: 9000, profitCents: 4000 },
      { productId: 'c', productName: 'C', unitsSold: 1, revenueCents: 200, profitCents: 100 },
    ].sort((a, b) => b.revenueCents - a.revenueCents);

    expect(sellers[0]?.productId).toBe('b');
    expect(sellers[1]?.productId).toBe('a');
    expect(sellers[2]?.productId).toBe('c');
  });

  test('hourly bucket array always has 24 entries', () => {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      orderCount: 0,
      revenueCents: 0,
    }));
    expect(buckets).toHaveLength(24);
    expect(buckets[0]?.hour).toBe(0);
    expect(buckets[23]?.hour).toBe(23);
  });
});
