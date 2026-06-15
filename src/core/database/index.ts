import { Database } from '@nozbe/watermelondb';
import { schema } from './schema';
import { Product, Order, OrderItem, Customer, Category, Inventory } from './models';

// ---------------------------------------------------------------------------
// Adapter selection
//
// Expo Go cannot load native SQLite modules, so we use the LokiJS adapter
// for development in Expo Go.
//
// IMPORTANT: WatermelonDB 0.27's LokiJS adapter falls back to LokiMemoryAdapter
// (in-memory, no persistence) on React Native because IndexedDB is unavailable.
// We bypass this by injecting an AsyncStorage-backed adapter via _testLokiAdapter.
//
// For a production / dev-client build, swap to SQLiteAdapter:
//
//   import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
//   const adapter = new SQLiteAdapter({ schema, migrations, dbName: 'tugkaran_pos', jsi: true });
// ---------------------------------------------------------------------------

import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'watermelon:tugkaran_pos';

// LokiJS adapter interface backed by AsyncStorage for React Native persistence.
//
// NOTE on callback conventions (they differ per method, and getting this wrong
// silently breaks DB setup):
//   - loadDatabase: callback receives the data string (or null for a fresh DB,
//     or an Error instance on failure).
//   - saveDatabase: callback receives an error (null/undefined = success).
//   - deleteDatabase: callback receives a *response*. WatermelonDB's wrapper
//     only treats `undefined` or `{ success: true }` as success and rejects on
//     anything else (including null) — so we must signal success explicitly.
const lokiAsyncStorageAdapter = {
  loadDatabase(_dbname: string, callback: (data: string | null | Error) => void): void {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((data) => callback(data))
      .catch((err: unknown) => callback(err instanceof Error ? err : new Error(String(err))));
  },
  saveDatabase(_dbname: string, dbstring: string, callback: (err?: Error | null) => void): void {
    AsyncStorage.setItem(STORAGE_KEY, dbstring)
      .then(() => callback(null))
      .catch((err: unknown) => callback(err instanceof Error ? err : new Error(String(err))));
  },
  deleteDatabase(_dbname: string, callback: (response: { success: boolean }) => void): void {
    AsyncStorage.removeItem(STORAGE_KEY)
      .then(() => callback({ success: true }))
      .catch(() => callback({ success: false }));
  },
};

const adapter = new LokiJSAdapter({
  schema,
  dbName: 'tugkaran_pos',
  useWebWorker: false,
  useIncrementalIndexedDB: false,
  // Bypass the IDB/memory fallback; use our AsyncStorage adapter directly.
  _testLokiAdapter: lokiAsyncStorageAdapter,
  onSetUpError: (error: unknown) => {
    console.error('[DB] Setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Product, Order, OrderItem, Customer, Category, Inventory],
});

export type { Product, Order, OrderItem, Customer, Category, Inventory };
