/**
 * SyncManager — placeholder for future backend sync.
 *
 * When a backend is available, replace the stub methods with
 * WatermelonDB's synchronize() from '@nozbe/watermelondb/sync',
 * pointing pullChanges/pushChanges at your REST or GraphQL API.
 *
 * The rest of the app should never call this directly;
 * use useSyncStatus() hook and the SyncService instead.
 */
// database will be imported here when sync is implemented

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

export interface SyncResult {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  error?: string;
}

export class SyncManager {
  private static instance: SyncManager;
  private _status: SyncStatus = 'idle';
  private _lastSyncedAt: Date | null = null;

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  get status(): SyncStatus {
    return this._status;
  }

  get lastSyncedAt(): Date | null {
    return this._lastSyncedAt;
  }

  // Stub: replace body with real synchronize() call once backend is ready.
  async sync(): Promise<SyncResult> {
    this._status = 'syncing';
    try {
      // Future:
      // await synchronize({
      //   database,
      //   pullChanges: async ({ lastPulledAt }) => fetchChanges(lastPulledAt),
      //   pushChanges: async ({ changes }) => sendChanges(changes),
      // });
      this._status = 'success';
      this._lastSyncedAt = new Date();
      return { status: 'success', lastSyncedAt: this._lastSyncedAt };
    } catch (error) {
      this._status = 'error';
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      return { status: 'error', lastSyncedAt: this._lastSyncedAt, error: message };
    }
  }
}
