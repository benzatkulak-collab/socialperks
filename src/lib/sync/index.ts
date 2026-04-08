/**
 * Offline-First Sync Engine — Production-Grade CRDT-Based Sync System
 *
 * Provides conflict-free replication across distributed nodes (browser tabs,
 * mobile devices, server replicas) using CRDTs, an append-only operation log,
 * pluggable conflict resolution, and a background sync manager with exponential
 * backoff and bandwidth-aware batching.
 *
 * Architecture:
 *  1. CRDTs (LWW Register, G-Counter, OR-Set) — local conflict-free merging
 *  2. OperationLog — append-only, compactable log of all mutations
 *  3. ConflictResolver — pluggable strategies per entity/field
 *  4. SyncProtocol — request/response framing for push+pull sync
 *  5. SyncManager — background orchestrator with auto-sync, backoff, events
 */

// ─── ID Generation ──────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}

function generateTag(): string {
  return crypto.randomUUID();
}

// ─── Deep Equality ──────────────────────────────────────────────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CRDTs — Conflict-Free Replicated Data Types
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ──────────────────────────────────────────────────────────────────

/** State envelope for any CRDT value. */
export interface CRDTState<T> {
  value: T;
  timestamp: number;
  nodeId: string;
}

// ─── LWW Register (Last-Writer-Wins) ────────────────────────────────────────

/**
 * Last-Writer-Wins Register. Stores a single scalar value. On merge the value
 * with the highest timestamp wins; ties are broken by lexicographic nodeId
 * comparison so the result is deterministic across all replicas.
 */
export class LWWRegister<T> {
  private state: CRDTState<T>;

  constructor(value: T, nodeId: string, timestamp?: number) {
    this.state = {
      value,
      timestamp: timestamp ?? Date.now(),
      nodeId,
    };
  }

  /** Get the current value. */
  get value(): T {
    return this.state.value;
  }

  /** Get the current timestamp. */
  get timestamp(): number {
    return this.state.timestamp;
  }

  /** Get the owning node ID. */
  get nodeId(): string {
    return this.state.nodeId;
  }

  /** Get a snapshot of the full internal state. */
  getState(): CRDTState<T> {
    return { ...this.state };
  }

  /**
   * Set a new value. Only applies if the new timestamp is strictly greater
   * than the current one, or equal with a higher nodeId (deterministic tiebreak).
   */
  set(value: T, nodeId: string, timestamp?: number): void {
    const ts = timestamp ?? Date.now();
    if (
      ts > this.state.timestamp ||
      (ts === this.state.timestamp && nodeId > this.state.nodeId)
    ) {
      this.state = { value, timestamp: ts, nodeId };
    }
  }

  /**
   * Merge with a remote register state. The higher-timestamp value wins;
   * ties broken by nodeId.
   */
  merge(remote: CRDTState<T>): void {
    this.set(remote.value, remote.nodeId, remote.timestamp);
  }
}

// ─── G-Counter (Grow-Only Counter) ──────────────────────────────────────────

/**
 * Grow-Only Counter. Each node increments its own slot independently.
 * The total is the sum of all slots. Merge takes the max of each slot
 * so the counter never decreases.
 */
export class GCounter {
  private counts: Map<string, number>;
  private readonly nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.counts = new Map<string, number>();
    this.counts.set(nodeId, 0);
  }

  /** The total count across all nodes. */
  get value(): number {
    let sum = 0;
    for (const v of this.counts.values()) {
      sum += v;
    }
    return sum;
  }

  /** Increment this node's counter by the given amount (default 1). */
  increment(amount: number = 1): void {
    if (amount < 0) {
      throw new Error("GCounter only supports non-negative increments");
    }
    const current = this.counts.get(this.nodeId) ?? 0;
    this.counts.set(this.nodeId, current + amount);
  }

  /** Get the full state map (nodeId -> count). */
  getState(): Record<string, number> {
    const state: Record<string, number> = {};
    for (const [k, v] of this.counts) {
      state[k] = v;
    }
    return state;
  }

  /**
   * Merge with a remote counter. For every node the max of local and
   * remote values is kept, guaranteeing monotonic growth.
   */
  merge(remoteState: Record<string, number>): void {
    for (const [nodeId, remoteCount] of Object.entries(remoteState)) {
      const localCount = this.counts.get(nodeId) ?? 0;
      this.counts.set(nodeId, Math.max(localCount, remoteCount));
    }
  }
}

// ─── OR-Set (Observed-Remove Set) ───────────────────────────────────────────

/**
 * Unique-tagged element inside an OR-Set.
 * Every add() generates a fresh tag so that a concurrent remove of the
 * same logical element only removes the specific observations it has seen.
 */
export interface ORSetElement<T> {
  value: T;
  tag: string;
}

/**
 * Observed-Remove Set. Supports both add and remove without anomalies.
 *
 * Semantics:
 * - add(e) inserts a new (value, unique-tag) pair.
 * - remove(e) removes all (value, *) pairs currently observed locally.
 * - A concurrent add on another node whose tag hasn't been observed
 *   locally will survive a concurrent remove — "add wins" by default.
 */
export class ORSet<T> {
  private elements: Map<string, ORSetElement<T>>; // tag -> element
  private tombstones: Set<string>; // removed tags

  constructor() {
    this.elements = new Map<string, ORSetElement<T>>();
    this.tombstones = new Set<string>();
  }

  /** The current set of unique values. */
  get values(): T[] {
    const seen = new Set<string>();
    const result: T[] = [];
    for (const el of this.elements.values()) {
      const key = JSON.stringify(el.value);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(el.value);
      }
    }
    return result;
  }

  /** Check if a value is present in the set. */
  has(value: T): boolean {
    const needle = JSON.stringify(value);
    for (const el of this.elements.values()) {
      if (JSON.stringify(el.value) === needle) return true;
    }
    return false;
  }

  /** Number of unique values. */
  get size(): number {
    return this.values.length;
  }

  /**
   * Add a value. Creates a new unique tag so that concurrent adds
   * of the same value on different nodes both survive merge.
   */
  add(value: T): string {
    const tag = generateTag();
    this.elements.set(tag, { value, tag });
    return tag;
  }

  /**
   * Remove a value. Tombstones all tags currently associated with
   * the value on this replica. Tags added concurrently on other
   * replicas will survive (add-wins semantics).
   */
  remove(value: T): string[] {
    const needle = JSON.stringify(value);
    const removedTags: string[] = [];

    for (const [tag, el] of this.elements) {
      if (JSON.stringify(el.value) === needle) {
        this.elements.delete(tag);
        this.tombstones.add(tag);
        removedTags.push(tag);
      }
    }

    return removedTags;
  }

  /** Get the full state for replication: active elements + tombstones. */
  getState(): { elements: Array<ORSetElement<T>>; tombstones: string[] } {
    return {
      elements: Array.from(this.elements.values()),
      tombstones: Array.from(this.tombstones),
    };
  }

  /**
   * Merge with a remote OR-Set state.
   *
   * 1. Any remote tombstone removes the corresponding local element.
   * 2. Any remote element whose tag is not in our tombstones is added.
   * 3. Our existing tombstones are preserved (union of tombstones).
   */
  merge(remote: { elements: Array<ORSetElement<T>>; tombstones: string[] }): void {
    // Union tombstones first
    for (const tag of remote.tombstones) {
      this.tombstones.add(tag);
      this.elements.delete(tag);
    }

    // Add remote elements not tombstoned locally
    for (const el of remote.elements) {
      if (!this.tombstones.has(el.tag)) {
        this.elements.set(el.tag, el);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Operation Log
// ═══════════════════════════════════════════════════════════════════════════════

/** A single mutation recorded in the operation log. */
export interface SyncOperation {
  id: string;
  entityType: string;
  entityId: string;
  operationType: "create" | "update" | "delete";
  field: string | null;
  value: unknown;
  previousValue: unknown;
  timestamp: number;
  nodeId: string;
  synced: boolean;
  syncedAt: number | null;
  conflictResolution: "client_wins" | "server_wins" | "merged" | null;
  retryCount: number;
}

/**
 * Append-only log of all local mutations. Supports querying by entity,
 * filtering unsynced operations, marking synced, and compacting old
 * fully-synced entries to bound memory usage.
 */
export class OperationLog {
  private operations: Map<string, SyncOperation> = new Map();
  private entityIndex: Map<string, Set<string>> = new Map(); // "type:id" -> op IDs
  private readonly nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  /** Total number of operations in the log. */
  get length(): number {
    return this.operations.size;
  }

  /**
   * Append a new operation to the log.
   */
  append(params: {
    entityType: string;
    entityId: string;
    operationType: "create" | "update" | "delete";
    field?: string | null;
    value?: unknown;
    previousValue?: unknown;
  }): SyncOperation {
    const op: SyncOperation = {
      id: `op_${generateId()}`,
      entityType: params.entityType,
      entityId: params.entityId,
      operationType: params.operationType,
      field: params.field ?? null,
      value: params.value ?? null,
      previousValue: params.previousValue ?? null,
      timestamp: Date.now(),
      nodeId: this.nodeId,
      synced: false,
      syncedAt: null,
      conflictResolution: null,
      retryCount: 0,
    };

    this.operations.set(op.id, op);

    // Update entity index
    const key = `${params.entityType}:${params.entityId}`;
    let ids = this.entityIndex.get(key);
    if (!ids) {
      ids = new Set();
      this.entityIndex.set(key, ids);
    }
    ids.add(op.id);

    return op;
  }

  /** Get a single operation by ID. */
  get(id: string): SyncOperation | null {
    return this.operations.get(id) ?? null;
  }

  /** Get all operations ordered by timestamp. */
  getAll(): SyncOperation[] {
    return Array.from(this.operations.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );
  }

  /** Get all unsynced (pending) operations in timestamp order. */
  getPending(): SyncOperation[] {
    return this.getAll().filter((op) => !op.synced);
  }

  /**
   * Mark one or more operations as synced.
   */
  markSynced(
    operationIds: string | string[],
    resolution?: "client_wins" | "server_wins" | "merged" | null
  ): number {
    const ids = Array.isArray(operationIds) ? operationIds : [operationIds];
    let count = 0;
    const now = Date.now();

    for (const id of ids) {
      const op = this.operations.get(id);
      if (op && !op.synced) {
        op.synced = true;
        op.syncedAt = now;
        if (resolution !== undefined) {
          op.conflictResolution = resolution ?? null;
        }
        count++;
      }
    }

    return count;
  }

  /**
   * Increment the retry count for an operation.
   */
  incrementRetry(operationId: string): number {
    const op = this.operations.get(operationId);
    if (!op) return -1;
    op.retryCount++;
    return op.retryCount;
  }

  /** Get all operations for a specific entity. */
  getByEntity(entityType: string, entityId: string): SyncOperation[] {
    const key = `${entityType}:${entityId}`;
    const ids = this.entityIndex.get(key);
    if (!ids) return [];

    return Array.from(ids)
      .map((id) => this.operations.get(id))
      .filter((op): op is SyncOperation => op !== undefined)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Compact the log by removing all fully-synced operations older than
   * the given cutoff timestamp. Returns the number of operations removed.
   */
  compact(olderThan?: number): number {
    const cutoff = olderThan ?? Date.now() - 24 * 60 * 60 * 1000; // default: 24h
    let removed = 0;

    for (const [id, op] of this.operations) {
      if (op.synced && op.timestamp < cutoff) {
        this.operations.delete(id);

        // Clean up entity index
        const key = `${op.entityType}:${op.entityId}`;
        const ids = this.entityIndex.get(key);
        if (ids) {
          ids.delete(id);
          if (ids.size === 0) {
            this.entityIndex.delete(key);
          }
        }

        removed++;
      }
    }

    return removed;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Conflict Resolution
// ═══════════════════════════════════════════════════════════════════════════════

export type ConflictStrategy =
  | "client_wins"
  | "server_wins"
  | "last_write_wins"
  | "merge"
  | "manual";

export interface ConflictResult {
  resolved: boolean;
  strategy: ConflictStrategy;
  resolvedValue: unknown;
  clientValue: unknown;
  serverValue: unknown;
}

/** Per-field conflict strategy configuration. */
export interface FieldStrategy {
  field: string;
  strategy: ConflictStrategy;
  /** Optional custom merge function for this field. */
  mergeFn?: (clientValue: unknown, serverValue: unknown) => unknown;
}

/**
 * Conflict resolver with pluggable per-entity and per-field strategies.
 *
 * Resolution priority:
 *  1. Per-field strategy (if registered)
 *  2. Per-entity-type strategy (if registered)
 *  3. Default strategy (last_write_wins)
 */
export class ConflictResolver {
  private defaultStrategy: ConflictStrategy;
  private entityStrategies: Map<string, ConflictStrategy> = new Map();
  private fieldStrategies: Map<string, FieldStrategy> = new Map(); // "entity:field" -> strategy
  private manualQueue: Array<{
    clientOp: SyncOperation;
    serverOp: SyncOperation;
  }> = [];

  constructor(defaultStrategy: ConflictStrategy = "last_write_wins") {
    this.defaultStrategy = defaultStrategy;
  }

  /** Set the default strategy for all unregistered entity types. */
  setDefaultStrategy(strategy: ConflictStrategy): void {
    this.defaultStrategy = strategy;
  }

  /** Register a strategy for a specific entity type. */
  setEntityStrategy(entityType: string, strategy: ConflictStrategy): void {
    this.entityStrategies.set(entityType, strategy);
  }

  /** Register a per-field strategy. */
  setFieldStrategy(
    entityType: string,
    field: string,
    strategy: ConflictStrategy,
    mergeFn?: (clientValue: unknown, serverValue: unknown) => unknown
  ): void {
    const key = `${entityType}:${field}`;
    this.fieldStrategies.set(key, { field, strategy, mergeFn });
  }

  /**
   * Detect whether two operations on the same entity conflict.
   *
   * A conflict exists when:
   * - Both operations target the same entity
   * - Both are writes (create/update) or one deletes what the other modified
   * - They originate from different nodes
   * - They have overlapping timestamps (neither was aware of the other)
   */
  detectConflict(
    clientOp: SyncOperation,
    serverOp: SyncOperation
  ): boolean {
    // Same node cannot conflict with itself
    if (clientOp.nodeId === serverOp.nodeId) return false;

    // Must be the same entity
    if (
      clientOp.entityType !== serverOp.entityType ||
      clientOp.entityId !== serverOp.entityId
    ) {
      return false;
    }

    // Delete vs any write = conflict
    if (
      clientOp.operationType === "delete" ||
      serverOp.operationType === "delete"
    ) {
      return true;
    }

    // Both are creates or updates — if they touch the same field it's a conflict
    if (clientOp.field && serverOp.field) {
      return clientOp.field === serverOp.field;
    }

    // If either has no field (whole-entity update), it's a conflict
    if (!clientOp.field || !serverOp.field) {
      return true;
    }

    return false;
  }

  /**
   * Resolve a conflict between a client and server operation.
   */
  resolve(
    clientOp: SyncOperation,
    serverOp: SyncOperation
  ): ConflictResult {
    const entityType = clientOp.entityType;
    const field = clientOp.field;

    // Check per-field strategy first
    if (field) {
      const fieldKey = `${entityType}:${field}`;
      const fieldStrat = this.fieldStrategies.get(fieldKey);
      if (fieldStrat) {
        return this.resolveField(
          clientOp.value,
          serverOp.value,
          fieldStrat.strategy,
          fieldStrat.mergeFn
        );
      }
    }

    // Then per-entity strategy
    const entityStrat = this.entityStrategies.get(entityType);
    const strategy = entityStrat ?? this.defaultStrategy;

    return this.applyStrategy(strategy, clientOp, serverOp);
  }

  /**
   * Resolve a field-level conflict using a specific strategy and optional
   * custom merge function.
   */
  resolveField(
    clientValue: unknown,
    serverValue: unknown,
    strategy: ConflictStrategy,
    mergeFn?: (clientValue: unknown, serverValue: unknown) => unknown
  ): ConflictResult {
    switch (strategy) {
      case "client_wins":
        return {
          resolved: true,
          strategy,
          resolvedValue: clientValue,
          clientValue,
          serverValue,
        };

      case "server_wins":
        return {
          resolved: true,
          strategy,
          resolvedValue: serverValue,
          clientValue,
          serverValue,
        };

      case "merge": {
        let resolvedValue: unknown;

        if (mergeFn) {
          resolvedValue = mergeFn(clientValue, serverValue);
        } else {
          resolvedValue = this.autoMergeValues(clientValue, serverValue);
        }

        return {
          resolved: true,
          strategy,
          resolvedValue,
          clientValue,
          serverValue,
        };
      }

      case "last_write_wins":
        // Without timestamps on the values themselves, client wins (it's newer)
        return {
          resolved: true,
          strategy,
          resolvedValue: clientValue,
          clientValue,
          serverValue,
        };

      case "manual":
        return {
          resolved: false,
          strategy,
          resolvedValue: null,
          clientValue,
          serverValue,
        };
    }
  }

  /** Get operations queued for manual resolution. */
  getManualQueue(): Array<{ clientOp: SyncOperation; serverOp: SyncOperation }> {
    return [...this.manualQueue];
  }

  /** Clear manual queue after resolutions are applied. */
  clearManualQueue(): void {
    this.manualQueue.length = 0;
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private applyStrategy(
    strategy: ConflictStrategy,
    clientOp: SyncOperation,
    serverOp: SyncOperation
  ): ConflictResult {
    switch (strategy) {
      case "client_wins":
        return {
          resolved: true,
          strategy,
          resolvedValue: clientOp.value,
          clientValue: clientOp.value,
          serverValue: serverOp.value,
        };

      case "server_wins":
        return {
          resolved: true,
          strategy,
          resolvedValue: serverOp.value,
          clientValue: clientOp.value,
          serverValue: serverOp.value,
        };

      case "last_write_wins": {
        const winner =
          clientOp.timestamp >= serverOp.timestamp ? clientOp : serverOp;
        return {
          resolved: true,
          strategy,
          resolvedValue: winner.value,
          clientValue: clientOp.value,
          serverValue: serverOp.value,
        };
      }

      case "merge": {
        const resolvedValue = this.autoMergeValues(
          clientOp.value,
          serverOp.value
        );
        return {
          resolved: true,
          strategy,
          resolvedValue,
          clientValue: clientOp.value,
          serverValue: serverOp.value,
        };
      }

      case "manual":
        this.manualQueue.push({ clientOp, serverOp });
        return {
          resolved: false,
          strategy,
          resolvedValue: null,
          clientValue: clientOp.value,
          serverValue: serverOp.value,
        };
    }
  }

  /**
   * Automatic value merge heuristics:
   * - Arrays: union (deduplicated by JSON)
   * - Objects: recursive merge (client keys win on collision)
   * - Scalars: client wins
   */
  private autoMergeValues(clientValue: unknown, serverValue: unknown): unknown {
    // Both arrays: union
    if (Array.isArray(clientValue) && Array.isArray(serverValue)) {
      const seen = new Set<string>();
      const merged: unknown[] = [];

      for (const item of [...serverValue, ...clientValue]) {
        const key = JSON.stringify(item);
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(item);
        }
      }
      return merged;
    }

    // Both plain objects: recursive merge
    if (isPlainObject(clientValue) && isPlainObject(serverValue)) {
      const merged: Record<string, unknown> = { ...serverValue };
      for (const [key, val] of Object.entries(clientValue)) {
        if (key in merged) {
          merged[key] = this.autoMergeValues(val, merged[key]);
        } else {
          merged[key] = val;
        }
      }
      return merged;
    }

    // Scalars or mixed types: client wins
    return clientValue;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Sync Protocol
// ═══════════════════════════════════════════════════════════════════════════════

/** Outbound sync request (client -> server). */
export interface SyncRequest {
  nodeId: string;
  lastSyncTimestamp: number;
  operations: SyncOperation[];
  clientVersion: number;
}

/** Inbound sync response (server -> client). */
export interface SyncResponse {
  serverOperations: SyncOperation[];
  conflicts: ConflictResult[];
  serverVersion: number;
  syncTimestamp: number;
  acknowledgements: string[]; // operation IDs acknowledged
}

/**
 * Transport function signature. Implementors send the SyncRequest to the
 * server and return a SyncResponse. Throwing means network/transport failure.
 */
export type SyncTransportFn = (request: SyncRequest) => Promise<SyncResponse>;

/**
 * Sync Protocol — framing layer between the local OperationLog and a
 * remote server. Prepares requests, processes responses, detects and
 * resolves conflicts, and drives full or incremental sync cycles.
 */
export class SyncProtocol {
  private readonly nodeId: string;
  private readonly operationLog: OperationLog;
  private readonly conflictResolver: ConflictResolver;
  private transport: SyncTransportFn | null = null;
  private clientVersion: number = 0;
  private lastSyncTimestamp: number = 0;

  constructor(
    nodeId: string,
    operationLog: OperationLog,
    conflictResolver: ConflictResolver
  ) {
    this.nodeId = nodeId;
    this.operationLog = operationLog;
    this.conflictResolver = conflictResolver;
  }

  /** Register the transport function used to communicate with the server. */
  setTransport(transport: SyncTransportFn): void {
    this.transport = transport;
  }

  /** Get the last successful sync timestamp. */
  getLastSyncTimestamp(): number {
    return this.lastSyncTimestamp;
  }

  /** Get the current client version counter. */
  getClientVersion(): number {
    return this.clientVersion;
  }

  /**
   * Build a SyncRequest from all pending (unsynced) operations.
   */
  prepareSyncRequest(): SyncRequest {
    const pending = this.operationLog.getPending();
    return {
      nodeId: this.nodeId,
      lastSyncTimestamp: this.lastSyncTimestamp,
      operations: pending,
      clientVersion: this.clientVersion,
    };
  }

  /**
   * Process a SyncResponse from the server:
   *  1. Mark acknowledged operations as synced
   *  2. Detect conflicts between server ops and local pending ops
   *  3. Resolve conflicts using the ConflictResolver
   *  4. Update version and timestamp bookkeeping
   */
  processSyncResponse(response: SyncResponse): {
    applied: number;
    conflicts: ConflictResult[];
    acknowledged: number;
  } {
    let applied = 0;
    const conflicts: ConflictResult[] = [];

    // 1. Mark acknowledged operations as synced
    const acknowledged = this.operationLog.markSynced(response.acknowledgements);

    // 2. Process server operations
    const localPending = this.operationLog.getPending();

    for (const serverOp of response.serverOperations) {
      // Check for conflicts with local pending operations
      let conflicted = false;

      for (const localOp of localPending) {
        if (this.conflictResolver.detectConflict(localOp, serverOp)) {
          const result = this.conflictResolver.resolve(localOp, serverOp);
          conflicts.push(result);
          conflicted = true;

          // If resolved, mark the local operation synced with the resolution
          if (result.resolved) {
            const resolution =
              result.strategy === "client_wins"
                ? "client_wins" as const
                : result.strategy === "server_wins"
                  ? "server_wins" as const
                  : "merged" as const;
            this.operationLog.markSynced(localOp.id, resolution);
          }
          break;
        }
      }

      if (!conflicted) {
        applied++;
      }
    }

    // 3. Include any conflicts from the response itself
    for (const conflict of response.conflicts) {
      conflicts.push(conflict);
    }

    // 4. Update bookkeeping
    this.clientVersion = response.serverVersion;
    this.lastSyncTimestamp = response.syncTimestamp;

    return { applied, conflicts, acknowledged };
  }

  /**
   * Full sync cycle: push all pending operations, pull server changes,
   * resolve any conflicts.
   */
  async fullSync(): Promise<{
    success: boolean;
    applied: number;
    conflicts: ConflictResult[];
    acknowledged: number;
    error?: string;
  }> {
    if (!this.transport) {
      return {
        success: false,
        applied: 0,
        conflicts: [],
        acknowledged: 0,
        error: "No transport configured",
      };
    }

    try {
      const request = this.prepareSyncRequest();
      const response = await this.transport(request);
      const result = this.processSyncResponse(response);

      return {
        success: true,
        ...result,
      };
    } catch (err) {
      return {
        success: false,
        applied: 0,
        conflicts: [],
        acknowledged: 0,
        error: err instanceof Error ? err.message : "Unknown sync error",
      };
    }
  }

  /**
   * Incremental sync — only sends operations created since the last
   * successful sync. Lighter than fullSync when most history is already
   * acknowledged.
   */
  async incrementalSync(): Promise<{
    success: boolean;
    applied: number;
    conflicts: ConflictResult[];
    acknowledged: number;
    error?: string;
  }> {
    if (!this.transport) {
      return {
        success: false,
        applied: 0,
        conflicts: [],
        acknowledged: 0,
        error: "No transport configured",
      };
    }

    try {
      // Filter pending ops to only those after last sync
      const allPending = this.operationLog.getPending();
      const recentPending = allPending.filter(
        (op) => op.timestamp > this.lastSyncTimestamp
      );

      const request: SyncRequest = {
        nodeId: this.nodeId,
        lastSyncTimestamp: this.lastSyncTimestamp,
        operations: recentPending,
        clientVersion: this.clientVersion,
      };

      const response = await this.transport(request);
      const result = this.processSyncResponse(response);

      return {
        success: true,
        ...result,
      };
    } catch (err) {
      return {
        success: false,
        applied: 0,
        conflicts: [],
        acknowledged: 0,
        error: err instanceof Error ? err.message : "Unknown sync error",
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Background Sync Manager
// ═══════════════════════════════════════════════════════════════════════════════

/** Current status of the sync manager. */
export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  lastSyncTime: number | null;
  lastSyncSuccess: boolean;
  pendingOperations: number;
  consecutiveFailures: number;
  nextSyncIn: number | null; // ms until next scheduled sync
  batchSize: number;
}

/** Events emitted by the SyncManager. */
export type SyncEventType =
  | "sync_start"
  | "sync_complete"
  | "sync_error"
  | "conflict"
  | "online"
  | "offline"
  | "status_change";

export interface SyncEvent {
  type: SyncEventType;
  timestamp: number;
  data?: unknown;
}

/** Configuration for the SyncManager. */
export interface SyncManagerConfig {
  /** Sync interval in milliseconds. Default: 30000 (30s). */
  syncInterval: number;
  /** Maximum batch size per sync. Default: 50. */
  maxBatchSize: number;
  /** Minimum batch size. Default: 5. */
  minBatchSize: number;
  /** Maximum consecutive failures before pausing auto-sync. Default: 10. */
  maxConsecutiveFailures: number;
  /** Base backoff in ms. Default: 1000 (1s). */
  backoffBase: number;
  /** Maximum backoff in ms. Default: 300000 (5min). */
  backoffMax: number;
  /** Backoff multiplier. Default: 2. */
  backoffMultiplier: number;
  /** Add jitter to backoff. Default: true. */
  backoffJitter: boolean;
  /** Compact log after this many synced operations. Default: 100. */
  compactThreshold: number;
}

const DEFAULT_SYNC_CONFIG: SyncManagerConfig = {
  syncInterval: 30_000,
  maxBatchSize: 50,
  minBatchSize: 5,
  maxConsecutiveFailures: 10,
  backoffBase: 1_000,
  backoffMax: 300_000,
  backoffMultiplier: 2,
  backoffJitter: true,
  compactThreshold: 100,
};

type SyncEventHandler = (event: SyncEvent) => void;

/**
 * Background Sync Manager — orchestrates periodic sync, exponential
 * backoff, network detection, bandwidth-aware batching, and event
 * dispatch for conflict handlers and completion listeners.
 */
export class SyncManager {
  private readonly config: SyncManagerConfig;
  private readonly protocol: SyncProtocol;
  private readonly operationLog: OperationLog;

  // State
  private online: boolean = true;
  private syncing: boolean = false;
  private autoSyncActive: boolean = false;
  private lastSyncTime: number | null = null;
  private lastSyncSuccess: boolean = true;
  private consecutiveFailures: number = 0;
  private syncedSinceCompact: number = 0;
  private currentBatchSize: number;

  // Timer
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private nextSyncAt: number | null = null;

  // Event handlers
  private handlers: Map<SyncEventType, Set<SyncEventHandler>> = new Map();

  constructor(
    protocol: SyncProtocol,
    operationLog: OperationLog,
    config?: Partial<SyncManagerConfig>
  ) {
    this.protocol = protocol;
    this.operationLog = operationLog;
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.currentBatchSize = this.config.maxBatchSize;
  }

  // ── Auto Sync ──────────────────────────────────────────────────────────────

  /** Start periodic auto-sync at the configured interval. */
  startAutoSync(): void {
    if (this.autoSyncActive) return;
    this.autoSyncActive = true;
    this.scheduleNextSync(this.config.syncInterval);
  }

  /** Stop periodic auto-sync. Does not cancel an in-progress sync. */
  stopAutoSync(): void {
    this.autoSyncActive = false;
    if (this.syncTimer !== null) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    this.nextSyncAt = null;
  }

  /** Whether auto-sync is currently active. */
  isAutoSyncActive(): boolean {
    return this.autoSyncActive;
  }

  // ── Immediate Sync ─────────────────────────────────────────────────────────

  /**
   * Trigger an immediate sync. If a sync is already in progress, returns
   * the result when it finishes (does not double-sync).
   */
  async syncNow(): Promise<{
    success: boolean;
    applied: number;
    conflicts: ConflictResult[];
    acknowledged: number;
    error?: string;
  }> {
    if (this.syncing) {
      return {
        success: false,
        applied: 0,
        conflicts: [],
        acknowledged: 0,
        error: "Sync already in progress",
      };
    }

    return this.performSync();
  }

  // ── Status ─────────────────────────────────────────────────────────────────

  /** Get the current sync status snapshot. */
  getStatus(): SyncStatus {
    const now = Date.now();
    return {
      online: this.online,
      syncing: this.syncing,
      lastSyncTime: this.lastSyncTime,
      lastSyncSuccess: this.lastSyncSuccess,
      pendingOperations: this.operationLog.getPending().length,
      consecutiveFailures: this.consecutiveFailures,
      nextSyncIn:
        this.nextSyncAt !== null ? Math.max(0, this.nextSyncAt - now) : null,
      batchSize: this.currentBatchSize,
    };
  }

  // ── Network Status ─────────────────────────────────────────────────────────

  /** Manually set the network status (for environments without navigator). */
  setOnline(online: boolean): void {
    const wasOnline = this.online;
    this.online = online;

    if (online && !wasOnline) {
      this.emit({ type: "online", timestamp: Date.now() });
      // Come back online: sync immediately if auto-sync is active
      if (this.autoSyncActive) {
        this.scheduleNextSync(0);
      }
    } else if (!online && wasOnline) {
      this.emit({ type: "offline", timestamp: Date.now() });
    }
  }

  /** Get current online status. */
  isOnline(): boolean {
    return this.online;
  }

  // ── Event Handlers ─────────────────────────────────────────────────────────

  /** Register a handler for a specific event type. Returns an unsubscribe function. */
  on(type: SyncEventType, handler: SyncEventHandler): () => void {
    let handlers = this.handlers.get(type);
    if (!handlers) {
      handlers = new Set();
      this.handlers.set(type, handlers);
    }
    handlers.add(handler);

    return () => {
      handlers!.delete(handler);
    };
  }

  /** Register a handler for conflict events. Convenience wrapper. */
  onConflict(
    handler: (conflicts: ConflictResult[]) => void
  ): () => void {
    return this.on("conflict", (event) => {
      handler(event.data as ConflictResult[]);
    });
  }

  /** Register a handler for sync completion. Convenience wrapper. */
  onSyncComplete(
    handler: (result: {
      success: boolean;
      applied: number;
      conflicts: ConflictResult[];
      acknowledged: number;
    }) => void
  ): () => void {
    return this.on("sync_complete", (event) => {
      handler(
        event.data as {
          success: boolean;
          applied: number;
          conflicts: ConflictResult[];
          acknowledged: number;
        }
      );
    });
  }

  /** Remove all event handlers. */
  removeAllHandlers(): void {
    this.handlers.clear();
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  /** Stop auto-sync and clean up all resources. */
  destroy(): void {
    this.stopAutoSync();
    this.removeAllHandlers();
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private async performSync(): Promise<{
    success: boolean;
    applied: number;
    conflicts: ConflictResult[];
    acknowledged: number;
    error?: string;
  }> {
    if (!this.online) {
      return {
        success: false,
        applied: 0,
        conflicts: [],
        acknowledged: 0,
        error: "Offline",
      };
    }

    this.syncing = true;
    this.emit({ type: "sync_start", timestamp: Date.now() });
    this.emitStatusChange();

    try {
      // Use incremental sync for efficiency
      const result = await this.protocol.incrementalSync();

      this.syncing = false;
      this.lastSyncTime = Date.now();

      if (result.success) {
        this.lastSyncSuccess = true;
        this.consecutiveFailures = 0;

        // Increase batch size on success (bandwidth is good)
        this.adjustBatchSize(true);

        // Track synced ops for compaction
        this.syncedSinceCompact += result.acknowledged;
        if (this.syncedSinceCompact >= this.config.compactThreshold) {
          this.operationLog.compact();
          this.syncedSinceCompact = 0;
        }

        // Emit events
        this.emit({
          type: "sync_complete",
          timestamp: Date.now(),
          data: result,
        });

        if (result.conflicts.length > 0) {
          this.emit({
            type: "conflict",
            timestamp: Date.now(),
            data: result.conflicts,
          });
        }

        // Schedule next auto-sync at normal interval
        if (this.autoSyncActive) {
          this.scheduleNextSync(this.config.syncInterval);
        }
      } else {
        this.lastSyncSuccess = false;
        this.consecutiveFailures++;

        // Decrease batch size on failure (bandwidth might be poor)
        this.adjustBatchSize(false);

        this.emit({
          type: "sync_error",
          timestamp: Date.now(),
          data: { error: result.error },
        });

        // Schedule with backoff
        if (this.autoSyncActive) {
          if (
            this.consecutiveFailures >= this.config.maxConsecutiveFailures
          ) {
            // Too many failures — stop auto-sync
            this.stopAutoSync();
          } else {
            const delay = this.calculateBackoff();
            this.scheduleNextSync(delay);
          }
        }
      }

      this.emitStatusChange();
      return result;
    } catch (err) {
      this.syncing = false;
      this.lastSyncSuccess = false;
      this.consecutiveFailures++;
      this.adjustBatchSize(false);

      const error = err instanceof Error ? err.message : "Unknown error";

      this.emit({
        type: "sync_error",
        timestamp: Date.now(),
        data: { error },
      });

      if (this.autoSyncActive) {
        if (
          this.consecutiveFailures >= this.config.maxConsecutiveFailures
        ) {
          this.stopAutoSync();
        } else {
          const delay = this.calculateBackoff();
          this.scheduleNextSync(delay);
        }
      }

      this.emitStatusChange();

      return {
        success: false,
        applied: 0,
        conflicts: [],
        acknowledged: 0,
        error,
      };
    }
  }

  /** Schedule the next auto-sync with the given delay. */
  private scheduleNextSync(delayMs: number): void {
    if (this.syncTimer !== null) {
      clearTimeout(this.syncTimer);
    }

    this.nextSyncAt = Date.now() + delayMs;

    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      this.nextSyncAt = null;

      if (this.autoSyncActive) {
        void this.performSync();
      }
    }, delayMs);
  }

  /**
   * Calculate exponential backoff with optional jitter.
   */
  private calculateBackoff(): number {
    const exponential =
      this.config.backoffBase *
      Math.pow(this.config.backoffMultiplier, this.consecutiveFailures - 1);

    const capped = Math.min(exponential, this.config.backoffMax);

    if (this.config.backoffJitter) {
      // Full jitter: uniform random in [0, capped]
      return Math.floor(Math.random() * capped);
    }

    return capped;
  }

  /**
   * Adjust batch size based on sync success/failure.
   * Success: grow toward maxBatchSize.
   * Failure: shrink toward minBatchSize.
   */
  private adjustBatchSize(success: boolean): void {
    if (success) {
      this.currentBatchSize = Math.min(
        this.config.maxBatchSize,
        Math.ceil(this.currentBatchSize * 1.5)
      );
    } else {
      this.currentBatchSize = Math.max(
        this.config.minBatchSize,
        Math.floor(this.currentBatchSize / 2)
      );
    }
  }

  /** Emit an event to all registered handlers. */
  private emit(event: SyncEvent): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch {
          // Swallow handler errors to avoid breaking the sync loop
        }
      }
    }
  }

  /** Convenience: emit a status_change event. */
  private emitStatusChange(): void {
    this.emit({
      type: "status_change",
      timestamp: Date.now(),
      data: this.getStatus(),
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory — Convenience constructor for the full sync stack
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a complete sync stack (log, resolver, protocol, manager) with a
 * single call. Returns all components so they can be configured individually.
 */
export function createSyncStack(
  nodeId: string,
  config?: Partial<SyncManagerConfig>
): {
  operationLog: OperationLog;
  conflictResolver: ConflictResolver;
  protocol: SyncProtocol;
  manager: SyncManager;
} {
  const operationLog = new OperationLog(nodeId);
  const conflictResolver = new ConflictResolver();
  const protocol = new SyncProtocol(nodeId, operationLog, conflictResolver);
  const manager = new SyncManager(protocol, operationLog, config);

  return { operationLog, conflictResolver, protocol, manager };
}
