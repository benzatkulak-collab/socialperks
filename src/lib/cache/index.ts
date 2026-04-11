/**
 * Redis Cache Abstraction with In-Memory Fallback
 *
 * Connects to Redis via REDIS_URL when available.
 * Falls back to an in-memory Map with TTL tracking when Redis is unavailable.
 *
 * Usage:
 *   import { cache } from "@/lib/cache";
 *   await cache.set("key", { data: 1 }, 300);
 *   const val = await cache.get<{ data: number }>("key");
 */

// ─── Types ──────────────────────────────────────────────────────────────────

type RedisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, exMode: string, ttl: number): Promise<unknown>;
  del(key: string | string[]): Promise<number>;
  scanStream(opts: { match: string; count: number }): {
    on(event: "data", cb: (keys: string[]) => void): void;
    on(event: "end", cb: () => void): void;
    on(event: "error", cb: (err: Error) => void): void;
  };
  status: string;
  quit(): Promise<string>;
};

// ─── In-Memory Store ────────────────────────────────────────────────────────

interface MemoryEntry {
  value: string;
  expiresAt: number;
  timer: ReturnType<typeof setTimeout>;
}

class MemoryStore {
  private store = new Map<string, MemoryEntry>();

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.del(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: string, ttlSeconds: number): void {
    // Clear existing timer if overwriting
    const existing = this.store.get(key);
    if (existing) {
      clearTimeout(existing.timer);
    }

    const expiresAt = Date.now() + ttlSeconds * 1000;
    const timer = setTimeout(() => {
      this.store.delete(key);
    }, ttlSeconds * 1000);

    // Prevent timer from keeping Node.js alive
    if (typeof timer === "object" && "unref" in timer) {
      timer.unref();
    }

    this.store.set(key, { value, expiresAt, timer });
  }

  del(key: string): void {
    const entry = this.store.get(key);
    if (entry) {
      clearTimeout(entry.timer);
      this.store.delete(key);
    }
  }

  invalidatePattern(pattern: string): void {
    // Convert Redis glob pattern to regex
    const regexStr = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    const regex = new RegExp(`^${regexStr}$`);

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.del(key);
      }
    }
  }
}

// ─── Cache Class ────────────────────────────────────────────────────────────

class Cache {
  private redis: RedisClient | null = null;
  private memory: MemoryStore;
  private _ready = false;

  constructor() {
    this.memory = new MemoryStore();
    this.initRedis();
  }

  private initRedis(): void {
    const url = process.env.REDIS_URL;
    if (!url) {
      this._ready = true;
      return;
    }

    // Use eval to prevent Webpack from statically analyzing the require
    try {
      // eslint-disable-next-line no-eval
      const Redis = eval('require')("ioredis") as {
        default?: new (url: string, opts: Record<string, unknown>) => RedisClient;
        new (url: string, opts: Record<string, unknown>): RedisClient;
      };

      const RedisClass = Redis.default ?? Redis;
      this.redis = new (RedisClass as new (url: string, opts: Record<string, unknown>) => RedisClient)(url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => Math.min(times * 200, 3000),
        lazyConnect: false,
      });

      this._ready = true;
    } catch {
      // ioredis not installed — use memory fallback
      this.redis = null;
      this._ready = true;
    }
  }

  get isRedis(): boolean {
    return this.redis !== null;
  }

  get ready(): boolean {
    return this._ready;
  }

  // ── Get ────────────────────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redis) {
        const raw = await this.redis.get(key);
        if (raw === null) return null;
        return JSON.parse(raw) as T;
      }

      const raw = this.memory.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  // ── Set ────────────────────────────────────────────────────────────────

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);

    try {
      if (this.redis) {
        await this.redis.set(key, serialized, "EX", ttlSeconds);
        return;
      }

      this.memory.set(key, serialized, ttlSeconds);
    } catch {
      // Silently fail — cache is non-critical
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────

  async del(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key);
        return;
      }

      this.memory.del(key);
    } catch {
      // Silently fail
    }
  }

  // ── Invalidate Pattern ─────────────────────────────────────────────────

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      if (this.redis) {
        // Use SCAN to find matching keys, then DEL in batches
        const stream = this.redis.scanStream({ match: pattern, count: 100 });
        const keysToDelete: string[] = [];

        await new Promise<void>((resolve, reject) => {
          stream.on("data", (keys: string[]) => {
            keysToDelete.push(...keys);
          });
          stream.on("end", () => resolve());
          stream.on("error", (err: Error) => reject(err));
        });

        if (keysToDelete.length > 0) {
          // Delete in batches of 100
          for (let i = 0; i < keysToDelete.length; i += 100) {
            const batch = keysToDelete.slice(i, i + 100);
            await this.redis.del(batch);
          }
        }
        return;
      }

      this.memory.invalidatePattern(pattern);
    } catch {
      // Silently fail
    }
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────────

export const cache = new Cache();
