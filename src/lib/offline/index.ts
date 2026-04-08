/**
 * Offline Data Layer for Social Perks
 *
 * Provides IndexedDB-backed storage, a mutation queue for offline API calls,
 * and a CRDT-inspired sync manager with last-write-wins conflict resolution.
 *
 * No external dependencies — uses the native IndexedDB API with a thin
 * promise wrapper for ergonomic async/await usage.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PendingMutation {
  id?: number;
  method: string;
  url: string;
  body: unknown | null;
  headers: Record<string, string>;
  timestamp: number;
}

export interface SyncableRecord {
  id: string;
  updatedAt: number;
  [key: string]: unknown;
}

export type SyncStatus = "synced" | "syncing" | "pending" | "error";

export interface SyncStateData {
  lastSyncTimestamp: number;
  status: SyncStatus;
  lastError?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DB_NAME = "social-perks-offline";
const DB_VERSION = 1;

export const STORES = {
  campaigns: "campaigns",
  submissions: "submissions",
  pendingMutations: "pendingMutations",
  syncState: "syncState",
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

// ══════════════════════════════════════════════════════════════════════════════
// OfflineStore — IndexedDB CRUD wrapper
// ══════════════════════════════════════════════════════════════════════════════

export class OfflineStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Opens (or creates) the IndexedDB database. Memoized so subsequent
   * calls return the same database connection.
   */
  open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        for (const storeName of Object.values(STORES)) {
          if (!db.objectStoreNames.contains(storeName)) {
            if (storeName === STORES.pendingMutations) {
              db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
            } else {
              db.createObjectStore(storeName, { keyPath: "id" });
            }
          }
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  async get<T>(store: StoreName, key: string): Promise<T | undefined> {
    const db = await this.open();
    return new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const request = tx.objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(store: StoreName, key: string, value: T): Promise<void> {
    const db = await this.open();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      // Ensure the value has the key embedded (required by keyPath: "id")
      const record = typeof value === "object" && value !== null
        ? { ...value, id: key }
        : { id: key, value };
      tx.objectStore(store).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async delete(store: StoreName, key: string): Promise<void> {
    const db = await this.open();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAll<T>(store: StoreName): Promise<T[]> {
    const db = await this.open();
    return new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const request = tx.objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(store: StoreName): Promise<void> {
    const db = await this.open();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Close the database connection and reset the memoized promise
   * so the next call to open() creates a fresh connection.
   */
  close(): void {
    if (this.dbPromise) {
      this.dbPromise.then((db) => db.close()).catch(() => {});
      this.dbPromise = null;
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MutationQueue — Queue offline API calls for replay
// ══════════════════════════════════════════════════════════════════════════════

export class MutationQueue {
  constructor(private store: OfflineStore) {}

  /**
   * Add a pending API call to the queue.
   */
  async enqueue(
    method: string,
    url: string,
    body: unknown | null = null,
    headers: Record<string, string> = {}
  ): Promise<void> {
    const db = await this.store.open();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.pendingMutations, "readwrite");
      tx.objectStore(STORES.pendingMutations).add({
        method,
        url,
        body,
        headers,
        timestamp: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Replay all pending mutations in chronological order.
   * Successful mutations are removed from the queue.
   * Returns the number of mutations that were successfully replayed.
   */
  async drain(): Promise<number> {
    const mutations = await this.store.getAll<PendingMutation>(STORES.pendingMutations);

    // Sort by timestamp to replay in order
    mutations.sort((a, b) => a.timestamp - b.timestamp);

    let drained = 0;

    for (const mutation of mutations) {
      try {
        const response = await fetch(mutation.url, {
          method: mutation.method,
          headers: {
            "Content-Type": "application/json",
            ...mutation.headers,
          },
          body: mutation.body ? JSON.stringify(mutation.body) : undefined,
        });

        if (response.ok || response.status < 500) {
          // Success or client error — remove from queue
          if (mutation.id !== undefined) {
            await this.deleteMutation(mutation.id);
          }
          drained++;
        }
        // 5xx: leave in queue for retry
      } catch {
        // Network still down — stop draining
        break;
      }
    }

    return drained;
  }

  /**
   * Return the number of pending mutations.
   */
  async getPending(): Promise<number> {
    const mutations = await this.store.getAll<PendingMutation>(STORES.pendingMutations);
    return mutations.length;
  }

  /**
   * Get all pending mutations (for display/debugging).
   */
  async getAll(): Promise<PendingMutation[]> {
    return this.store.getAll<PendingMutation>(STORES.pendingMutations);
  }

  private async deleteMutation(id: number): Promise<void> {
    const db = await this.store.open();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.pendingMutations, "readwrite");
      tx.objectStore(STORES.pendingMutations).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SyncManager — CRDT-inspired last-write-wins conflict resolution
// ══════════════════════════════════════════════════════════════════════════════

export class SyncManager {
  private store: OfflineStore;
  private mutationQueue: MutationQueue;
  private _status: SyncStatus = "synced";
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  constructor(store: OfflineStore, mutationQueue: MutationQueue) {
    this.store = store;
    this.mutationQueue = mutationQueue;
  }

  get status(): SyncStatus {
    return this._status;
  }

  /**
   * Subscribe to sync status changes.
   */
  onStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: SyncStatus): void {
    this._status = status;
    for (const listener of this.listeners) {
      listener(status);
    }
  }

  /**
   * Last-write-wins merge: compare two records by updatedAt timestamp.
   * Returns whichever record has the more recent timestamp.
   * If timestamps are equal, server wins (consistent tie-breaking).
   */
  mergeServerData<T extends SyncableRecord>(local: T, server: T): T {
    if (!local || !server) {
      return server || local;
    }

    const localTime = local.updatedAt || 0;
    const serverTime = server.updatedAt || 0;

    // Server wins on tie — provides consistency across clients
    if (serverTime >= localTime) {
      return server;
    }

    return local;
  }

  /**
   * Get the last successful sync timestamp.
   */
  async getLastSyncTimestamp(): Promise<number> {
    const state = await this.store.get<SyncStateData>(STORES.syncState, "global");
    return state?.lastSyncTimestamp ?? 0;
  }

  /**
   * Update the last successful sync timestamp.
   */
  async setLastSyncTimestamp(timestamp: number): Promise<void> {
    const existing = await this.store.get<SyncStateData>(STORES.syncState, "global");
    await this.store.put(STORES.syncState, "global", {
      ...existing,
      lastSyncTimestamp: timestamp,
      status: "synced" as SyncStatus,
    });
  }

  /**
   * Full sync cycle:
   * 1. Drain pending mutations (push local changes)
   * 2. Fetch latest data from server (since last sync)
   * 3. Merge server data with local using last-write-wins
   * 4. Update last sync timestamp
   */
  async syncAll(
    fetchServerData?: (since: number) => Promise<{
      campaigns?: SyncableRecord[];
      submissions?: SyncableRecord[];
    }>
  ): Promise<{ pushed: number; pulled: number }> {
    this.setStatus("syncing");

    let pushed = 0;
    let pulled = 0;

    try {
      // Step 1: Push local mutations
      pushed = await this.mutationQueue.drain();

      // Step 2: Pull server data if a fetcher is provided
      if (fetchServerData) {
        const lastSync = await this.getLastSyncTimestamp();
        const serverData = await fetchServerData(lastSync);

        // Step 3: Merge campaigns
        if (serverData.campaigns) {
          for (const serverRecord of serverData.campaigns) {
            const localRecord = await this.store.get<SyncableRecord>(
              STORES.campaigns,
              serverRecord.id
            );
            const merged = localRecord
              ? this.mergeServerData(localRecord, serverRecord)
              : serverRecord;
            await this.store.put(STORES.campaigns, merged.id, merged);
            pulled++;
          }
        }

        // Step 3b: Merge submissions
        if (serverData.submissions) {
          for (const serverRecord of serverData.submissions) {
            const localRecord = await this.store.get<SyncableRecord>(
              STORES.submissions,
              serverRecord.id
            );
            const merged = localRecord
              ? this.mergeServerData(localRecord, serverRecord)
              : serverRecord;
            await this.store.put(STORES.submissions, merged.id, merged);
            pulled++;
          }
        }
      }

      // Step 4: Update sync timestamp
      await this.setLastSyncTimestamp(Date.now());
      this.setStatus("synced");
    } catch (err) {
      this.setStatus("error");
      // Store error info
      const existing = await this.store.get<SyncStateData>(STORES.syncState, "global");
      await this.store.put(STORES.syncState, "global", {
        ...existing,
        status: "error" as SyncStatus,
        lastError: err instanceof Error ? err.message : "Unknown sync error",
      });
      throw err;
    }

    return { pushed, pulled };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Singleton instances for app-wide use
// ══════════════════════════════════════════════════════════════════════════════

let _store: OfflineStore | null = null;
let _mutationQueue: MutationQueue | null = null;
let _syncManager: SyncManager | null = null;

export function getOfflineStore(): OfflineStore {
  if (!_store) {
    _store = new OfflineStore();
  }
  return _store;
}

export function getMutationQueue(): MutationQueue {
  if (!_mutationQueue) {
    _mutationQueue = new MutationQueue(getOfflineStore());
  }
  return _mutationQueue;
}

export function getSyncManager(): SyncManager {
  if (!_syncManager) {
    _syncManager = new SyncManager(getOfflineStore(), getMutationQueue());
  }
  return _syncManager;
}
