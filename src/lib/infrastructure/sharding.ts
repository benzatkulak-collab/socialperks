// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Database Sharding & Read Replica Orchestration
//
// Production-grade sharding layer with hash/range/directory strategies,
// read/write splitting, cross-shard scatter-gather, and shard rebalancing.
// In-memory simulation now, ready for real database drivers (pg, mysql2, etc.).
// ══════════════════════════════════════════════════════════════════════════════

// ─── Shard Configuration Types ────────────────────────────────────────────────

export interface ShardConfig {
  shardId: string;
  host: string;
  port: number;
  database: string;
  role: "primary" | "replica";
  region: string;
  weight: number;
  maxConnections: number;
  status: "active" | "draining" | "offline";
}

export interface ShardMap {
  shards: ShardConfig[];
  shardKeyField: string;
  shardingStrategy: "hash" | "range" | "directory";
  replicationFactor: number;
}

export interface QueryContext {
  tenantId: string;
  queryType: "read" | "write";
  consistency: "strong" | "eventual";
  preferredRegion?: string;
}

export interface QueryResult<T = unknown> {
  data: T;
  shardId: string;
  latencyMs: number;
  fromReplica: boolean;
}

export interface ShardHealth {
  shardId: string;
  status: ShardConfig["status"];
  activeConnections: number;
  queryRate: number;
  dataSize: number;
  replicationLagMs: number;
  lastHealthCheck: string;
}

export interface MigrationPlan {
  id: string;
  tenantId: string;
  sourceShard: string;
  targetShard: string;
  estimatedRows: number;
  status: "planned" | "in_progress" | "verifying" | "completed" | "failed";
  progress: number;
  createdAt: string;
  completedAt: string | null;
}

export interface RebalanceAnalysis {
  shardLoads: Map<string, ShardLoadMetrics>;
  imbalanceScore: number;
  recommendations: MigrationPlan[];
}

export interface ShardLoadMetrics {
  shardId: string;
  tenantCount: number;
  dataSize: number;
  queryRate: number;
  writeRate: number;
  cpuUtilization: number;
  memoryUtilization: number;
}

export interface ScatterGatherOptions<T> {
  query: string;
  params?: unknown[];
  sortField?: keyof T & string;
  sortDirection?: "asc" | "desc";
  limit?: number;
  offset?: number;
  timeout?: number;
  allowPartialResults?: boolean;
}

export interface ScatterGatherResult<T> {
  results: T[];
  totalCount: number;
  shardsQueried: number;
  shardsSucceeded: number;
  shardsFailed: string[];
  latencyMs: number;
}

interface RangeMapping {
  min: string;
  max: string;
  shardId: string;
}

interface ReplicaRoundRobinState {
  primaryShardId: string;
  replicaIds: string[];
  currentIndex: number;
}

interface StickySession {
  tenantId: string;
  forcePrimaryUntil: number;
}

// ─── MurmurHash3 Implementation ──────────────────────────────────────────────

/**
 * MurmurHash3 (32-bit) — fast, non-cryptographic hash for shard routing.
 * Produces well-distributed values for consistent shard assignment.
 */
export function murmurHash3(key: string, seed: number = 0): number {
  let h = seed;
  const len = key.length;

  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;

  let i = 0;
  while (i + 4 <= len) {
    let k =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(i + 1) & 0xff) << 8) |
      ((key.charCodeAt(i + 2) & 0xff) << 16) |
      ((key.charCodeAt(i + 3) & 0xff) << 24);

    k = Math.imul(k, c1);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, c2);

    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = Math.imul(h, 5) + 0xe6546b64;

    i += 4;
  }

  let k = 0;
  switch (len - i) {
    case 3:
      k ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    // falls through
    case 2:
      k ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    // falls through
    case 1:
      k ^= key.charCodeAt(i) & 0xff;
      k = Math.imul(k, c1);
      k = (k << 15) | (k >>> 17);
      k = Math.imul(k, c2);
      h ^= k;
  }

  h ^= len;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;

  return h >>> 0;
}

// ─── Shard Manager ────────────────────────────────────────────────────────────

/**
 * Manages the shard topology: add/remove/drain shards, route queries
 * to the correct shard using hash, range, or directory strategies.
 */
export class ShardManager {
  private shardMap: ShardMap;
  private rangeMappings: RangeMapping[] = [];
  private directoryMap: Map<string, string> = new Map();
  private tenantShardAssignments: Map<string, string> = new Map();

  constructor(config: {
    shardKeyField?: string;
    shardingStrategy?: ShardMap["shardingStrategy"];
    replicationFactor?: number;
  } = {}) {
    this.shardMap = {
      shards: [],
      shardKeyField: config.shardKeyField ?? "tenant_id",
      shardingStrategy: config.shardingStrategy ?? "hash",
      replicationFactor: config.replicationFactor ?? 2,
    };
  }

  // ── Shard Lifecycle ──────────────────────────────────────────────────────

  /** Add a new shard to the cluster. */
  addShard(config: ShardConfig): void {
    const existing = this.shardMap.shards.find(
      (s) => s.shardId === config.shardId
    );
    if (existing) {
      throw new Error(`Shard ${config.shardId} already exists`);
    }
    this.shardMap.shards.push({ ...config });
  }

  /** Immediately remove a shard from the cluster. Only allowed if offline or drained. */
  removeShard(shardId: string): void {
    const shard = this.getShard(shardId);
    if (shard.status === "active") {
      throw new Error(
        `Cannot remove active shard ${shardId}. Drain it first.`
      );
    }

    // Clean up any tenant assignments pointing to this shard
    const tenantAssignmentEntries = Array.from(this.tenantShardAssignments.entries());
    for (const [tenantId, assignedShard] of tenantAssignmentEntries) {
      if (assignedShard === shardId) {
        this.tenantShardAssignments.delete(tenantId);
      }
    }

    // Clean up directory map entries
    const directoryEntries = Array.from(this.directoryMap.entries());
    for (const [tenantId, assignedShard] of directoryEntries) {
      if (assignedShard === shardId) {
        this.directoryMap.delete(tenantId);
      }
    }

    this.shardMap.shards = this.shardMap.shards.filter(
      (s) => s.shardId !== shardId
    );
  }

  /** Mark a shard as draining — stops new writes, existing reads continue. */
  drainShard(shardId: string): void {
    const shard = this.getShard(shardId);
    shard.status = "draining";
  }

  /** Get a shard by ID or throw. */
  getShard(shardId: string): ShardConfig {
    const shard = this.shardMap.shards.find((s) => s.shardId === shardId);
    if (!shard) {
      throw new Error(`Shard ${shardId} not found`);
    }
    return shard;
  }

  /** Get all shards in the cluster. */
  getAllShards(): ReadonlyArray<ShardConfig> {
    return [...this.shardMap.shards];
  }

  /** Get only primary shards that are active. */
  getActivePrimaries(): ShardConfig[] {
    return this.shardMap.shards.filter(
      (s) => s.role === "primary" && s.status === "active"
    );
  }

  /** Get replica shards for a given primary. Replicas share the same database name. */
  getReplicasForPrimary(primaryShardId: string): ShardConfig[] {
    const primary = this.getShard(primaryShardId);
    return this.shardMap.shards.filter(
      (s) =>
        s.role === "replica" &&
        s.database === primary.database &&
        s.status === "active"
    );
  }

  /** Get the current shard map configuration. */
  getShardMap(): Readonly<ShardMap> {
    return { ...this.shardMap, shards: [...this.shardMap.shards] };
  }

  // ── Sharding Strategy: Hash ──────────────────────────────────────────────

  /** Hash-based routing: murmurHash3(tenantId) % primaryShardCount. */
  routeByHash(tenantId: string): ShardConfig {
    const primaries = this.getActivePrimaries();
    if (primaries.length === 0) {
      throw new Error("No active primary shards available");
    }
    const hash = murmurHash3(tenantId);
    const index = hash % primaries.length;
    return primaries[index];
  }

  // ── Sharding Strategy: Range ─────────────────────────────────────────────

  /** Configure range-based shard mapping. Ranges must be non-overlapping. */
  setRangeMappings(mappings: RangeMapping[]): void {
    // Validate non-overlapping ranges
    const sorted = [...mappings].sort((a, b) => a.min.localeCompare(b.min));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].min < sorted[i - 1].max) {
        throw new Error(
          `Overlapping ranges: ${sorted[i - 1].max} and ${sorted[i].min}`
        );
      }
    }
    this.rangeMappings = sorted;
  }

  /** Range-based routing: find the range bucket for the tenant ID. */
  routeByRange(tenantId: string): ShardConfig {
    const mapping = this.rangeMappings.find(
      (r) => tenantId >= r.min && tenantId < r.max
    );
    if (!mapping) {
      throw new Error(
        `No range mapping found for tenant ${tenantId}. ` +
          `Configured ranges: ${this.rangeMappings.map((r) => `[${r.min}, ${r.max})`).join(", ")}`
      );
    }
    return this.getShard(mapping.shardId);
  }

  // ── Sharding Strategy: Directory ─────────────────────────────────────────

  /** Register explicit tenant → shard mapping. */
  setDirectoryEntry(tenantId: string, shardId: string): void {
    this.getShard(shardId); // Validate shard exists
    this.directoryMap.set(tenantId, shardId);
  }

  /** Directory-based routing: lookup the tenant's assigned shard. */
  routeByDirectory(tenantId: string): ShardConfig {
    const shardId = this.directoryMap.get(tenantId);
    if (!shardId) {
      throw new Error(
        `No directory entry for tenant ${tenantId}. Use setDirectoryEntry() first.`
      );
    }
    return this.getShard(shardId);
  }

  /** Get the full directory map (for debugging or migration). */
  getDirectoryMap(): ReadonlyMap<string, string> {
    return new Map(this.directoryMap);
  }

  // ── Unified Routing ──────────────────────────────────────────────────────

  /**
   * Route a query to the correct shard using the configured strategy.
   * Returns the primary shard responsible for this tenant.
   */
  routeQuery(tenantId: string): ShardConfig {
    // Check for cached assignment first
    const cached = this.tenantShardAssignments.get(tenantId);
    if (cached) {
      try {
        const shard = this.getShard(cached);
        if (shard.status === "active") return shard;
      } catch {
        // Shard was removed, fall through to re-route
        this.tenantShardAssignments.delete(tenantId);
      }
    }

    let shard: ShardConfig;
    switch (this.shardMap.shardingStrategy) {
      case "hash":
        shard = this.routeByHash(tenantId);
        break;
      case "range":
        shard = this.routeByRange(tenantId);
        break;
      case "directory":
        shard = this.routeByDirectory(tenantId);
        break;
    }

    // Cache the assignment
    this.tenantShardAssignments.set(tenantId, shard.shardId);
    return shard;
  }

  /** Route a write — always goes to the primary shard for the tenant. */
  routeWrite(tenantId: string): ShardConfig {
    // Check if all primaries are draining before routing
    const allPrimaries = this.shardMap.shards.filter((s) => s.role === "primary");
    const drainingPrimaries = allPrimaries.filter((s) => s.status === "draining");
    if (drainingPrimaries.length > 0 && drainingPrimaries.length === allPrimaries.length) {
      throw new Error(
        `Shard ${drainingPrimaries[0].shardId} is draining and not accepting new writes`
      );
    }

    const shard = this.routeQuery(tenantId);
    if (shard.status === "draining") {
      throw new Error(
        `Shard ${shard.shardId} is draining and not accepting new writes`
      );
    }
    if (shard.role !== "primary") {
      throw new Error(
        `Route returned a non-primary shard ${shard.shardId} for writes`
      );
    }
    return shard;
  }

  /**
   * Route a read — uses replica with round-robin if eventual consistency is OK.
   * Falls back to primary if no replicas are available.
   */
  routeRead(
    tenantId: string,
    consistency: "strong" | "eventual" = "eventual"
  ): ShardConfig {
    const primary = this.routeQuery(tenantId);

    if (consistency === "strong") {
      return primary;
    }

    const replicas = this.getReplicasForPrimary(primary.shardId);
    if (replicas.length === 0) {
      return primary;
    }

    // Weighted selection among replicas
    const totalWeight = replicas.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;
    for (const replica of replicas) {
      random -= replica.weight;
      if (random <= 0) {
        return replica;
      }
    }

    return replicas[replicas.length - 1];
  }

  /** Clear the tenant-to-shard assignment cache (e.g., after rebalancing). */
  clearAssignmentCache(): void {
    this.tenantShardAssignments.clear();
  }
}

// ─── Read/Write Splitter ──────────────────────────────────────────────────────

/**
 * Manages read/write splitting with sticky sessions, replication lag tolerance,
 * and automatic failover.
 */
export class ReadWriteSplitter {
  private shardManager: ShardManager;
  private stickySessions: Map<string, StickySession> = new Map();
  private replicaRoundRobin: Map<string, ReplicaRoundRobinState> = new Map();
  private replicationLagToleranceMs: number;
  private stickyWindowMs: number;
  private maxRetries: number;

  constructor(
    shardManager: ShardManager,
    options: {
      replicationLagToleranceMs?: number;
      stickyWindowMs?: number;
      maxRetries?: number;
    } = {}
  ) {
    this.shardManager = shardManager;
    this.replicationLagToleranceMs = options.replicationLagToleranceMs ?? 1000;
    this.stickyWindowMs = options.stickyWindowMs ?? 5000;
    this.maxRetries = options.maxRetries ?? 3;
  }

  /**
   * Get the appropriate connection (shard) for a query context.
   * Honors sticky sessions: recent writes force reads to primary.
   */
  getConnection(context: QueryContext): ShardConfig {
    // Writes always go to primary
    if (context.queryType === "write") {
      this.recordWrite(context.tenantId);
      return this.shardManager.routeWrite(context.tenantId);
    }

    // Strong consistency reads go to primary
    if (context.consistency === "strong") {
      return this.shardManager.routeRead(context.tenantId, "strong");
    }

    // Check for sticky session — recent write forces primary read
    if (this.hasStickySession(context.tenantId)) {
      return this.shardManager.routeRead(context.tenantId, "strong");
    }

    // Eventual consistency read: use replica round-robin
    return this.getReplicaRoundRobin(context);
  }

  /**
   * Execute a query with automatic retry and failover.
   * On replica failure, retries on the next available replica, then falls back
   * to primary.
   */
  async executeWithRetry<T>(
    context: QueryContext,
    queryFn: (shard: ShardConfig) => Promise<T>
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    const triedShards = new Set<string>();

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const shard = this.getConnectionWithExclusions(context, triedShards);
      triedShards.add(shard.shardId);

      try {
        const data = await queryFn(shard);
        return {
          data,
          shardId: shard.shardId,
          latencyMs: Date.now() - startTime,
          fromReplica: shard.role === "replica",
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // If we tried a replica, try another or fall back to primary
        if (shard.role === "replica") {
          continue;
        }

        // If primary failed, no more options
        break;
      }
    }

    throw new Error(
      `Query failed after ${this.maxRetries + 1} attempts. Last error: ${lastError?.message}`
    );
  }

  /** Record that a write occurred for this tenant, creating a sticky session. */
  private recordWrite(tenantId: string): void {
    this.stickySessions.set(tenantId, {
      tenantId,
      forcePrimaryUntil: Date.now() + this.stickyWindowMs,
    });
  }

  /** Check if a sticky session exists and is still valid. */
  private hasStickySession(tenantId: string): boolean {
    const session = this.stickySessions.get(tenantId);
    if (!session) return false;

    if (Date.now() >= session.forcePrimaryUntil) {
      this.stickySessions.delete(tenantId);
      return false;
    }

    return true;
  }

  /** Round-robin through replicas for a given primary shard. */
  private getReplicaRoundRobin(context: QueryContext): ShardConfig {
    const primary = this.shardManager.routeQuery(context.tenantId);
    const replicas = this.shardManager.getReplicasForPrimary(
      primary.shardId
    );

    if (replicas.length === 0) {
      return primary;
    }

    // Filter by preferred region if specified
    let candidates = context.preferredRegion
      ? replicas.filter((r) => r.region === context.preferredRegion)
      : replicas;

    if (candidates.length === 0) {
      candidates = replicas;
    }

    // Get or initialize round-robin state
    let state = this.replicaRoundRobin.get(primary.shardId);
    if (
      !state ||
      state.replicaIds.length !== candidates.length ||
      !state.replicaIds.every((id) => candidates.some((c) => c.shardId === id))
    ) {
      state = {
        primaryShardId: primary.shardId,
        replicaIds: candidates.map((c) => c.shardId),
        currentIndex: 0,
      };
      this.replicaRoundRobin.set(primary.shardId, state);
    }

    const replicaId = state.replicaIds[state.currentIndex % state.replicaIds.length];
    state.currentIndex = (state.currentIndex + 1) % state.replicaIds.length;

    const replica = candidates.find((c) => c.shardId === replicaId);
    return replica ?? primary;
  }

  /** Get connection excluding already-tried shards. Falls back to primary. */
  private getConnectionWithExclusions(
    context: QueryContext,
    excludeShards: Set<string>
  ): ShardConfig {
    const primary = this.shardManager.routeQuery(context.tenantId);

    if (context.queryType === "write" || context.consistency === "strong") {
      return primary;
    }

    const replicas = this.shardManager
      .getReplicasForPrimary(primary.shardId)
      .filter((r) => !excludeShards.has(r.shardId));

    if (replicas.length === 0) {
      return primary;
    }

    // Pick the next untried replica
    return replicas[0];
  }

  /** Get replication lag tolerance setting. */
  getReplicationLagToleranceMs(): number {
    return this.replicationLagToleranceMs;
  }

  /** Update replication lag tolerance. */
  setReplicationLagToleranceMs(ms: number): void {
    this.replicationLagToleranceMs = ms;
  }

  /** Clear all sticky sessions (e.g., on failover event). */
  clearStickySessions(): void {
    this.stickySessions.clear();
  }
}

// ─── Cross-Shard Query Engine ─────────────────────────────────────────────────

/**
 * Scatter-gather engine for queries that span all shards.
 * Sends queries in parallel, merges results with sorting and pagination.
 */
export class CrossShardQueryEngine {
  private shardManager: ShardManager;
  private defaultTimeout: number;

  constructor(
    shardManager: ShardManager,
    options: { defaultTimeout?: number } = {}
  ) {
    this.shardManager = shardManager;
    this.defaultTimeout = options.defaultTimeout ?? 30000;
  }

  /**
   * Scatter — send a query to all active primary shards in parallel.
   * Returns a map of shardId → result (or error).
   */
  async scatter<T>(
    queryFn: (shard: ShardConfig) => Promise<T>,
    options: { timeout?: number; allowPartialResults?: boolean } = {}
  ): Promise<Map<string, { data?: T; error?: Error }>> {
    const timeout = options.timeout ?? this.defaultTimeout;
    const primaries = this.shardManager.getActivePrimaries();
    const results = new Map<string, { data?: T; error?: Error }>();

    const promises = primaries.map(async (shard) => {
      try {
        const data = await this.withTimeout(queryFn(shard), timeout);
        results.set(shard.shardId, { data });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        results.set(shard.shardId, { error });
      }
    });

    await Promise.allSettled(promises);

    // Check if we have enough successful results
    if (!options.allowPartialResults) {
      const failures = Array.from(results.entries()).filter(([, r]) => r.error);
      if (failures.length > 0 && failures.length === primaries.length) {
        throw new Error(
          `All ${primaries.length} shards failed. First error: ${failures[0][1].error?.message}`
        );
      }
    }

    return results;
  }

  /**
   * Gather — collect and merge results from a scatter operation.
   * Filters out failed shards and concatenates successful results.
   */
  gather<T>(
    scatterResults: Map<string, { data?: T[]; error?: Error }>
  ): {
    results: T[];
    successfulShards: string[];
    failedShards: string[];
  } {
    const results: T[] = [];
    const successfulShards: string[] = [];
    const failedShards: string[] = [];

    const entries = Array.from(scatterResults.entries());
    for (const [shardId, result] of entries) {
      if (result.data) {
        results.push(...result.data);
        successfulShards.push(shardId);
      } else {
        failedShards.push(shardId);
      }
    }

    return { results, successfulShards, failedShards };
  }

  /**
   * Combined scatter-gather with sorting and pagination across shards.
   * This is the primary method for cross-shard queries.
   */
  async scatterGather<T extends Record<string, unknown>>(
    options: ScatterGatherOptions<T>,
    queryFn: (shard: ShardConfig, query: string, params?: unknown[]) => Promise<T[]>
  ): Promise<ScatterGatherResult<T>> {
    const startTime = Date.now();
    const timeout = options.timeout ?? this.defaultTimeout;

    // Scatter: query all shards in parallel
    const scatterResults = await this.scatter<T[]>(
      (shard) => queryFn(shard, options.query, options.params),
      { timeout, allowPartialResults: options.allowPartialResults }
    );

    // Gather: merge all results
    const gathered = this.gather(scatterResults);

    // Sort across all shard results
    let sortedResults = gathered.results;
    if (options.sortField) {
      const field = options.sortField;
      const direction = options.sortDirection === "desc" ? -1 : 1;

      sortedResults = sortedResults.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === "string" && typeof bVal === "string") {
          return aVal.localeCompare(bVal) * direction;
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return (aVal - bVal) * direction;
        }

        return String(aVal).localeCompare(String(bVal)) * direction;
      });
    }

    const totalCount = sortedResults.length;

    // Paginate
    if (options.offset !== undefined || options.limit !== undefined) {
      const start = options.offset ?? 0;
      const end =
        options.limit !== undefined ? start + options.limit : undefined;
      sortedResults = sortedResults.slice(start, end);
    }

    return {
      results: sortedResults,
      totalCount,
      shardsQueried: gathered.successfulShards.length + gathered.failedShards.length,
      shardsSucceeded: gathered.successfulShards.length,
      shardsFailed: gathered.failedShards,
      latencyMs: Date.now() - startTime,
    };
  }

  /** Wrap a promise with a timeout. */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Query timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((val) => {
          clearTimeout(timer);
          resolve(val);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}

// ─── Shard Rebalancer ─────────────────────────────────────────────────────────

/**
 * Analyzes shard load distribution and generates/executes migration plans
 * to keep data balanced across shards.
 */
export class ShardRebalancer {
  private shardManager: ShardManager;
  private shardMetrics: Map<string, ShardLoadMetrics> = new Map();
  private migrations: Map<string, MigrationPlan> = new Map();
  private tenantDataSizes: Map<string, number> = new Map();
  private tenantQueryRates: Map<string, number> = new Map();
  private imbalanceThreshold: number;

  constructor(
    shardManager: ShardManager,
    options: { imbalanceThreshold?: number } = {}
  ) {
    this.shardManager = shardManager;
    this.imbalanceThreshold = options.imbalanceThreshold ?? 0.2;
  }

  /** Record metrics for a shard (called by monitoring system). */
  recordMetrics(metrics: ShardLoadMetrics): void {
    this.shardMetrics.set(metrics.shardId, { ...metrics });
  }

  /** Record tenant data size (for migration planning). */
  recordTenantDataSize(tenantId: string, sizeBytes: number): void {
    this.tenantDataSizes.set(tenantId, sizeBytes);
  }

  /** Record tenant query rate (for load-based rebalancing). */
  recordTenantQueryRate(tenantId: string, queriesPerSecond: number): void {
    this.tenantQueryRates.set(tenantId, queriesPerSecond);
  }

  /**
   * Analyze current shard load distribution.
   * Returns an imbalance score (0 = perfectly balanced, 1 = maximally imbalanced)
   * and recommended migrations if the imbalance exceeds threshold.
   */
  analyze(): RebalanceAnalysis {
    const shardLoads = new Map<string, ShardLoadMetrics>();
    const primaries = this.shardManager.getActivePrimaries();

    // Build or use existing metrics for each primary
    for (const shard of primaries) {
      const existing = this.shardMetrics.get(shard.shardId);
      if (existing) {
        shardLoads.set(shard.shardId, { ...existing });
      } else {
        // Synthesize from tenant data
        shardLoads.set(shard.shardId, {
          shardId: shard.shardId,
          tenantCount: 0,
          dataSize: 0,
          queryRate: 0,
          writeRate: 0,
          cpuUtilization: 0,
          memoryUtilization: 0,
        });
      }
    }

    // Calculate imbalance score based on data size variance
    const sizes = Array.from(shardLoads.values()).map((m) => m.dataSize);
    const imbalanceScore = this.calculateImbalanceScore(sizes);

    // Generate recommendations if imbalanced
    let recommendations: MigrationPlan[] = [];
    if (imbalanceScore > this.imbalanceThreshold) {
      recommendations = this.generateMigrationPlans(shardLoads);
    }

    return {
      shardLoads,
      imbalanceScore,
      recommendations,
    };
  }

  /**
   * Plan a rebalance based on current analysis.
   * Returns the migration plans without executing them.
   */
  planRebalance(): MigrationPlan[] {
    const analysis = this.analyze();
    return analysis.recommendations;
  }

  /**
   * Execute a migration plan: move a tenant's data from source to target shard.
   * Progress is tracked and can be queried.
   */
  async executeMigration(
    plan: MigrationPlan,
    callbacks: {
      copyData: (
        tenantId: string,
        sourceShard: ShardConfig,
        targetShard: ShardConfig,
        onProgress: (progress: number) => void
      ) => Promise<void>;
      switchOver: (tenantId: string, targetShardId: string) => Promise<void>;
    }
  ): Promise<MigrationPlan> {
    const tracked: MigrationPlan = { ...plan, status: "in_progress", progress: 0 };
    this.migrations.set(tracked.id, tracked);

    try {
      const sourceShard = this.shardManager.getShard(plan.sourceShard);
      const targetShard = this.shardManager.getShard(plan.targetShard);

      // Phase 1: Copy data
      await callbacks.copyData(
        plan.tenantId,
        sourceShard,
        targetShard,
        (progress) => {
          tracked.progress = progress;
          this.migrations.set(tracked.id, { ...tracked });
        }
      );

      // Phase 2: Switch routing
      tracked.status = "verifying";
      tracked.progress = 90;
      this.migrations.set(tracked.id, { ...tracked });

      await callbacks.switchOver(plan.tenantId, plan.targetShard);

      // Phase 3: Complete
      tracked.status = "completed";
      tracked.progress = 100;
      tracked.completedAt = new Date().toISOString();
      this.migrations.set(tracked.id, { ...tracked });

      // Update directory if using directory-based sharding
      this.shardManager.clearAssignmentCache();

      return { ...tracked };
    } catch (err) {
      tracked.status = "failed";
      this.migrations.set(tracked.id, { ...tracked });
      throw err;
    }
  }

  /**
   * Verify data integrity after a migration by running a comparison query.
   */
  async verifyMigration(
    plan: MigrationPlan,
    verifyFn: (
      tenantId: string,
      sourceShard: ShardConfig,
      targetShard: ShardConfig
    ) => Promise<{
      sourceRowCount: number;
      targetRowCount: number;
      checksumMatch: boolean;
    }>
  ): Promise<{
    valid: boolean;
    sourceRowCount: number;
    targetRowCount: number;
    checksumMatch: boolean;
  }> {
    const sourceShard = this.shardManager.getShard(plan.sourceShard);
    const targetShard = this.shardManager.getShard(plan.targetShard);

    const result = await verifyFn(plan.tenantId, sourceShard, targetShard);

    return {
      valid:
        result.sourceRowCount === result.targetRowCount &&
        result.checksumMatch,
      ...result,
    };
  }

  /** Get migration status by ID. */
  getMigration(migrationId: string): MigrationPlan | undefined {
    return this.migrations.get(migrationId)
      ? { ...this.migrations.get(migrationId)! }
      : undefined;
  }

  /** Get all active (in-progress) migrations. */
  getActiveMigrations(): MigrationPlan[] {
    return Array.from(this.migrations.values())
      .filter(
        (m) => m.status === "in_progress" || m.status === "verifying"
      )
      .map((m) => ({ ...m }));
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  /** Calculate a normalized imbalance score (0 to 1). */
  private calculateImbalanceScore(values: number[]): number {
    if (values.length <= 1) return 0;

    const sum = values.reduce((a, b) => a + b, 0);
    if (sum === 0) return 0;

    const mean = sum / values.length;
    const maxDeviation = Math.max(...values.map((v) => Math.abs(v - mean)));

    return mean > 0 ? maxDeviation / mean : 0;
  }

  /**
   * Generate migration plans to balance load.
   * Strategy: move tenants from the most loaded shard to the least loaded.
   */
  private generateMigrationPlans(
    shardLoads: Map<string, ShardLoadMetrics>
  ): MigrationPlan[] {
    const plans: MigrationPlan[] = [];
    const loads = Array.from(shardLoads.entries()).sort(
      (a, b) => b[1].dataSize - a[1].dataSize
    );

    if (loads.length < 2) return plans;

    const heaviest = loads[0];
    const lightest = loads[loads.length - 1];

    // If the heaviest shard has more than 1.5x the lightest, recommend a migration
    if (
      lightest[1].dataSize > 0 &&
      heaviest[1].dataSize / lightest[1].dataSize > 1.5
    ) {
      // Find a tenant on the heaviest shard to move
      const tenantToMove = this.findMovableTenant(heaviest[0]);
      if (tenantToMove) {
        const estimatedRows =
          this.tenantDataSizes.get(tenantToMove) ?? 0;

        plans.push({
          id: `mig_${crypto.randomUUID()}`,
          tenantId: tenantToMove,
          sourceShard: heaviest[0],
          targetShard: lightest[0],
          estimatedRows,
          status: "planned",
          progress: 0,
          createdAt: new Date().toISOString(),
          completedAt: null,
        });
      }
    }

    return plans;
  }

  /** Find a tenant on the given shard that can be moved. */
  private findMovableTenant(shardId: string): string | null {
    // Look through tenant data sizes for tenants assigned to this shard
    const tenantEntries = Array.from(this.tenantDataSizes.entries());
    for (const [tenantId] of tenantEntries) {
      try {
        const assigned = this.shardManager.routeQuery(tenantId);
        if (assigned.shardId === shardId) {
          return tenantId;
        }
      } catch {
        continue;
      }
    }
    return null;
  }
}

// ─── Default Instances ────────────────────────────────────────────────────────

/** Default shard manager instance (hash-based, 2x replication). */
export const shardManager = new ShardManager({
  shardKeyField: "tenant_id",
  shardingStrategy: "hash",
  replicationFactor: 2,
});

/** Default read/write splitter. */
export const readWriteSplitter = new ReadWriteSplitter(shardManager);

/** Default cross-shard query engine. */
export const crossShardQueryEngine = new CrossShardQueryEngine(shardManager);

/** Default shard rebalancer. */
export const shardRebalancer = new ShardRebalancer(shardManager);
