/**
 * Development seed script.
 * Run once after first launch to populate the app with realistic test data.
 *
 * Usage (in a React Native context — call seedDatabase() on app startup in dev mode):
 *
 *   if (__DEV__) {
 *     import('./scripts/seed').then(({ seedDatabase }) => seedDatabase());
 *   }
 */
import { database } from '../src/core/database';
import { InventoryService } from '../src/features/inventory/services/InventoryService';
import { CategoryService } from '../src/features/inventory/services/CategoryService';
import { phpToCents } from '../src/shared/utils/formatMoney';

export async function seedDatabase(): Promise<void> {
  const existing = await database.get('products').query().fetchCount();
  if (existing > 0) return; // Already seeded.

  console.log('[Seed] Seeding database…');

  const beverage = await CategoryService.create({ name: 'Beverages', color: '#2196F3', icon: '🥤' });
  const snack = await CategoryService.create({ name: 'Snacks', color: '#FF9800', icon: '🍟' });
  const grocery = await CategoryService.create({ name: 'Grocery', color: '#4CAF50', icon: '🛒' });

  const products = [
    { name: 'Espresso Single Shot', sku: 'BEV-001', price: phpToCents(75), cost: phpToCents(45), qty: 48, threshold: 12, cat: beverage.id },
    { name: 'Cappuccino', sku: 'BEV-002', price: phpToCents(60), cost: phpToCents(38), qty: 36, threshold: 10, cat: beverage.id },
    { name: 'Cold Brew Coffee 500ml', sku: 'BEV-003', price: phpToCents(25), cost: phpToCents(12), qty: 120, threshold: 30, cat: beverage.id },
    { name: 'Chocolate Croissant', sku: 'SNK-001', price: phpToCents(35), cost: phpToCents(22), qty: 60, threshold: 15, cat: snack.id },
    { name: 'Almond Biscotti', sku: 'SNK-002', price: phpToCents(155), cost: phpToCents(110), qty: 8, threshold: 10, cat: snack.id },
    { name: 'Whole Bean Coffee 250g', sku: 'GRC-001', price: phpToCents(15), cost: phpToCents(10), qty: 200, threshold: 50, cat: grocery.id },
    { name: 'Green Tea Leaves', sku: 'GRC-002', price: phpToCents(12), cost: phpToCents(8), qty: 3, threshold: 20, cat: grocery.id },
    { name: 'Honey Jar 200g', sku: 'GRC-003', price: phpToCents(22), cost: phpToCents(14), qty: 0, threshold: 24, cat: grocery.id },
  ];

  for (const p of products) {
    await InventoryService.createProduct({
      name: p.name,
      sku: p.sku,
      price: p.price,
      cost: p.cost,
      categoryId: p.cat,
      initialQuantity: p.qty,
      lowStockThreshold: p.threshold,
    });
  }

  console.log('[Seed] Done — created 3 categories and 8 products.');
}
