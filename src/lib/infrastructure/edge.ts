// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Global CDN + Edge Computing Layer
//
// Distributed edge infrastructure for geo-routing, caching, and edge functions.
// In-memory simulation now, ready for Cloudflare Workers / AWS Lambda@Edge.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Edge Location Types ──────────────────────────────────────────────────────

export interface EdgeLocation {
  id: string;
  region: string;
  latitude: number;
  longitude: number;
  capacity: number;
  status: "active" | "degraded" | "offline";
}

export interface EdgeConfig {
  locations: EdgeLocation[];
  defaultTtl: number;
  maxCacheSize: number;
  staleWhileRevalidate: number;
}

export interface EdgeRequest {
  path: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  clientIp: string;
  timestamp: number;
}

export interface EdgeResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  servedBy: string;
  cacheStatus: "hit" | "miss" | "stale" | "bypass";
  latencyMs: number;
}

export interface HealthCheckResult {
  locationId: string;
  status: EdgeLocation["status"];
  latencyMs: number;
  checkedAt: string;
  error?: string;
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  ttl: number;
  createdAt: number;
  expiresAt: number;
  staleAt: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  staleHits: number;
  evictions: number;
  totalEntries: number;
  memoryUsed: number;
  hitRate: number;
}

export interface EdgeFunctionDefinition {
  name: string;
  handler: (request: EdgeRequest) => Promise<EdgeResponse>;
  deployedTo: string[];
  timeout: number;
  memoryLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface EdgeFunctionExecution {
  functionName: string;
  locationId: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

interface IpGeoMapping {
  ipPrefix: string;
  coordinates: GeoCoordinates;
  region: string;
}

// ─── Geo Utilities ────────────────────────────────────────────────────────────

/**
 * Haversine formula — distance between two geo points in kilometers.
 * Used for routing requests to the nearest edge location.
 */
export function haversineDistance(
  a: GeoCoordinates,
  b: GeoCoordinates
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      sinDLon * sinDLon;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// ─── Edge Router ──────────────────────────────────────────────────────────────

/**
 * Routes requests to the nearest healthy edge location based on client IP
 * geolocation and edge location availability.
 */
export class EdgeRouter {
  private config: EdgeConfig;
  private ipGeoMap: Map<string, IpGeoMapping> = new Map();
  private healthHistory: Map<string, HealthCheckResult[]> = new Map();

  constructor(config: EdgeConfig) {
    this.config = {
      ...config,
      locations: config.locations.map((loc) => ({ ...loc })),
    };

    this.seedDefaultIpGeoMappings();
  }

  /**
   * Route to the nearest available edge location based on client IP.
   * Falls back to the location with the most capacity if geo lookup fails.
   */
  routeToNearest(clientIp: string): EdgeLocation {
    const available = this.getAvailableLocations();
    if (available.length === 0) {
      throw new Error("No edge locations available");
    }

    const clientGeo = this.resolveClientGeo(clientIp);
    if (!clientGeo) {
      // Fall back to highest-capacity location
      return available.sort((a, b) => b.capacity - a.capacity)[0];
    }

    // Sort by distance from client
    const sorted = available
      .map((loc) => ({
        location: loc,
        distance: haversineDistance(clientGeo, {
          latitude: loc.latitude,
          longitude: loc.longitude,
        }),
      }))
      .sort((a, b) => a.distance - b.distance);

    // Weight by both distance and capacity (closer + more capacity = better)
    const best = sorted[0];

    // If the nearest location is degraded but there's a healthy one within 2x distance, prefer healthy
    if (best.location.status === "degraded" && sorted.length > 1) {
      const nextHealthy = sorted.find(
        (s) => s.location.status === "active"
      );
      if (nextHealthy && nextHealthy.distance < best.distance * 2) {
        return nextHealthy.location;
      }
    }

    return best.location;
  }

  /** Get all edge locations that are not offline. */
  getAvailableLocations(): EdgeLocation[] {
    return this.config.locations.filter((loc) => loc.status !== "offline");
  }

  /** Get all configured edge locations. */
  getAllLocations(): ReadonlyArray<EdgeLocation> {
    return [...this.config.locations];
  }

  /** Update an edge location's status. */
  updateLocationStatus(
    locationId: string,
    status: EdgeLocation["status"]
  ): void {
    const location = this.config.locations.find(
      (loc) => loc.id === locationId
    );
    if (!location) {
      throw new Error(`Edge location ${locationId} not found`);
    }
    location.status = status;
  }

  /** Add a new edge location. */
  addLocation(location: EdgeLocation): void {
    const existing = this.config.locations.find(
      (loc) => loc.id === location.id
    );
    if (existing) {
      throw new Error(`Edge location ${location.id} already exists`);
    }
    this.config.locations.push({ ...location });
  }

  /** Remove an edge location. */
  removeLocation(locationId: string): void {
    this.config.locations = this.config.locations.filter(
      (loc) => loc.id !== locationId
    );
  }

  /**
   * Health check all edge locations.
   * Uses a pluggable check function; defaults to status-based check.
   */
  async healthCheck(
    checkFn?: (location: EdgeLocation) => Promise<HealthCheckResult>
  ): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    const defaultCheck = async (
      loc: EdgeLocation
    ): Promise<HealthCheckResult> => ({
      locationId: loc.id,
      status: loc.status,
      latencyMs: Math.random() * 50 + 5,
      checkedAt: new Date().toISOString(),
    });

    const checker = checkFn ?? defaultCheck;

    const promises = this.config.locations.map(async (loc) => {
      try {
        const result = await checker(loc);
        results.push(result);

        // Track health history
        const history = this.healthHistory.get(loc.id) ?? [];
        history.push(result);
        if (history.length > 100) history.shift();
        this.healthHistory.set(loc.id, history);

        // Auto-degrade if recent checks show issues
        const recentFailures = history
          .slice(-5)
          .filter((h) => h.status === "offline" || h.error);
        if (recentFailures.length >= 3 && loc.status === "active") {
          loc.status = "degraded";
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        results.push({
          locationId: loc.id,
          status: "offline",
          latencyMs: -1,
          checkedAt: new Date().toISOString(),
          error,
        });
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /** Register IP-to-geo mapping (for IP geolocation resolution). */
  registerIpGeoMapping(mapping: IpGeoMapping): void {
    this.ipGeoMap.set(mapping.ipPrefix, mapping);
  }

  /** Get the current edge config. */
  getConfig(): Readonly<EdgeConfig> {
    return {
      ...this.config,
      locations: this.config.locations.map((l) => ({ ...l })),
    };
  }

  // ── Private ──────────────────────────────────────────────────────────────

  /** Resolve client IP to geo coordinates. */
  private resolveClientGeo(clientIp: string): GeoCoordinates | null {
    // Check exact match first
    const exact = this.ipGeoMap.get(clientIp);
    if (exact) return exact.coordinates;

    // Check prefix match (e.g., "10.0." matches "10.0.1.1")
    const entries = Array.from(this.ipGeoMap.entries());
    for (const [prefix, mapping] of entries) {
      if (clientIp.startsWith(prefix)) {
        return mapping.coordinates;
      }
    }

    // Fallback: derive from IP octets for deterministic routing in simulations
    const octets = clientIp.split(".").map(Number);
    if (octets.length === 4 && octets.every((o) => !isNaN(o))) {
      return {
        latitude: ((octets[0] * 256 + octets[1]) % 180) - 90,
        longitude: ((octets[2] * 256 + octets[3]) % 360) - 180,
      };
    }

    return null;
  }

  /** Seed commonly used IP ranges with geo data. */
  private seedDefaultIpGeoMappings(): void {
    const defaults: IpGeoMapping[] = [
      {
        ipPrefix: "10.0.",
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        region: "us-west-2",
      },
      {
        ipPrefix: "10.1.",
        coordinates: { latitude: 40.7128, longitude: -74.006 },
        region: "us-east-1",
      },
      {
        ipPrefix: "10.2.",
        coordinates: { latitude: 51.5074, longitude: -0.1278 },
        region: "eu-west-1",
      },
      {
        ipPrefix: "10.3.",
        coordinates: { latitude: 35.6762, longitude: 139.6503 },
        region: "ap-northeast-1",
      },
      {
        ipPrefix: "172.16.",
        coordinates: { latitude: 48.8566, longitude: 2.3522 },
        region: "eu-west-3",
      },
      {
        ipPrefix: "192.168.",
        coordinates: { latitude: -33.8688, longitude: 151.2093 },
        region: "ap-southeast-2",
      },
    ];

    for (const mapping of defaults) {
      this.ipGeoMap.set(mapping.ipPrefix, mapping);
    }
  }
}

// ─── Distributed Cache ────────────────────────────────────────────────────────

/**
 * Per-edge-location LRU cache with TTL, stale-while-revalidate,
 * tag-based invalidation, and cross-location propagation.
 */
export class DistributedCache {
  private caches: Map<string, Map<string, CacheEntry>> = new Map();
  private metrics: Map<string, CacheMetrics> = new Map();
  private maxCacheSize: number;
  private defaultTtl: number;
  private staleWhileRevalidate: number;
  private invalidationListeners: Array<
    (pattern: string, locationId: string) => void
  > = [];
  private revalidationCallbacks: Map<
    string,
    (key: string) => Promise<unknown>
  > = new Map();

  constructor(config: {
    maxCacheSize?: number;
    defaultTtl?: number;
    staleWhileRevalidate?: number;
  } = {}) {
    this.maxCacheSize = config.maxCacheSize ?? 10000;
    this.defaultTtl = config.defaultTtl ?? 300000; // 5 minutes
    this.staleWhileRevalidate = config.staleWhileRevalidate ?? 60000; // 1 minute
  }

  /** Initialize cache storage for an edge location. */
  initLocation(locationId: string): void {
    if (!this.caches.has(locationId)) {
      this.caches.set(locationId, new Map());
      this.metrics.set(locationId, {
        hits: 0,
        misses: 0,
        staleHits: 0,
        evictions: 0,
        totalEntries: 0,
        memoryUsed: 0,
        hitRate: 0,
      });
    }
  }

  /**
   * Get a value from the cache at a specific edge location.
   * Supports stale-while-revalidate: returns stale data while refreshing in background.
   */
  async get<T = unknown>(
    key: string,
    locationId: string
  ): Promise<{ value: T | null; status: "hit" | "miss" | "stale" }> {
    this.initLocation(locationId);
    const cache = this.caches.get(locationId)!;
    const metrics = this.metrics.get(locationId)!;
    const entry = cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      metrics.misses++;
      this.updateHitRate(metrics);
      return { value: null, status: "miss" };
    }

    const now = Date.now();

    // Expired and past stale window — remove and return miss
    if (now > entry.expiresAt + this.staleWhileRevalidate) {
      cache.delete(key);
      metrics.totalEntries = cache.size;
      metrics.misses++;
      this.updateHitRate(metrics);
      return { value: null, status: "miss" };
    }

    // Update access metadata
    entry.accessCount++;
    entry.lastAccessed = now;

    // Stale but within revalidate window — return stale and trigger background revalidation
    if (now > entry.expiresAt) {
      metrics.staleHits++;
      this.updateHitRate(metrics);
      this.triggerRevalidation(key, locationId);
      return { value: entry.value, status: "stale" };
    }

    // Fresh hit
    metrics.hits++;
    this.updateHitRate(metrics);
    return { value: entry.value, status: "hit" };
  }

  /**
   * Set a value in the cache at a specific edge location.
   * Handles LRU eviction when the cache is full.
   */
  set<T = unknown>(
    key: string,
    value: T,
    locationId: string,
    options: { ttl?: number; tags?: string[] } = {}
  ): void {
    this.initLocation(locationId);
    const cache = this.caches.get(locationId)!;
    const metrics = this.metrics.get(locationId)!;

    // Evict LRU entries if cache is full
    while (cache.size >= this.maxCacheSize) {
      this.evictLRU(locationId);
    }

    const now = Date.now();
    const ttl = options.ttl ?? this.defaultTtl;

    const entry: CacheEntry<T> = {
      key,
      value,
      ttl,
      createdAt: now,
      expiresAt: now + ttl,
      staleAt: now + ttl + this.staleWhileRevalidate,
      accessCount: 0,
      lastAccessed: now,
      tags: options.tags ?? [],
    };

    cache.set(key, entry as CacheEntry);
    metrics.totalEntries = cache.size;
    metrics.memoryUsed = this.estimateMemoryUsage(cache);
  }

  /** Delete a specific key from a location's cache. */
  delete(key: string, locationId: string): boolean {
    const cache = this.caches.get(locationId);
    if (!cache) return false;

    const deleted = cache.delete(key);
    if (deleted) {
      const metrics = this.metrics.get(locationId)!;
      metrics.totalEntries = cache.size;
      metrics.memoryUsed = this.estimateMemoryUsage(cache);
    }
    return deleted;
  }

  /**
   * Invalidate cache entries matching a pattern across all edge locations.
   * Supports glob-like patterns (* matches any characters).
   */
  invalidate(pattern: string): number {
    let totalInvalidated = 0;

    const cacheEntries = Array.from(this.caches.entries());
    for (const [locationId, cache] of cacheEntries) {
      const regex = this.patternToRegex(pattern);

      const keys = Array.from(cache.keys());
      for (const key of keys) {
        if (regex.test(key)) {
          cache.delete(key);
          totalInvalidated++;
        }
      }

      const metrics = this.metrics.get(locationId)!;
      metrics.totalEntries = cache.size;
      metrics.memoryUsed = this.estimateMemoryUsage(cache);

      // Notify listeners for cross-location propagation
      for (const listener of this.invalidationListeners) {
        listener(pattern, locationId);
      }
    }

    return totalInvalidated;
  }

  /**
   * Invalidate cache entries by tag across all edge locations.
   * More efficient than pattern matching for organized cache entries.
   */
  invalidateByTag(tag: string): number {
    let totalInvalidated = 0;

    const cacheEntries = Array.from(this.caches.entries());
    for (const [locationId, cache] of cacheEntries) {
      const cacheItems = Array.from(cache.entries());
      for (const [key, entry] of cacheItems) {
        if (entry.tags.includes(tag)) {
          cache.delete(key);
          totalInvalidated++;
        }
      }

      const metrics = this.metrics.get(locationId)!;
      metrics.totalEntries = cache.size;
      metrics.memoryUsed = this.estimateMemoryUsage(cache);
    }

    return totalInvalidated;
  }

  /**
   * Cache warming — pre-populate cache entries at specific locations.
   * Used for popular content that should be available immediately.
   */
  warm(
    entries: Array<{ key: string; value: unknown; ttl?: number; tags?: string[] }>,
    locationIds: string[]
  ): number {
    let warmed = 0;

    for (const locationId of locationIds) {
      this.initLocation(locationId);
      for (const entry of entries) {
        this.set(entry.key, entry.value, locationId, {
          ttl: entry.ttl,
          tags: entry.tags,
        });
        warmed++;
      }
    }

    return warmed;
  }

  /** Register a callback for background revalidation of stale entries. */
  registerRevalidationCallback(
    keyPrefix: string,
    callback: (key: string) => Promise<unknown>
  ): void {
    this.revalidationCallbacks.set(keyPrefix, callback);
  }

  /**
   * Register a listener for cache invalidation events.
   * Used for cross-location invalidation propagation.
   */
  onInvalidation(
    listener: (pattern: string, locationId: string) => void
  ): void {
    this.invalidationListeners.push(listener);
  }

  /** Get cache metrics for a specific edge location. */
  getMetrics(locationId: string): CacheMetrics | null {
    const metrics = this.metrics.get(locationId);
    return metrics ? { ...metrics } : null;
  }

  /** Get aggregated cache metrics across all locations. */
  getAggregatedMetrics(): CacheMetrics {
    const aggregated: CacheMetrics = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      evictions: 0,
      totalEntries: 0,
      memoryUsed: 0,
      hitRate: 0,
    };

    const allMetrics = Array.from(this.metrics.values());
    for (const metrics of allMetrics) {
      aggregated.hits += metrics.hits;
      aggregated.misses += metrics.misses;
      aggregated.staleHits += metrics.staleHits;
      aggregated.evictions += metrics.evictions;
      aggregated.totalEntries += metrics.totalEntries;
      aggregated.memoryUsed += metrics.memoryUsed;
    }

    const total = aggregated.hits + aggregated.misses + aggregated.staleHits;
    aggregated.hitRate =
      total > 0 ? (aggregated.hits + aggregated.staleHits) / total : 0;

    return aggregated;
  }

  /** Get all initialized location IDs. */
  getLocationIds(): string[] {
    return Array.from(this.caches.keys());
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  /** Recalculate hit rate for a metrics object. */
  private updateHitRate(metrics: CacheMetrics): void {
    const total = metrics.hits + metrics.misses + metrics.staleHits;
    metrics.hitRate = total > 0 ? (metrics.hits + metrics.staleHits) / total : 0;
  }

  /** Evict the least recently used entry from a location's cache. */
  private evictLRU(locationId: string): void {
    const cache = this.caches.get(locationId);
    if (!cache || cache.size === 0) return;

    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    const cacheItems = Array.from(cache.entries());
    for (const [key, entry] of cacheItems) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
      const metrics = this.metrics.get(locationId)!;
      metrics.evictions++;
    }
  }

  /** Trigger background revalidation for a stale cache entry. */
  private triggerRevalidation(key: string, locationId: string): void {
    const revalEntries = Array.from(this.revalidationCallbacks.entries());
    for (const [prefix, callback] of revalEntries) {
      if (key.startsWith(prefix)) {
        // Fire and forget — the point is to refresh the cache asynchronously
        callback(key)
          .then((newValue) => {
            if (newValue !== undefined) {
              this.set(key, newValue, locationId);
            }
          })
          .catch(() => {
            // Revalidation failure is non-fatal; stale data continues to be served
          });
        break;
      }
    }
  }

  /** Convert a glob pattern to a regex. */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    return new RegExp(`^${escaped}$`);
  }

  /** Rough memory estimate for cache contents. */
  private estimateMemoryUsage(cache: Map<string, CacheEntry>): number {
    let bytes = 0;
    const cacheItems = Array.from(cache.entries());
    for (const [key, entry] of cacheItems) {
      bytes += key.length * 2; // UTF-16 chars
      bytes += JSON.stringify(entry.value).length * 2;
      bytes += 200; // Overhead for metadata
    }
    return bytes;
  }
}

// ─── Edge Function Runtime ────────────────────────────────────────────────────

/**
 * Serverless edge function runtime — register, deploy, and execute
 * functions at specific edge locations with timeout enforcement.
 */
export class EdgeFunctionRuntime {
  private functions: Map<string, EdgeFunctionDefinition> = new Map();
  private executionLog: EdgeFunctionExecution[] = [];
  private maxLogSize: number;

  constructor(options: { maxLogSize?: number } = {}) {
    this.maxLogSize = options.maxLogSize ?? 10000;

    // Register built-in edge functions
    this.registerBuiltins();
  }

  /**
   * Register an edge function with a handler.
   */
  register(
    name: string,
    handler: (request: EdgeRequest) => Promise<EdgeResponse>,
    options: { timeout?: number; memoryLimit?: number } = {}
  ): void {
    if (this.functions.has(name)) {
      // Update existing function
      const existing = this.functions.get(name)!;
      existing.handler = handler;
      existing.timeout = options.timeout ?? existing.timeout;
      existing.memoryLimit = options.memoryLimit ?? existing.memoryLimit;
      existing.updatedAt = new Date().toISOString();
      return;
    }

    this.functions.set(name, {
      name,
      handler,
      deployedTo: [],
      timeout: options.timeout ?? 5000,
      memoryLimit: options.memoryLimit ?? 128 * 1024 * 1024, // 128 MB default
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Execute an edge function by name with timeout enforcement.
   */
  async execute(
    name: string,
    request: EdgeRequest,
    locationId?: string
  ): Promise<EdgeResponse> {
    const fn = this.functions.get(name);
    if (!fn) {
      throw new Error(`Edge function '${name}' not found`);
    }

    // If locationId specified, check deployment
    if (locationId && fn.deployedTo.length > 0 && !fn.deployedTo.includes(locationId)) {
      throw new Error(
        `Edge function '${name}' is not deployed to location '${locationId}'`
      );
    }

    const startedAt = Date.now();
    const execution: EdgeFunctionExecution = {
      functionName: name,
      locationId: locationId ?? "local",
      startedAt,
      completedAt: 0,
      durationMs: 0,
      success: false,
    };

    try {
      const response = await this.withTimeout(
        fn.handler(request),
        fn.timeout
      );

      execution.completedAt = Date.now();
      execution.durationMs = execution.completedAt - execution.startedAt;
      execution.success = true;
      this.recordExecution(execution);

      return response;
    } catch (err) {
      execution.completedAt = Date.now();
      execution.durationMs = execution.completedAt - execution.startedAt;
      execution.success = false;
      execution.error =
        err instanceof Error ? err.message : String(err);
      this.recordExecution(execution);
      throw err;
    }
  }

  /**
   * Deploy an edge function to specific edge locations.
   * In a real system, this would push the function code to edge nodes.
   */
  deploy(name: string, locationIds: string[]): void {
    const fn = this.functions.get(name);
    if (!fn) {
      throw new Error(`Edge function '${name}' not found`);
    }

    const newLocations = new Set(fn.deployedTo.concat(locationIds));
    fn.deployedTo = Array.from(newLocations);
    fn.updatedAt = new Date().toISOString();
  }

  /**
   * Undeploy an edge function from specific locations.
   */
  undeploy(name: string, locationIds: string[]): void {
    const fn = this.functions.get(name);
    if (!fn) {
      throw new Error(`Edge function '${name}' not found`);
    }

    fn.deployedTo = fn.deployedTo.filter(
      (loc) => !locationIds.includes(loc)
    );
    fn.updatedAt = new Date().toISOString();
  }

  /** Get a function definition by name. */
  getFunction(name: string): EdgeFunctionDefinition | null {
    const fn = this.functions.get(name);
    return fn ? { ...fn } : null;
  }

  /** List all registered edge functions. */
  listFunctions(): EdgeFunctionDefinition[] {
    return Array.from(this.functions.values()).map((fn) => ({ ...fn }));
  }

  /** Get recent execution log entries. */
  getExecutionLog(options: {
    functionName?: string;
    locationId?: string;
    limit?: number;
  } = {}): EdgeFunctionExecution[] {
    let log = [...this.executionLog];

    if (options.functionName) {
      log = log.filter((e) => e.functionName === options.functionName);
    }
    if (options.locationId) {
      log = log.filter((e) => e.locationId === options.locationId);
    }

    const limit = options.limit ?? 100;
    return log.slice(-limit);
  }

  /** Get function execution statistics. */
  getFunctionStats(name: string): {
    totalExecutions: number;
    successRate: number;
    avgDurationMs: number;
    p95DurationMs: number;
    p99DurationMs: number;
  } | null {
    const executions = this.executionLog.filter(
      (e) => e.functionName === name
    );
    if (executions.length === 0) return null;

    const successful = executions.filter((e) => e.success);
    const durations = executions
      .map((e) => e.durationMs)
      .sort((a, b) => a - b);

    return {
      totalExecutions: executions.length,
      successRate: successful.length / executions.length,
      avgDurationMs:
        durations.reduce((a, b) => a + b, 0) / durations.length,
      p95DurationMs: durations[Math.floor(durations.length * 0.95)] ?? 0,
      p99DurationMs: durations[Math.floor(durations.length * 0.99)] ?? 0,
    };
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  /** Record an execution in the log with size cap. */
  private recordExecution(execution: EdgeFunctionExecution): void {
    this.executionLog.push(execution);
    if (this.executionLog.length > this.maxLogSize) {
      this.executionLog = this.executionLog.slice(-this.maxLogSize);
    }
  }

  /** Wrap a promise with a timeout. */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(`Edge function timed out after ${timeoutMs}ms`)
        );
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

  /** Register built-in Social Perks edge functions. */
  private registerBuiltins(): void {
    // cachePricing — cache pricing oracle responses at the edge
    this.register(
      "cachePricing",
      async (request: EdgeRequest): Promise<EdgeResponse> => {
        const startTime = Date.now();
        return {
          status: 200,
          headers: {
            "content-type": "application/json",
            "cache-control": `public, max-age=300, stale-while-revalidate=60`,
            "x-edge-function": "cachePricing",
          },
          body: {
            cached: true,
            path: request.path,
            timestamp: new Date().toISOString(),
          },
          servedBy: "edge",
          cacheStatus: "hit",
          latencyMs: Date.now() - startTime,
        };
      },
      { timeout: 3000 }
    );

    // cacheActions — cache action library at the edge
    this.register(
      "cacheActions",
      async (request: EdgeRequest): Promise<EdgeResponse> => {
        const startTime = Date.now();
        return {
          status: 200,
          headers: {
            "content-type": "application/json",
            "cache-control": `public, max-age=600, stale-while-revalidate=120`,
            "x-edge-function": "cacheActions",
          },
          body: {
            cached: true,
            path: request.path,
            timestamp: new Date().toISOString(),
          },
          servedBy: "edge",
          cacheStatus: "hit",
          latencyMs: Date.now() - startTime,
        };
      },
      { timeout: 3000 }
    );

    // geoRouteVerification — route verification requests to the nearest region
    this.register(
      "geoRouteVerification",
      async (request: EdgeRequest): Promise<EdgeResponse> => {
        const startTime = Date.now();
        const clientRegion = request.headers["x-client-region"] ?? "unknown";
        return {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-edge-function": "geoRouteVerification",
            "x-routed-region": clientRegion,
          },
          body: {
            routed: true,
            clientIp: request.clientIp,
            clientRegion,
            path: request.path,
            timestamp: new Date().toISOString(),
          },
          servedBy: "edge",
          cacheStatus: "bypass",
          latencyMs: Date.now() - startTime,
        };
      },
      { timeout: 10000 }
    );
  }
}

// ─── Default Instances ────────────────────────────────────────────────────────

/** Default global edge locations (major cloud regions). */
const defaultLocations: EdgeLocation[] = [
  {
    id: "edge-us-east-1",
    region: "us-east-1",
    latitude: 39.0438,
    longitude: -77.4874,
    capacity: 10000,
    status: "active",
  },
  {
    id: "edge-us-west-2",
    region: "us-west-2",
    latitude: 45.5945,
    longitude: -122.1562,
    capacity: 8000,
    status: "active",
  },
  {
    id: "edge-eu-west-1",
    region: "eu-west-1",
    latitude: 53.3498,
    longitude: -6.2603,
    capacity: 7000,
    status: "active",
  },
  {
    id: "edge-eu-central-1",
    region: "eu-central-1",
    latitude: 50.1109,
    longitude: 8.6821,
    capacity: 6000,
    status: "active",
  },
  {
    id: "edge-ap-northeast-1",
    region: "ap-northeast-1",
    latitude: 35.6762,
    longitude: 139.6503,
    capacity: 7000,
    status: "active",
  },
  {
    id: "edge-ap-southeast-1",
    region: "ap-southeast-1",
    latitude: 1.3521,
    longitude: 103.8198,
    capacity: 5000,
    status: "active",
  },
  {
    id: "edge-ap-southeast-2",
    region: "ap-southeast-2",
    latitude: -33.8688,
    longitude: 151.2093,
    capacity: 4000,
    status: "active",
  },
  {
    id: "edge-sa-east-1",
    region: "sa-east-1",
    latitude: -23.5505,
    longitude: -46.6333,
    capacity: 3000,
    status: "active",
  },
];

/** Default edge router with global PoP locations. */
export const edgeRouter = new EdgeRouter({
  locations: defaultLocations,
  defaultTtl: 300000,
  maxCacheSize: 50000,
  staleWhileRevalidate: 60000,
});

/** Default distributed cache. */
export const distributedCache = new DistributedCache({
  maxCacheSize: 50000,
  defaultTtl: 300000,
  staleWhileRevalidate: 60000,
});

/** Default edge function runtime with built-in Social Perks functions. */
export const edgeFunctionRuntime = new EdgeFunctionRuntime();
