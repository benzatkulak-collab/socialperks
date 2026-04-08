import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  OfflineStore,
  MutationQueue,
  SyncManager,
  STORES,
  type SyncableRecord,
  type PendingMutation,
  type SyncStateData,
} from "../index";

// ══════════════════════════════════════════════════════════════════════════════
// IndexedDB Mock — Map-based shim for testing
//
// Implements enough of the IDBDatabase / IDBTransaction / IDBObjectStore
// interfaces to satisfy OfflineStore, MutationQueue, and SyncManager.
// ══════════════════════════════════════════════════════════════════════════════

class MockObjectStore {
  private data = new Map<string | number, unknown>();
  private keyPath: string;
  private autoIncrement: boolean;
  private nextId = 1;

  constructor(keyPath: string, autoIncrement: boolean) {
    this.keyPath = keyPath;
    this.autoIncrement = autoIncrement;
  }

  get(key: string | number) {
    const result = this.data.get(key);
    return mockRequest(result);
  }

  getAll() {
    return mockRequest(Array.from(this.data.values()));
  }

  put(value: Record<string, unknown>) {
    const key = value[this.keyPath] as string | number;
    this.data.set(key, structuredClone(value));
    return mockRequest(key);
  }

  add(value: Record<string, unknown>) {
    let key: string | number;
    if (this.autoIncrement) {
      key = this.nextId++;
      value[this.keyPath] = key;
    } else {
      key = value[this.keyPath] as string | number;
    }
    this.data.set(key, structuredClone(value));
    return mockRequest(key);
  }

  delete(key: string | number) {
    this.data.delete(key);
    return mockRequest(undefined);
  }

  clear() {
    this.data.clear();
    return mockRequest(undefined);
  }

  _size() {
    return this.data.size;
  }
}

function mockRequest(result: unknown) {
  return {
    result,
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
    error: null,
  };
}

class MockTransaction {
  private stores: Map<string, MockObjectStore>;
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  error: Error | null = null;

  constructor(stores: Map<string, MockObjectStore>) {
    this.stores = stores;

    // Simulate async completion
    queueMicrotask(() => {
      if (this.oncomplete) this.oncomplete();
    });
  }

  objectStore(name: string) {
    const store = this.stores.get(name);
    if (!store) throw new Error(`Object store "${name}" not found`);

    // Wrap store methods so their onsuccess fires immediately
    return new Proxy(store, {
      get: (target, prop: string) => {
        const original = target[prop as keyof MockObjectStore];
        if (typeof original !== "function") return original;
        if (["get", "getAll", "put", "add", "delete", "clear"].includes(prop)) {
          return (...args: unknown[]) => {
            const req = (original as (...a: unknown[]) => ReturnType<typeof mockRequest>).apply(
              target,
              args
            );
            queueMicrotask(() => {
              if (req.onsuccess) req.onsuccess();
            });
            return req;
          };
        }
        return original.bind(target);
      },
    });
  }
}

class MockIDBDatabase {
  objectStoreNames: { contains: (name: string) => boolean };
  private stores = new Map<string, MockObjectStore>();

  constructor() {
    this.objectStoreNames = {
      contains: (name: string) => this.stores.has(name),
    };
  }

  createObjectStore(name: string, opts: { keyPath: string; autoIncrement?: boolean }) {
    const store = new MockObjectStore(opts.keyPath, opts.autoIncrement ?? false);
    this.stores.set(name, store);
    return store;
  }

  transaction(_storeNames: string | string[], _mode?: string) {
    return new MockTransaction(this.stores);
  }

  close() {
    // no-op
  }
}

// Install the mock as globalThis.indexedDB
function createMockIndexedDB() {
  const databases = new Map<string, MockIDBDatabase>();

  return {
    open(name: string, _version?: number) {
      let db = databases.get(name);
      const isNew = !db;
      if (!db) {
        db = new MockIDBDatabase();
        databases.set(name, db);
      }

      const request = {
        result: db,
        onupgradeneeded: null as ((event: { target: { result: MockIDBDatabase } }) => void) | null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        error: null,
      };

      queueMicrotask(() => {
        if (isNew && request.onupgradeneeded) {
          request.onupgradeneeded({ target: { result: db! } });
        }
        if (request.onsuccess) request.onsuccess();
      });

      return request;
    },
    _clear() {
      databases.clear();
    },
  };
}

// ─── Setup ──────────────────────────────────────────────────────────────────

let mockIDB: ReturnType<typeof createMockIndexedDB>;

beforeEach(() => {
  mockIDB = createMockIndexedDB();
  (globalThis as Record<string, unknown>).indexedDB = mockIDB;
});

afterEach(() => {
  mockIDB._clear();
});

// ══════════════════════════════════════════════════════════════════════════════
// OfflineStore Tests
// ══════════════════════════════════════════════════════════════════════════════

describe("OfflineStore", () => {
  let store: OfflineStore;

  beforeEach(() => {
    store = new OfflineStore();
  });

  afterEach(() => {
    store.close();
  });

  it("opens the database and creates object stores", async () => {
    const db = await store.open();
    expect(db).toBeDefined();
    expect(db.objectStoreNames.contains(STORES.campaigns)).toBe(true);
    expect(db.objectStoreNames.contains(STORES.submissions)).toBe(true);
    expect(db.objectStoreNames.contains(STORES.pendingMutations)).toBe(true);
    expect(db.objectStoreNames.contains(STORES.syncState)).toBe(true);
  });

  it("put and get a record", async () => {
    await store.put(STORES.campaigns, "camp-1", {
      name: "Summer Promo",
      status: "active",
    });

    const result = await store.get<{ id: string; name: string; status: string }>(
      STORES.campaigns,
      "camp-1"
    );

    expect(result).toBeDefined();
    expect(result!.id).toBe("camp-1");
    expect(result!.name).toBe("Summer Promo");
    expect(result!.status).toBe("active");
  });

  it("returns undefined for nonexistent key", async () => {
    const result = await store.get(STORES.campaigns, "nonexistent");
    expect(result).toBeUndefined();
  });

  it("overwrites existing records on put", async () => {
    await store.put(STORES.campaigns, "camp-1", { name: "V1" });
    await store.put(STORES.campaigns, "camp-1", { name: "V2" });

    const result = await store.get<{ name: string }>(STORES.campaigns, "camp-1");
    expect(result!.name).toBe("V2");
  });

  it("deletes a record", async () => {
    await store.put(STORES.campaigns, "camp-1", { name: "Test" });
    await store.delete(STORES.campaigns, "camp-1");

    const result = await store.get(STORES.campaigns, "camp-1");
    expect(result).toBeUndefined();
  });

  it("getAll returns all records in a store", async () => {
    await store.put(STORES.campaigns, "camp-1", { name: "A" });
    await store.put(STORES.campaigns, "camp-2", { name: "B" });
    await store.put(STORES.campaigns, "camp-3", { name: "C" });

    const results = await store.getAll(STORES.campaigns);
    expect(results).toHaveLength(3);
  });

  it("getAll returns empty array for empty store", async () => {
    const results = await store.getAll(STORES.campaigns);
    expect(results).toEqual([]);
  });

  it("clear removes all records from a store", async () => {
    await store.put(STORES.campaigns, "camp-1", { name: "A" });
    await store.put(STORES.campaigns, "camp-2", { name: "B" });
    await store.clear(STORES.campaigns);

    const results = await store.getAll(STORES.campaigns);
    expect(results).toEqual([]);
  });

  it("stores are isolated from each other", async () => {
    await store.put(STORES.campaigns, "id-1", { name: "Campaign" });
    await store.put(STORES.submissions, "id-1", { name: "Submission" });

    const campaign = await store.get<{ name: string }>(STORES.campaigns, "id-1");
    const submission = await store.get<{ name: string }>(STORES.submissions, "id-1");

    expect(campaign!.name).toBe("Campaign");
    expect(submission!.name).toBe("Submission");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MutationQueue Tests
// ══════════════════════════════════════════════════════════════════════════════

describe("MutationQueue", () => {
  let store: OfflineStore;
  let queue: MutationQueue;

  beforeEach(() => {
    store = new OfflineStore();
    queue = new MutationQueue(store);
  });

  afterEach(() => {
    store.close();
  });

  it("starts with zero pending mutations", async () => {
    const count = await queue.getPending();
    expect(count).toBe(0);
  });

  it("enqueue increases pending count", async () => {
    await queue.enqueue("POST", "/api/v1/campaigns", { name: "Test" });
    const count = await queue.getPending();
    expect(count).toBe(1);
  });

  it("enqueue multiple mutations", async () => {
    await queue.enqueue("POST", "/api/v1/campaigns", { name: "A" });
    await queue.enqueue("PUT", "/api/v1/campaigns/1", { name: "B" });
    await queue.enqueue("DELETE", "/api/v1/campaigns/2", null);

    const count = await queue.getPending();
    expect(count).toBe(3);
  });

  it("getAll returns enqueued mutations with timestamps", async () => {
    const before = Date.now();
    await queue.enqueue("POST", "/api/v1/submissions", { proof: "url" });
    const mutations = await queue.getAll();

    expect(mutations).toHaveLength(1);
    expect(mutations[0].method).toBe("POST");
    expect(mutations[0].url).toBe("/api/v1/submissions");
    expect(mutations[0].body).toEqual({ proof: "url" });
    expect(mutations[0].timestamp).toBeGreaterThanOrEqual(before);
  });

  it("enqueue stores custom headers", async () => {
    await queue.enqueue("POST", "/api/v1/test", null, {
      Authorization: "Bearer token123",
    });

    const mutations = await queue.getAll();
    expect(mutations[0].headers.Authorization).toBe("Bearer token123");
  });

  it("drain replays mutations via fetch and returns count", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = fetchMock;

    await queue.enqueue("POST", "/api/v1/campaigns", { name: "Test" });
    await queue.enqueue("PUT", "/api/v1/campaigns/1", { name: "Updated" });

    const drained = await queue.drain();

    expect(drained).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Queue should be empty after drain
    const remaining = await queue.getPending();
    expect(remaining).toBe(0);
  });

  it("drain replays in chronological order", async () => {
    const callOrder: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      callOrder.push(url);
      return Promise.resolve({ ok: true, status: 200 });
    });

    await queue.enqueue("POST", "/api/v1/first", null);
    await queue.enqueue("POST", "/api/v1/second", null);
    await queue.enqueue("POST", "/api/v1/third", null);

    await queue.drain();

    expect(callOrder).toEqual([
      "/api/v1/first",
      "/api/v1/second",
      "/api/v1/third",
    ]);
  });

  it("drain removes client-error responses (4xx) from queue", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400 });

    await queue.enqueue("POST", "/api/v1/invalid", { bad: "data" });
    const drained = await queue.drain();

    expect(drained).toBe(1);
    expect(await queue.getPending()).toBe(0);
  });

  it("drain stops on network failure", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 2) throw new Error("Network error");
      return Promise.resolve({ ok: true, status: 200 });
    });

    await queue.enqueue("POST", "/api/v1/a", null);
    await queue.enqueue("POST", "/api/v1/b", null);
    await queue.enqueue("POST", "/api/v1/c", null);

    await queue.drain();

    // First succeeded and was removed, second failed (stops), third never attempted
    // The second and third should still be pending
    const remaining = await queue.getPending();
    expect(remaining).toBe(2);
  });

  it("drain with empty queue returns zero", async () => {
    const drained = await queue.drain();
    expect(drained).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SyncManager Tests
// ══════════════════════════════════════════════════════════════════════════════

describe("SyncManager", () => {
  let offlineStore: OfflineStore;
  let mutationQueue: MutationQueue;
  let syncManager: SyncManager;

  beforeEach(() => {
    offlineStore = new OfflineStore();
    mutationQueue = new MutationQueue(offlineStore);
    syncManager = new SyncManager(offlineStore, mutationQueue);
    // Default fetch mock for drain
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
  });

  afterEach(() => {
    offlineStore.close();
  });

  describe("mergeServerData", () => {
    it("server wins when server timestamp is newer", () => {
      const local: SyncableRecord = { id: "1", updatedAt: 1000, name: "local" };
      const server: SyncableRecord = { id: "1", updatedAt: 2000, name: "server" };

      const result = syncManager.mergeServerData(local, server);

      expect(result.name).toBe("server");
      expect(result.updatedAt).toBe(2000);
    });

    it("local wins when local timestamp is newer", () => {
      const local: SyncableRecord = { id: "1", updatedAt: 3000, name: "local" };
      const server: SyncableRecord = { id: "1", updatedAt: 1000, name: "server" };

      const result = syncManager.mergeServerData(local, server);

      expect(result.name).toBe("local");
      expect(result.updatedAt).toBe(3000);
    });

    it("server wins on tie (consistent tie-breaking)", () => {
      const local: SyncableRecord = { id: "1", updatedAt: 1000, name: "local" };
      const server: SyncableRecord = { id: "1", updatedAt: 1000, name: "server" };

      const result = syncManager.mergeServerData(local, server);

      expect(result.name).toBe("server");
    });

    it("returns server when local is null/undefined", () => {
      const server: SyncableRecord = { id: "1", updatedAt: 1000, name: "server" };

      const result = syncManager.mergeServerData(
        null as unknown as SyncableRecord,
        server
      );

      expect(result).toBe(server);
    });

    it("returns local when server is null/undefined", () => {
      const local: SyncableRecord = { id: "1", updatedAt: 1000, name: "local" };

      const result = syncManager.mergeServerData(
        local,
        null as unknown as SyncableRecord
      );

      expect(result).toBe(local);
    });

    it("treats missing updatedAt as 0", () => {
      const local = { id: "1", name: "local" } as SyncableRecord;
      const server: SyncableRecord = { id: "1", updatedAt: 1, name: "server" };

      const result = syncManager.mergeServerData(local, server);
      expect(result.name).toBe("server");
    });

    it("preserves all fields from the winning record", () => {
      const local: SyncableRecord = {
        id: "1",
        updatedAt: 1000,
        name: "local",
        extra: "field",
      };
      const server: SyncableRecord = {
        id: "1",
        updatedAt: 2000,
        name: "server",
        description: "new desc",
        tags: ["a", "b"],
      };

      const result = syncManager.mergeServerData(local, server);

      expect(result).toEqual(server);
      expect(result.description).toBe("new desc");
      expect(result.tags).toEqual(["a", "b"]);
    });
  });

  describe("sync timestamps", () => {
    it("defaults to 0 when no sync has occurred", async () => {
      const ts = await syncManager.getLastSyncTimestamp();
      expect(ts).toBe(0);
    });

    it("stores and retrieves sync timestamps", async () => {
      await syncManager.setLastSyncTimestamp(12345);
      const ts = await syncManager.getLastSyncTimestamp();
      expect(ts).toBe(12345);
    });

    it("overwrites previous timestamp", async () => {
      await syncManager.setLastSyncTimestamp(100);
      await syncManager.setLastSyncTimestamp(200);
      const ts = await syncManager.getLastSyncTimestamp();
      expect(ts).toBe(200);
    });
  });

  describe("syncAll", () => {
    it("drains mutation queue and updates timestamp", async () => {
      await mutationQueue.enqueue("POST", "/api/v1/test", { a: 1 });

      const result = await syncManager.syncAll();

      expect(result.pushed).toBe(1);
      expect(result.pulled).toBe(0);
      expect(await mutationQueue.getPending()).toBe(0);
      expect(await syncManager.getLastSyncTimestamp()).toBeGreaterThan(0);
    });

    it("merges server campaigns into local store", async () => {
      // Pre-existing local record
      await offlineStore.put(STORES.campaigns, "camp-1", {
        id: "camp-1",
        updatedAt: 1000,
        name: "Old Name",
      });

      const fetchServerData = vi.fn().mockResolvedValue({
        campaigns: [
          { id: "camp-1", updatedAt: 2000, name: "Updated Name" },
          { id: "camp-2", updatedAt: 3000, name: "New Campaign" },
        ],
      });

      const result = await syncManager.syncAll(fetchServerData);

      expect(result.pulled).toBe(2);

      const camp1 = await offlineStore.get<SyncableRecord>(STORES.campaigns, "camp-1");
      expect(camp1!.name).toBe("Updated Name");

      const camp2 = await offlineStore.get<SyncableRecord>(STORES.campaigns, "camp-2");
      expect(camp2!.name).toBe("New Campaign");
    });

    it("keeps local record when it is newer than server", async () => {
      await offlineStore.put(STORES.campaigns, "camp-1", {
        id: "camp-1",
        updatedAt: 5000,
        name: "Local Newer",
      });

      const fetchServerData = vi.fn().mockResolvedValue({
        campaigns: [
          { id: "camp-1", updatedAt: 1000, name: "Server Older" },
        ],
      });

      await syncManager.syncAll(fetchServerData);

      const camp1 = await offlineStore.get<SyncableRecord>(STORES.campaigns, "camp-1");
      expect(camp1!.name).toBe("Local Newer");
    });

    it("merges server submissions", async () => {
      const fetchServerData = vi.fn().mockResolvedValue({
        submissions: [
          { id: "sub-1", updatedAt: 1000, proof: "screenshot.png" },
        ],
      });

      const result = await syncManager.syncAll(fetchServerData);
      expect(result.pulled).toBe(1);

      const sub = await offlineStore.get<SyncableRecord>(STORES.submissions, "sub-1");
      expect(sub!.proof).toBe("screenshot.png");
    });

    it("passes lastSyncTimestamp to fetch function", async () => {
      await syncManager.setLastSyncTimestamp(99999);

      const fetchServerData = vi.fn().mockResolvedValue({});
      await syncManager.syncAll(fetchServerData);

      expect(fetchServerData).toHaveBeenCalledWith(99999);
    });

    it("sets status to syncing, then synced on success", async () => {
      const statuses: string[] = [];
      syncManager.onStatusChange((s) => statuses.push(s));

      await syncManager.syncAll();

      expect(statuses).toContain("syncing");
      expect(statuses[statuses.length - 1]).toBe("synced");
      expect(syncManager.status).toBe("synced");
    });

    it("sets status to error on failure", async () => {
      const fetchServerData = vi.fn().mockRejectedValue(new Error("Network failure"));

      await expect(syncManager.syncAll(fetchServerData)).rejects.toThrow("Network failure");

      expect(syncManager.status).toBe("error");

      // Error should be persisted in syncState
      const state = await offlineStore.get<SyncStateData>(STORES.syncState, "global");
      expect(state!.lastError).toBe("Network failure");
    });

    it("works without a fetch function (push-only sync)", async () => {
      await mutationQueue.enqueue("POST", "/api/v1/test", null);

      const result = await syncManager.syncAll();

      expect(result.pushed).toBe(1);
      expect(result.pulled).toBe(0);
    });

    it("unsubscribe removes status listener", async () => {
      const statuses: string[] = [];
      const unsub = syncManager.onStatusChange((s) => statuses.push(s));
      unsub();

      await syncManager.syncAll();

      expect(statuses).toHaveLength(0);
    });
  });
});
