/**
 * Offline-First Sync Engine for Social Perks
 *
 * Queues mutations made while offline and replays them when connectivity
 * returns. Supports conflict detection, field-level merge, retry with
 * exponential backoff, and delta sync for bandwidth efficiency.
 *
 * Storage: in-memory (queue persists in localStorage on the client;
 * this module is the logic layer, agnostic of storage backend).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type SyncOperation = "create" | "update" | "delete";

export type SyncItemStatus = "pending" | "syncing" | "synced" | "failed" | "conflict";

export type ConflictStrategy = "client_wins" | "server_wins" | "merge";

export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  entityType: string;
  entityId: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: SyncItemStatus;
  conflictResolution?: ConflictStrategy;
  error?: string;
  lastAttemptAt?: number;
}

export interface SyncState {
  lastSyncTimestamp: number;
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  deviceId: string;
  isSyncing: boolean;
}

export interface ConflictResolution {
  itemId: string;
  clientVersion: Record<string, unknown>;
  serverVersion: Record<string, unknown>;
  resolvedVersion: Record<string, unknown>;
  strategy: ConflictStrategy;
  resolvedAt: string;
}

export interface SyncResult {
  synced: string[];
  failed: string[];
  conflicts: ConflictResolution[];
  duration: number;
}

export interface DeltaPacket {
  since: number;
  until: number;
  deviceId: string;
  changes: DeltaChange[];
}

export interface DeltaChange {
  operation: SyncOperation;
  entityType: string;
  entityId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export type SyncTransportFn = (
  item: SyncQueueItem
) => Promise<{
  success: boolean;
  serverVersion?: Record<string, unknown>;
  error?: string;
}>;

export type ServerFetchFn = (
  entityType: string,
  entityId: string
) => Promise<Record<string, unknown> | null>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateSyncId(): string {
  return `sync_${crypto.randomUUID()}`;
}

const DEFAULT_MAX_RETRIES = 5;

/** Reserved metadata keys that are never merged from the client side. */
const SERVER_OWNED_FIELDS = new Set(["id", "createdAt", "version", "serverTimestamp"]);

// ─── Sync Engine ────────────────────────────────────────────────────────────

class SyncEngine {
  private queue: Map<string, SyncQueueItem> = new Map();
  private resolutions: ConflictResolution[] = [];
  private localStore: Map<string, Map<string, Record<string, unknown>>> = new Map();
  private state: SyncState;

  /**
   * Optional transport function. When set, `sync()` calls this to push
   * each item to the server. When null, sync simulates success.
   */
  private transport: SyncTransportFn | null = null;

  /**
   * Optional server fetch function. When set, conflict detection can
   * pull the latest server version for comparison.
   */
  private serverFetch: ServerFetchFn | null = null;

  /** Promise-based mutex to prevent concurrent sync runs. */
  private syncLock: Promise<void> = Promise.resolve();

  constructor(deviceId: string) {
    if (!deviceId || typeof deviceId !== "string") {
      throw new Error("deviceId is required");
    }

    this.state = {
      lastSyncTimestamp: 0,
      pendingCount: 0,
      failedCount: 0,
      conflictCount: 0,
      deviceId,
      isSyncing: false,
    };
  }

  // ── Configuration ───────────────────────────────────────────────────────

  /** Register a transport function for pushing items to the server. */
  setTransport(fn: SyncTransportFn): void {
    this.transport = fn;
  }

  /** Register a function for fetching server state (used in conflict detection). */
  setServerFetch(fn: ServerFetchFn): void {
    this.serverFetch = fn;
  }

  // ── Queue Operations ────────────────────────────────────────────────────

  /**
   * Add an operation to the sync queue. If there is already a pending item
   * for the same entity, the operations are coalesced:
   * - create + update → create with merged data
   * - create + delete → both removed (no-op)
   * - update + update → single update with merged data
   * - update + delete → delete
   */
  enqueue(
    operation: SyncOperation,
    entityType: string,
    entityId: string,
    data: Record<string, unknown> = {}
  ): SyncQueueItem {
    if (!entityType || typeof entityType !== "string") {
      throw new Error("entityType is required");
    }
    if (!entityId || typeof entityId !== "string") {
      throw new Error("entityId is required");
    }

    // Check for existing pending item for the same entity
    const existing = this.findPendingForEntity(entityType, entityId);

    if (existing) {
      return this.coalesce(existing, operation, data);
    }

    const item: SyncQueueItem = {
      id: generateSyncId(),
      operation,
      entityType,
      entityId,
      data: { ...data },
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: DEFAULT_MAX_RETRIES,
      status: "pending",
    };

    this.queue.set(item.id, item);

    // Also store locally for delta sync
    this.storeLocally(entityType, entityId, operation, data);

    this.recountState();
    return item;
  }

  /** Remove an item from the queue (after successful sync or manual removal). */
  dequeue(itemId: string): boolean {
    const removed = this.queue.delete(itemId);
    if (removed) {
      this.recountState();
    }
    return removed;
  }

  /** Get all items currently in the queue. */
  getQueue(): SyncQueueItem[] {
    return Array.from(this.queue.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );
  }

  /** Get only pending items. */
  getPendingItems(): SyncQueueItem[] {
    return this.getQueue().filter((item) => item.status === "pending");
  }

  /** Number of items waiting to sync. */
  getPendingCount(): number {
    return this.getPendingItems().length;
  }

  /** Get only failed items. */
  getFailedItems(): SyncQueueItem[] {
    return this.getQueue().filter((item) => item.status === "failed");
  }

  /** Get items in conflict state. */
  getConflictItems(): SyncQueueItem[] {
    return this.getQueue().filter((item) => item.status === "conflict");
  }

  // ── Sync Process ────────────────────────────────────────────────────────

  /**
   * Process all pending items in the queue. Items are synced in timestamp
   * order (oldest first) to preserve causal ordering.
   */
  async sync(): Promise<SyncResult> {
    // Chain onto the mutex so concurrent callers wait instead of overlapping
    const previous = this.syncLock;
    let release: () => void;
    this.syncLock = new Promise<void>((resolve) => { release = resolve; });

    await previous;

    if (this.state.isSyncing) {
      release!();
      return { synced: [], failed: [], conflicts: [], duration: 0 };
    }

    this.state.isSyncing = true;
    const startTime = Date.now();

    const synced: string[] = [];
    const failed: string[] = [];
    const conflicts: ConflictResolution[] = [];

    try {
      const pending = this.getPendingItems();

      for (const item of pending) {
        const result = await this.syncItem(item);

        if (result.status === "synced") {
          synced.push(item.id);
          this.dequeue(item.id);
        } else if (result.status === "conflict" && result.resolution) {
          conflicts.push(result.resolution);
        } else if (result.status === "failed") {
          failed.push(item.id);
        }
      }
    } finally {
      this.state.lastSyncTimestamp = Date.now();
      this.state.isSyncing = false;
      this.recountState();
      release!();
    }

    return {
      synced,
      failed,
      conflicts,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Attempt to sync a single item. Handles transport errors, conflict
   * detection, and retry bookkeeping.
   */
  async syncItem(
    item: SyncQueueItem
  ): Promise<{
    status: SyncItemStatus;
    resolution?: ConflictResolution;
  }> {
    const queueItem = this.queue.get(item.id);
    if (!queueItem) {
      return { status: "failed" };
    }

    // Mark as syncing
    queueItem.status = "syncing";
    queueItem.lastAttemptAt = Date.now();

    try {
      // Use transport if available, otherwise simulate success
      if (this.transport) {
        const response = await this.transport(queueItem);

        if (response.success) {
          queueItem.status = "synced";
          return { status: "synced" };
        }

        // Server returned a conflict — it has a newer version
        if (response.serverVersion) {
          const hasConflict = this.detectConflict(
            queueItem.data,
            response.serverVersion
          );

          if (hasConflict) {
            queueItem.status = "conflict";
            const resolution = this.resolveConflict(
              queueItem,
              response.serverVersion,
              queueItem.conflictResolution
            );
            return { status: "conflict", resolution };
          }
        }

        // Non-conflict failure
        queueItem.retryCount++;
        if (queueItem.retryCount >= queueItem.maxRetries) {
          queueItem.status = "failed";
          queueItem.error = response.error ?? "Max retries exceeded";
        } else {
          queueItem.status = "pending";
          queueItem.error = response.error;
        }

        return { status: queueItem.status };
      }

      // No transport — simulate success (useful for local-only mode)
      queueItem.status = "synced";
      return { status: "synced" };
    } catch (err) {
      queueItem.retryCount++;
      const message =
        err instanceof Error ? err.message : "Unknown sync error";
      queueItem.error = message;

      if (queueItem.retryCount >= queueItem.maxRetries) {
        queueItem.status = "failed";
      } else {
        queueItem.status = "pending";
      }

      return { status: queueItem.status };
    }
  }

  // ── Conflict Resolution ─────────────────────────────────────────────────

  /**
   * Detect whether the client data conflicts with the server state.
   * A conflict exists when both sides have modified the same fields
   * to different values.
   */
  detectConflict(
    clientData: Record<string, unknown>,
    serverData: Record<string, unknown>
  ): boolean {
    for (const key of Object.keys(clientData)) {
      if (SERVER_OWNED_FIELDS.has(key)) continue;

      if (
        key in serverData &&
        !deepEqual(clientData[key], serverData[key])
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Resolve a conflict between client and server versions.
   * Strategies:
   * - client_wins: use client data entirely
   * - server_wins: use server data entirely
   * - merge: field-level merge (client fields win unless server-owned)
   */
  resolveConflict(
    item: SyncQueueItem,
    serverVersion: Record<string, unknown>,
    strategy?: ConflictStrategy
  ): ConflictResolution {
    const effectiveStrategy = strategy ?? "merge";
    let resolvedVersion: Record<string, unknown>;

    switch (effectiveStrategy) {
      case "client_wins":
        resolvedVersion = { ...serverVersion, ...item.data };
        break;
      case "server_wins":
        resolvedVersion = { ...serverVersion };
        break;
      case "merge":
        resolvedVersion = this.mergeData(item.data, serverVersion);
        break;
    }

    const resolution: ConflictResolution = {
      itemId: item.id,
      clientVersion: { ...item.data },
      serverVersion: { ...serverVersion },
      resolvedVersion,
      strategy: effectiveStrategy,
      resolvedAt: new Date().toISOString(),
    };

    this.resolutions.push(resolution);

    // Update the queue item with resolved data
    const queueItem = this.queue.get(item.id);
    if (queueItem) {
      queueItem.data = resolvedVersion;
      queueItem.status = "pending"; // Re-queue for sync with resolved data
      queueItem.conflictResolution = effectiveStrategy;
    }

    this.recountState();
    return resolution;
  }

  /**
   * Field-level merge: start with server state, overlay client changes
   * for non-server-owned fields. For nested objects, recursively merge.
   */
  mergeData(
    clientData: Record<string, unknown>,
    serverData: Record<string, unknown>
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...serverData };

    for (const [key, clientValue] of Object.entries(clientData)) {
      // Server-owned fields always come from the server
      if (SERVER_OWNED_FIELDS.has(key)) continue;

      const serverValue = serverData[key];

      // If both are plain objects, merge recursively
      if (
        isPlainObject(clientValue) &&
        isPlainObject(serverValue)
      ) {
        merged[key] = this.mergeData(
          clientValue as Record<string, unknown>,
          serverValue as Record<string, unknown>
        );
      } else {
        // Client value wins for non-server-owned fields
        merged[key] = clientValue;
      }
    }

    return merged;
  }

  // ── State Management ────────────────────────────────────────────────────

  /** Get the current sync state snapshot. */
  getState(): SyncState {
    this.recountState();
    return { ...this.state };
  }

  /** Update the last sync timestamp (e.g., after receiving a server push). */
  setLastSync(timestamp: number): void {
    this.state.lastSyncTimestamp = timestamp;
  }

  /** Clear the entire queue (e.g., after a full sync or user logout). */
  clear(): void {
    this.queue.clear();
    this.resolutions.length = 0;
    this.localStore.clear();
    this.state.pendingCount = 0;
    this.state.failedCount = 0;
    this.state.conflictCount = 0;
  }

  /** Get all conflict resolutions (for audit / debugging). */
  getResolutions(): ConflictResolution[] {
    return [...this.resolutions];
  }

  // ── Retry Logic ─────────────────────────────────────────────────────────

  /**
   * Retry all failed items. Resets their status to pending and clears
   * their retry count if below the new maxRetries threshold.
   */
  retryFailed(maxRetries: number = DEFAULT_MAX_RETRIES): string[] {
    const retried: string[] = [];

    for (const item of this.queue.values()) {
      if (item.status !== "failed") continue;

      item.status = "pending";
      item.retryCount = 0;
      item.maxRetries = maxRetries;
      item.error = undefined;
      retried.push(item.id);
    }

    this.recountState();
    return retried;
  }

  /**
   * Reset a specific item for retry.
   */
  retryItem(itemId: string): boolean {
    const item = this.queue.get(itemId);
    if (!item) return false;

    if (item.status === "failed" || item.status === "conflict") {
      item.status = "pending";
      item.retryCount = 0;
      item.error = undefined;
      this.recountState();
      return true;
    }

    return false;
  }

  // ── Delta Sync ──────────────────────────────────────────────────────────

  /**
   * Get all local changes since a given timestamp. Used to build a delta
   * packet for efficient sync (only send what changed).
   */
  getDelta(since: number): DeltaPacket {
    const changes: DeltaChange[] = [];

    for (const item of this.queue.values()) {
      if (item.timestamp > since) {
        changes.push({
          operation: item.operation,
          entityType: item.entityType,
          entityId: item.entityId,
          data: { ...item.data },
          timestamp: item.timestamp,
        });
      }
    }

    changes.sort((a, b) => a.timestamp - b.timestamp);

    return {
      since,
      until: Date.now(),
      deviceId: this.state.deviceId,
      changes,
    };
  }

  /**
   * Apply a delta packet from the server. Updates the local store
   * without going through the sync queue (these are already confirmed
   * server-side changes).
   */
  applyDelta(delta: DeltaPacket): { applied: number; skipped: number } {
    let applied = 0;
    let skipped = 0;

    for (const change of delta.changes) {
      // Skip changes from this device (we already have them)
      if (delta.deviceId === this.state.deviceId) {
        skipped++;
        continue;
      }

      // Check if we have a conflicting pending change
      const pending = this.findPendingForEntity(
        change.entityType,
        change.entityId
      );

      if (pending) {
        // Server change came in while we have a pending local change
        // Mark as conflict so user or auto-resolution can handle it
        const hasConflict = this.detectConflict(pending.data, change.data);
        if (hasConflict) {
          pending.status = "conflict";
          this.resolveConflict(pending, change.data);
          skipped++;
          continue;
        }
      }

      // Apply the change to local store
      this.storeLocally(
        change.entityType,
        change.entityId,
        change.operation,
        change.data
      );
      applied++;
    }

    if (delta.until > this.state.lastSyncTimestamp) {
      this.state.lastSyncTimestamp = delta.until;
    }

    this.recountState();
    return { applied, skipped };
  }

  // ── Local Store ─────────────────────────────────────────────────────────

  /**
   * Get a locally stored entity.
   */
  getLocal(entityType: string, entityId: string): Record<string, unknown> | null {
    const typeStore = this.localStore.get(entityType);
    if (!typeStore) return null;
    return typeStore.get(entityId) ?? null;
  }

  /**
   * Get all locally stored entities of a given type.
   */
  getLocalAll(entityType: string): Record<string, unknown>[] {
    const typeStore = this.localStore.get(entityType);
    if (!typeStore) return [];
    return Array.from(typeStore.values());
  }

  // ── Internal Helpers ────────────────────────────────────────────────────

  /** Find an existing pending/failed queue item for the same entity. */
  private findPendingForEntity(
    entityType: string,
    entityId: string
  ): SyncQueueItem | null {
    for (const item of this.queue.values()) {
      if (
        item.entityType === entityType &&
        item.entityId === entityId &&
        (item.status === "pending" || item.status === "failed" || item.status === "conflict")
      ) {
        return item;
      }
    }
    return null;
  }

  /**
   * Coalesce a new operation with an existing queued item for the same entity.
   */
  private coalesce(
    existing: SyncQueueItem,
    newOperation: SyncOperation,
    newData: Record<string, unknown>
  ): SyncQueueItem {
    if (existing.operation === "create" && newOperation === "update") {
      // Merge the update into the create
      existing.data = { ...existing.data, ...newData };
      existing.timestamp = Date.now();
      return existing;
    }

    if (existing.operation === "create" && newOperation === "delete") {
      // Create followed by delete = no-op: remove from queue
      this.queue.delete(existing.id);
      this.removeLocal(existing.entityType, existing.entityId);
      existing.status = "synced";
      this.recountState();
      return existing;
    }

    if (existing.operation === "update" && newOperation === "update") {
      // Merge updates
      existing.data = { ...existing.data, ...newData };
      existing.timestamp = Date.now();
      return existing;
    }

    if (existing.operation === "update" && newOperation === "delete") {
      // Update followed by delete = just delete
      existing.operation = "delete";
      existing.data = {};
      existing.timestamp = Date.now();
      this.removeLocal(existing.entityType, existing.entityId);
      return existing;
    }

    // For any other combination, replace the existing item
    existing.operation = newOperation;
    existing.data = { ...newData };
    existing.timestamp = Date.now();
    existing.status = "pending";
    existing.retryCount = 0;
    existing.error = undefined;

    this.storeLocally(existing.entityType, existing.entityId, newOperation, newData);
    this.recountState();
    return existing;
  }

  /** Store entity data in the local cache. */
  private storeLocally(
    entityType: string,
    entityId: string,
    operation: SyncOperation,
    data: Record<string, unknown>
  ): void {
    if (operation === "delete") {
      this.removeLocal(entityType, entityId);
      return;
    }

    let typeStore = this.localStore.get(entityType);
    if (!typeStore) {
      typeStore = new Map();
      this.localStore.set(entityType, typeStore);
    }

    const existing = typeStore.get(entityId);
    if (existing && operation === "update") {
      typeStore.set(entityId, { ...existing, ...data });
    } else {
      typeStore.set(entityId, { ...data });
    }
  }

  /** Remove an entity from the local cache. */
  private removeLocal(entityType: string, entityId: string): void {
    const typeStore = this.localStore.get(entityType);
    if (typeStore) {
      typeStore.delete(entityId);
    }
  }

  /** Recount pending/failed/conflict totals from the queue. */
  private recountState(): void {
    let pending = 0;
    let failed = 0;
    let conflict = 0;

    for (const item of this.queue.values()) {
      switch (item.status) {
        case "pending":
          pending++;
          break;
        case "failed":
          failed++;
          break;
        case "conflict":
          conflict++;
          break;
      }
    }

    this.state.pendingCount = pending;
    this.state.failedCount = failed;
    this.state.conflictCount = conflict;
  }
}

// ─── Utility Functions ────────────────────────────────────────────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}

// ─── Factory Export ───────────────────────────────────────────────────────────

export function createSyncEngine(deviceId: string): SyncEngine {
  return new SyncEngine(deviceId);
}

export { SyncEngine };
