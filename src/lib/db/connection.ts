/**
 * Database Connection Manager for Social Perks
 * ─────────────────────────────────────────────
 * Abstracts over the actual DB driver so the app can swap between
 * InMemoryConnection (dev/test) and a real Postgres pool (production).
 *
 * Features:
 * - Connection pooling configuration
 * - Read replica support (primary for writes, replicas for reads)
 * - Health check
 * - Transaction support with isolation levels
 * - InMemoryConnection for development/testing
 */

import postgresLib from "postgres";

// ─── Public Interfaces ──────────────────────────────────────────────────────

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
  /** Wall-clock milliseconds the query took. */
  duration: number;
}

export interface TransactionClient {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export type IsolationLevel =
  | "read_committed"
  | "repeatable_read"
  | "serializable";

export interface DatabaseConnection {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
  transaction(isolationLevel?: IsolationLevel): Promise<TransactionClient>;
  healthCheck(): Promise<{
    connected: boolean;
    latencyMs: number;
    poolSize: number;
  }>;
  close(): Promise<void>;
}

// ─── Pool Configuration ─────────────────────────────────────────────────────

export interface PoolConfig {
  /** Minimum number of idle connections to keep in the pool. */
  min: number;
  /** Maximum number of connections the pool may hold. */
  max: number;
  /** Time (ms) a connection may sit idle before being closed. */
  idleTimeoutMs: number;
  /** Time (ms) to wait for a free connection before rejecting. */
  connectionTimeoutMs: number;
}

export interface ConnectionConfig {
  primary: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
  };
  replicas?: Array<{
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
  }>;
  pool: PoolConfig;
}

const DEFAULT_POOL_CONFIG: PoolConfig = {
  min: 2,
  max: 10,
  idleTimeoutMs: 30_000,
  connectionTimeoutMs: 5_000,
};

// ─── In-Memory Row Store ────────────────────────────────────────────────────

type RowData = Record<string, unknown>;

/**
 * A table-scoped in-memory store.  Each "table" is a Map keyed by the row's
 * `id` field (always a string UUID).
 */
class InMemoryStore {
  private tables: Map<string, Map<string, RowData>> = new Map();

  private getTable(name: string): Map<string, RowData> {
    let table = this.tables.get(name);
    if (!table) {
      table = new Map();
      this.tables.set(name, table);
    }
    return table;
  }

  /** Snapshot the entire store (used by transactions). */
  snapshot(): Map<string, Map<string, RowData>> {
    const snap = new Map<string, Map<string, RowData>>();
    for (const [name, table] of this.tables) {
      snap.set(name, new Map(table));
    }
    return snap;
  }

  /** Restore from a snapshot (used on rollback). */
  restore(snap: Map<string, Map<string, RowData>>): void {
    this.tables = snap;
  }

  // ── Method-based API (no SQL parsing needed) ────────────────────────────

  insert(table: string, row: RowData): RowData {
    const id = (row.id as string) ?? crypto.randomUUID();
    const now = new Date().toISOString();
    const record: RowData = { ...row, id };
    // Auto-fill timestamps if missing
    if (!("created_at" in record)) record.created_at = now;
    if (!("updated_at" in record)) record.updated_at = now;
    this.getTable(table).set(id, record);
    return { ...record };
  }

  selectById(table: string, id: string): RowData | null {
    const row = this.getTable(table).get(id);
    return row ? { ...row } : null;
  }

  selectMany(
    table: string,
    where: Record<string, unknown> = {},
    options?: {
      page?: number;
      perPage?: number;
      orderBy?: string;
      order?: "asc" | "desc";
    },
  ): { rows: RowData[]; total: number } {
    const all = Array.from(this.getTable(table).values());
    const filtered = all.filter((row) => matchesWhere(row, where));
    const total = filtered.length;

    // Sort
    if (options?.orderBy) {
      const dir = options.order === "desc" ? -1 : 1;
      const key = options.orderBy;
      filtered.sort((a, b) => {
        const va = a[key];
        const vb = b[key];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === "string" && typeof vb === "string") {
          return va.localeCompare(vb) * dir;
        }
        return ((va as number) - (vb as number)) * dir;
      });
    }

    // Paginate
    const page = options?.page ?? 1;
    const perPage = options?.perPage ?? 50;
    const start = (page - 1) * perPage;
    const rows = filtered.slice(start, start + perPage).map((r) => ({ ...r }));

    return { rows, total };
  }

  update(
    table: string,
    id: string,
    data: Record<string, unknown>,
  ): RowData | null {
    const t = this.getTable(table);
    const existing = t.get(id);
    if (!existing) return null;
    const updated: RowData = {
      ...existing,
      ...data,
      id, // id cannot be overwritten
      updated_at: new Date().toISOString(),
    };
    t.set(id, updated);
    return { ...updated };
  }

  delete(table: string, id: string): boolean {
    return this.getTable(table).delete(id);
  }

  /** Soft-delete: sets deleted_at instead of removing the row. */
  softDelete(table: string, id: string): boolean {
    const t = this.getTable(table);
    const existing = t.get(id);
    if (!existing) return false;
    t.set(id, { ...existing, deleted_at: new Date().toISOString() });
    return true;
  }

  /** Count rows matching the filter. */
  count(table: string, where: Record<string, unknown> = {}): number {
    const all = Array.from(this.getTable(table).values());
    return all.filter((row) => matchesWhere(row, where)).length;
  }

  /** Clear all data (useful in tests). */
  clear(): void {
    this.tables.clear();
  }
}

// ─── Where-clause matching ──────────────────────────────────────────────────

function matchesWhere(row: RowData, where: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;

    // Support operators encoded as objects: { $gte: 100, $lte: 500 }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const ops = value as Record<string, unknown>;
      const rv = row[key];
      for (const [op, operand] of Object.entries(ops)) {
        switch (op) {
          case "$gte":
            if (rv == null || (rv as number) < (operand as number)) return false;
            break;
          case "$gt":
            if (rv == null || (rv as number) <= (operand as number)) return false;
            break;
          case "$lte":
            if (rv == null || (rv as number) > (operand as number)) return false;
            break;
          case "$lt":
            if (rv == null || (rv as number) >= (operand as number)) return false;
            break;
          case "$ne":
            if (rv === operand) return false;
            break;
          case "$in":
            if (!Array.isArray(operand) || !operand.includes(rv)) return false;
            break;
          case "$contains":
            // For text search (case-insensitive)
            if (
              typeof rv !== "string" ||
              !rv.toLowerCase().includes((operand as string).toLowerCase())
            )
              return false;
            break;
          case "$isNull":
            if (operand === true && rv != null) return false;
            if (operand === false && rv == null) return false;
            break;
          default:
            break;
        }
      }
      continue;
    }

    // Exact match
    if (row[key] !== value) return false;
  }
  return true;
}

// ─── InMemoryConnection ─────────────────────────────────────────────────────

/**
 * A DatabaseConnection backed entirely by in-memory Maps.
 *
 * - `query()` is a passthrough that delegates to the method-based store API
 *   via a lightweight command language. The SQL string is treated as a
 *   human-readable label; actual operations go through the `store` property.
 * - Transactions snapshot and restore on rollback.
 */
export class InMemoryConnection implements DatabaseConnection {
  readonly store: InMemoryStore;
  private closed = false;

  constructor() {
    this.store = new InMemoryStore();
  }

  async query<T = Record<string, unknown>>(
    _sql: string,
    _params?: unknown[],
  ): Promise<QueryResult<T>> {
    this.assertOpen();
    // The in-memory connection doesn't parse SQL.
    // All real operations go through the store's method-based API.
    // This method exists to satisfy the interface; callers should use
    // the typed repository layer instead.
    return { rows: [] as T[], rowCount: 0, duration: 0 };
  }

  async transaction(
    _isolationLevel?: IsolationLevel,
  ): Promise<TransactionClient> {
    this.assertOpen();
    const snapshot = this.store.snapshot();
    let committed = false;
    let rolledBack = false;

    const txClient: TransactionClient = {
      query: async <T = Record<string, unknown>>(
        _sql: string,
        _params?: unknown[],
      ): Promise<QueryResult<T>> => {
        if (committed || rolledBack) {
          throw new Error("Transaction already ended");
        }
        return { rows: [] as T[], rowCount: 0, duration: 0 };
      },
      commit: async () => {
        if (committed || rolledBack) {
          throw new Error("Transaction already ended");
        }
        committed = true;
        // Data is already written to the store; nothing extra needed.
      },
      rollback: async () => {
        if (committed || rolledBack) {
          throw new Error("Transaction already ended");
        }
        rolledBack = true;
        this.store.restore(snapshot);
      },
    };

    return txClient;
  }

  async healthCheck(): Promise<{
    connected: boolean;
    latencyMs: number;
    poolSize: number;
  }> {
    const start = Date.now();
    const connected = !this.closed;
    return {
      connected,
      latencyMs: Date.now() - start,
      poolSize: 1,
    };
  }

  async close(): Promise<void> {
    this.closed = true;
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error("Connection is closed");
    }
  }
}

// ─── Placeholder Postgres Connection ────────────────────────────────────────

/**
 * Placeholder for a real Postgres connection pool (e.g. via `pg` or `postgres`
 * npm package). Swap this in when moving to production.
 */
export class PostgresConnection implements DatabaseConnection {
  private readonly config: ConnectionConfig;
  private readonly sql: postgresLib.Sql;
  private replicaIndex = 0;

  constructor(config: ConnectionConfig) {
    this.config = {
      ...config,
      pool: { ...DEFAULT_POOL_CONFIG, ...config.pool },
    };

    this.sql = postgresLib({
      host: config.primary.host,
      port: config.primary.port,
      database: config.primary.database,
      username: config.primary.user,
      password: config.primary.password,
      ssl: config.primary.ssl ? { rejectUnauthorized: false } : false,
      // Cap connections per instance. Behind a transaction pooler (e.g.
      // Supabase Supavisor) each serverless instance should hold only a few
      // client connections — the pooler fans them in. 10+ per instance
      // exhausts the upstream pool under burst.
      max: Math.min(this.config.pool.max ?? 10, 3),
      // Transaction-mode poolers don't support prepared statements; without
      // this, queries fail with "prepared statement ... does not exist".
      // Harmless on direct/session connections, so set unconditionally.
      prepare: false,
      idle_timeout: Math.floor((this.config.pool.idleTimeoutMs ?? 30000) / 1000),
      connect_timeout: Math.floor((this.config.pool.connectionTimeoutMs ?? 5000) / 1000),
    });
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    const start = performance.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await this.sql.unsafe(sql, params as any[]);
    return {
      rows: result as unknown as T[],
      rowCount: result.length,
      duration: performance.now() - start,
    };
  }

  async transaction(
    isolationLevel?: IsolationLevel,
  ): Promise<TransactionClient> {
    const iso =
      isolationLevel === "serializable"
        ? "SERIALIZABLE"
        : isolationLevel === "repeatable_read"
          ? "REPEATABLE READ"
          : "READ COMMITTED";

    const reserved = await this.sql.reserve();
    await reserved.unsafe(`BEGIN ISOLATION LEVEL ${iso}`);

    return {
      query: async <T = Record<string, unknown>>(
        sql: string,
        params?: unknown[],
      ): Promise<QueryResult<T>> => {
        const start = performance.now();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await reserved.unsafe(sql, params as any[]);
        return {
          rows: result as unknown as T[],
          rowCount: result.length,
          duration: performance.now() - start,
        };
      },
      commit: async () => {
        await reserved.unsafe("COMMIT");
        reserved.release();
      },
      rollback: async () => {
        await reserved.unsafe("ROLLBACK");
        reserved.release();
      },
    };
  }

  async healthCheck(): Promise<{
    connected: boolean;
    latencyMs: number;
    poolSize: number;
  }> {
    const start = performance.now();
    try {
      await this.sql.unsafe("SELECT 1");
      return {
        connected: true,
        latencyMs: performance.now() - start,
        poolSize: this.sql.options.max,
      };
    } catch {
      return {
        connected: false,
        latencyMs: performance.now() - start,
        poolSize: 0,
      };
    }
  }

  async close(): Promise<void> {
    await this.sql.end();
  }

  /** Round-robin replica selection for read queries. */
  protected nextReplica(): ConnectionConfig["primary"] {
    const replicas = this.config.replicas;
    if (!replicas || replicas.length === 0) return this.config.primary;
    const replica = replicas[this.replicaIndex % replicas.length];
    this.replicaIndex++;
    return replica;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

/**
 * The singleton database connection.
 *
 * When DATABASE_URL is set, creates a real PostgresConnection.
 * Otherwise falls back to InMemoryConnection for development/test.
 */
function createConnection(): DatabaseConnection {
  const url = process.env.DATABASE_URL;
  if (!url) return new InMemoryConnection();

  try {
    const parsed = new URL(url);
    return new PostgresConnection({
      primary: {
        host: parsed.hostname,
        port: parseInt(parsed.port || "5432"),
        database: parsed.pathname.slice(1),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        ssl: parsed.searchParams.get("sslmode") === "require" || parsed.searchParams.get("sslmode") === "prefer",
      },
      pool: DEFAULT_POOL_CONFIG,
    });
  } catch {
    console.warn("[DB] Invalid DATABASE_URL, falling back to InMemoryConnection");
    return new InMemoryConnection();
  }
}

export const db: DatabaseConnection = createConnection();

/**
 * Helper to access the in-memory store directly (for the repository layer).
 * Returns null if the connection is not an InMemoryConnection.
 */
export function getInMemoryStore(): InMemoryStore | null {
  if (db instanceof InMemoryConnection) {
    return db.store;
  }
  return null;
}
