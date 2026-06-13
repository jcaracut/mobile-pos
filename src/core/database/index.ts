import { Database } from '@nozbe/watermelondb';
import { schema } from './schema';
import { Product, Order, OrderItem, Customer, Category, Inventory } from './models';

// ---------------------------------------------------------------------------
// Adapter selection
//
// Expo Go cannot load native SQLite modules, so we use the LokiJS adapter
// (AsyncStorage-backed, no native code) for development in Expo Go.
//
// For a production / dev-client build, swap to SQLiteAdapter:
//
//   import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
//   const adapter = new SQLiteAdapter({ schema, migrations, dbName: 'tugkaran_pos', jsi: true });
// ---------------------------------------------------------------------------

import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

const adapter = new LokiJSAdapter({
  schema,
  // Persists data between app restarts via AsyncStorage.
  useWebWorker: false,
  useIncrementalIndexedDB: true,
  onSetUpError: (error: unknown) => {
    console.error('[DB] Setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Product, Order, OrderItem, Customer, Category, Inventory],
});

export type { Product, Order, OrderItem, Customer, Category, Inventory };
