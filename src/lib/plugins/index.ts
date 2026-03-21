// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Plugin / Extension Runtime
// Production-grade plugin system with sandboxed execution, hook chaining,
// isolated storage, dependency resolution, and built-in plugins.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Plugin Permissions ─────────────────────────────────────────────────────

export type PluginPermission =
  | "campaigns:read"
  | "campaigns:write"
  | "submissions:read"
  | "submissions:write"
  | "analytics:read"
  | "users:read"
  | "notifications:send"
  | "webhooks:register"
  | "storage:read"
  | "storage:write";

const ALL_PERMISSIONS: ReadonlySet<PluginPermission> = new Set<PluginPermission>([
  "campaigns:read",
  "campaigns:write",
  "submissions:read",
  "submissions:write",
  "analytics:read",
  "users:read",
  "notifications:send",
  "webhooks:register",
  "storage:read",
  "storage:write",
]);

// ─── Hook Definitions ───────────────────────────────────────────────────────

export type HookName =
  | "campaign:before_create"
  | "campaign:after_create"
  | "campaign:before_launch"
  | "campaign:after_launch"
  | "submission:before_create"
  | "submission:after_create"
  | "submission:before_review"
  | "submission:after_review"
  | "perk:before_redeem"
  | "perk:after_redeem"
  | "user:after_login"
  | "analytics:daily_report";

const VALID_HOOKS: ReadonlySet<string> = new Set<HookName>([
  "campaign:before_create",
  "campaign:after_create",
  "campaign:before_launch",
  "campaign:after_launch",
  "submission:before_create",
  "submission:after_create",
  "submission:before_review",
  "submission:after_review",
  "perk:before_redeem",
  "perk:after_redeem",
  "user:after_login",
  "analytics:daily_report",
]);

// ─── Plugin Manifest & Lifecycle Types ──────────────────────────────────────

export interface PluginConfigField {
  type: "string" | "number" | "boolean";
  default: unknown;
  description: string;
  required: boolean;
}

export interface PluginDependency {
  pluginId: string;
  version: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: PluginPermission[];
  hooks: string[];
  config: Record<string, PluginConfigField>;
  dependencies: PluginDependency[];
  minPlatformVersion: string;
}

export type PluginStatus = "installed" | "active" | "disabled" | "error" | "updating";

// ─── Hook Payload & Result ──────────────────────────────────────────────────

export interface HookPayload {
  hookName: HookName;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface HookResult {
  modified: boolean;
  data: Record<string, unknown>;
  errors: string[];
}

// ─── Plugin Context & Sandboxed API ─────────────────────────────────────────

export interface SandboxedApi {
  campaigns: {
    list: () => Promise<unknown[]>;
    get: (id: string) => Promise<unknown>;
  };
  submissions: {
    list: (campaignId: string) => Promise<unknown[]>;
  };
  analytics: {
    query: (metric: string, timeRange: string) => Promise<unknown>;
  };
  notifications: {
    send: (userId: string, message: string) => Promise<void>;
  };
}

export interface PluginLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}

export interface PluginContext {
  pluginId: string;
  config: Record<string, unknown>;
  api: SandboxedApi;
  storage: PluginStorageInterface;
  logger: PluginLogger;
}

// ─── Plugin Handler Type ────────────────────────────────────────────────────

export type PluginHookHandler = (
  context: PluginContext,
  payload: HookPayload
) => Promise<HookResult>;

// ─── Installed Plugin Record ────────────────────────────────────────────────

export interface InstalledPlugin {
  manifest: PluginManifest;
  status: PluginStatus;
  config: Record<string, unknown>;
  handlers: Partial<Record<HookName, PluginHookHandler>>;
  installedAt: string;
  updatedAt: string;
  lastError?: string;
  healthCheckPassedAt?: string;
}

// ─── Hook Registration Entry ────────────────────────────────────────────────

interface HookRegistration {
  pluginId: string;
  handler: PluginHookHandler;
  priority: number;
}

// ─── Plugin Log Entry ───────────────────────────────────────────────────────

export interface PluginLogEntry {
  timestamp: string;
  pluginId: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  meta?: Record<string, unknown>;
}

// ─── Execution Trace ────────────────────────────────────────────────────────

export interface ExecutionTrace {
  hookName: HookName;
  pluginId: string;
  startedAt: string;
  durationMs: number;
  result: HookResult;
  error?: string;
  timedOut: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// Plugin Storage — Per-plugin isolated key-value store
// ══════════════════════════════════════════════════════════════════════════════

export interface PluginStorageInterface {
  get: <T = unknown>(key: string) => Promise<T | undefined>;
  set: <T = unknown>(key: string, value: T) => Promise<void>;
  delete: (key: string) => Promise<boolean>;
  has: (key: string) => Promise<boolean>;
  list: () => Promise<string[]>;
}

const DEFAULT_STORAGE_LIMIT_BYTES = 1024 * 1024; // 1 MB per plugin

export class PluginStorage implements PluginStorageInterface {
  private store: Map<string, string> = new Map();
  private readonly namespace: string;
  private readonly maxSizeBytes: number;
  private currentSizeBytes: number = 0;

  constructor(pluginId: string, maxSizeBytes: number = DEFAULT_STORAGE_LIMIT_BYTES) {
    this.namespace = `plugin:${pluginId}`;
    this.maxSizeBytes = maxSizeBytes;
  }

  private namespacedKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private rawKey(namespacedKey: string): string {
    return namespacedKey.slice(this.namespace.length + 1);
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const raw = this.store.get(this.namespacedKey(key));
    if (raw === undefined) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    const nsKey = this.namespacedKey(key);
    const serialized = JSON.stringify(value);
    const newEntrySize = nsKey.length * 2 + serialized.length * 2; // rough byte estimate (UTF-16)

    // Subtract old value size if overwriting
    const existing = this.store.get(nsKey);
    if (existing !== undefined) {
      this.currentSizeBytes -= nsKey.length * 2 + existing.length * 2;
    }

    if (this.currentSizeBytes + newEntrySize > this.maxSizeBytes) {
      throw new PluginStorageQuotaError(
        this.namespace,
        this.currentSizeBytes,
        newEntrySize,
        this.maxSizeBytes
      );
    }

    this.store.set(nsKey, serialized);
    this.currentSizeBytes += newEntrySize;
  }

  async delete(key: string): Promise<boolean> {
    const nsKey = this.namespacedKey(key);
    const existing = this.store.get(nsKey);
    if (existing === undefined) return false;

    this.currentSizeBytes -= nsKey.length * 2 + existing.length * 2;
    this.store.delete(nsKey);
    return true;
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(this.namespacedKey(key));
  }

  async list(): Promise<string[]> {
    const keys: string[] = [];
    for (const nsKey of this.store.keys()) {
      keys.push(this.rawKey(nsKey));
    }
    return keys;
  }

  /** Returns approximate bytes currently used by this plugin's storage. */
  getUsageBytes(): number {
    return this.currentSizeBytes;
  }

  /** Returns the maximum allowed storage in bytes. */
  getLimitBytes(): number {
    return this.maxSizeBytes;
  }

  /** Wipe all data for this plugin. */
  clear(): void {
    this.store.clear();
    this.currentSizeBytes = 0;
  }
}

// ─── Storage Errors ─────────────────────────────────────────────────────────

export class PluginStorageQuotaError extends Error {
  constructor(
    public readonly namespace: string,
    public readonly currentBytes: number,
    public readonly requestedBytes: number,
    public readonly limitBytes: number
  ) {
    super(
      `Storage quota exceeded for ${namespace}: ` +
        `current=${currentBytes}B, requested=${requestedBytes}B, limit=${limitBytes}B`
    );
    this.name = "PluginStorageQuotaError";
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Plugin Sandbox — Restricted execution environment
// ══════════════════════════════════════════════════════════════════════════════

export interface SandboxOptions {
  timeoutMs: number;
  memoryLimitBytes: number;
}

const DEFAULT_SANDBOX_OPTIONS: SandboxOptions = {
  timeoutMs: 5000,
  memoryLimitBytes: 50 * 1024 * 1024, // 50 MB soft limit
};

export class PluginSandbox {
  private readonly options: SandboxOptions;
  private memoryUsageEstimate: number = 0;

  constructor(options: Partial<SandboxOptions> = {}) {
    this.options = { ...DEFAULT_SANDBOX_OPTIONS, ...options };
  }

  /**
   * Create a restricted execution context for a plugin based on its permissions.
   * Only APIs the plugin has permission to use are exposed; all others throw.
   */
  createContext(
    plugin: InstalledPlugin,
    storage: PluginStorage,
    logSink: (entry: PluginLogEntry) => void,
    dataProviders: DataProviders
  ): PluginContext {
    const permissions = new Set(plugin.manifest.permissions);

    const makePermissionGuard = (permission: PluginPermission, apiName: string) => {
      if (!permissions.has(permission)) {
        throw new PluginPermissionError(plugin.manifest.id, permission, apiName);
      }
    };

    // Build sandboxed API — only expose what the plugin is allowed to access
    const api: SandboxedApi = {
      campaigns: {
        list: async () => {
          makePermissionGuard("campaigns:read", "campaigns.list");
          return dataProviders.campaigns.list();
        },
        get: async (id: string) => {
          makePermissionGuard("campaigns:read", "campaigns.get");
          return dataProviders.campaigns.get(id);
        },
      },
      submissions: {
        list: async (campaignId: string) => {
          makePermissionGuard("submissions:read", "submissions.list");
          return dataProviders.submissions.list(campaignId);
        },
      },
      analytics: {
        query: async (metric: string, timeRange: string) => {
          makePermissionGuard("analytics:read", "analytics.query");
          return dataProviders.analytics.query(metric, timeRange);
        },
      },
      notifications: {
        send: async (userId: string, message: string) => {
          makePermissionGuard("notifications:send", "notifications.send");
          return dataProviders.notifications.send(userId, message);
        },
      },
    };

    // Build sandboxed storage — guard read/write separately
    const sandboxedStorage: PluginStorageInterface = {
      get: async <T = unknown>(key: string) => {
        makePermissionGuard("storage:read", "storage.get");
        return storage.get<T>(key);
      },
      set: async <T = unknown>(key: string, value: T) => {
        makePermissionGuard("storage:write", "storage.set");
        return storage.set<T>(key, value);
      },
      delete: async (key: string) => {
        makePermissionGuard("storage:write", "storage.delete");
        return storage.delete(key);
      },
      has: async (key: string) => {
        makePermissionGuard("storage:read", "storage.has");
        return storage.has(key);
      },
      list: async () => {
        makePermissionGuard("storage:read", "storage.list");
        return storage.list();
      },
    };

    // Build logger
    const makeLogger = (level: PluginLogEntry["level"]) => {
      return (message: string, meta?: Record<string, unknown>) => {
        logSink({
          timestamp: new Date().toISOString(),
          pluginId: plugin.manifest.id,
          level,
          message,
          meta,
        });
      };
    };

    const logger: PluginLogger = {
      info: makeLogger("info"),
      warn: makeLogger("warn"),
      error: makeLogger("error"),
      debug: makeLogger("debug"),
    };

    return {
      pluginId: plugin.manifest.id,
      config: { ...plugin.config },
      api,
      storage: sandboxedStorage,
      logger,
    };
  }

  /**
   * Execute a plugin handler within the sandbox.
   * Enforces timeout and isolates errors so they never propagate to the host.
   */
  async execute(
    handler: PluginHookHandler,
    context: PluginContext,
    payload: HookPayload
  ): Promise<{ result: HookResult; durationMs: number; timedOut: boolean; error?: string }> {
    const start = Date.now();

    try {
      const result = await this.timeout(handler(context, payload), this.options.timeoutMs);
      const durationMs = Date.now() - start;

      // Track approximate memory for the result payload
      this.trackMemory(result);

      return { result, durationMs, timedOut: false };
    } catch (err) {
      const durationMs = Date.now() - start;
      const isTimeout = err instanceof PluginTimeoutError;
      const errorMessage = err instanceof Error ? err.message : String(err);

      return {
        result: { modified: false, data: {}, errors: [errorMessage] },
        durationMs,
        timedOut: isTimeout,
        error: errorMessage,
      };
    }
  }

  /**
   * Wrap a promise with a timeout. Rejects with PluginTimeoutError if
   * the promise does not resolve within the given duration.
   */
  async timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new PluginTimeoutError(ms));
      }, ms);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      return result;
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  /**
   * Rough memory tracking. This is a soft limit check — we estimate the JSON
   * size of the result to keep tabs on memory-hungry plugins.
   */
  private trackMemory(result: HookResult): void {
    try {
      const jsonSize = JSON.stringify(result).length * 2; // UTF-16 estimate
      this.memoryUsageEstimate += jsonSize;
    } catch {
      // Non-serializable results get a fixed penalty
      this.memoryUsageEstimate += 1024;
    }
  }

  /** Returns approximate cumulative memory usage from tracked results. */
  getMemoryUsageEstimate(): number {
    return this.memoryUsageEstimate;
  }

  /** Check if estimated memory usage exceeds the soft limit. */
  isMemoryLimitExceeded(): boolean {
    return this.memoryUsageEstimate > this.options.memoryLimitBytes;
  }

  /** Reset memory tracking counter. */
  resetMemoryTracking(): void {
    this.memoryUsageEstimate = 0;
  }
}

// ─── Sandbox Errors ─────────────────────────────────────────────────────────

export class PluginTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Plugin execution timed out after ${timeoutMs}ms`);
    this.name = "PluginTimeoutError";
  }
}

export class PluginPermissionError extends Error {
  constructor(
    public readonly pluginId: string,
    public readonly permission: PluginPermission,
    public readonly apiName: string
  ) {
    super(
      `Plugin "${pluginId}" does not have permission "${permission}" ` +
        `required to call "${apiName}"`
    );
    this.name = "PluginPermissionError";
  }
}

// ─── Data Providers (injected by host application) ──────────────────────────

export interface DataProviders {
  campaigns: {
    list: () => Promise<unknown[]>;
    get: (id: string) => Promise<unknown>;
  };
  submissions: {
    list: (campaignId: string) => Promise<unknown[]>;
  };
  analytics: {
    query: (metric: string, timeRange: string) => Promise<unknown>;
  };
  notifications: {
    send: (userId: string, message: string) => Promise<void>;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Hook Registry — Central registry for hook handler subscriptions
// ══════════════════════════════════════════════════════════════════════════════

export class HookRegistry {
  private registry: Map<HookName, HookRegistration[]> = new Map();

  /**
   * Register a plugin's handler for a specific hook with a priority.
   * Lower priority numbers execute first.
   */
  register(
    hookName: HookName,
    pluginId: string,
    handler: PluginHookHandler,
    priority: number = 100
  ): void {
    if (!VALID_HOOKS.has(hookName)) {
      throw new Error(
        `Invalid hook name "${hookName}". Valid hooks: ${[...VALID_HOOKS].join(", ")}`
      );
    }

    if (!this.registry.has(hookName)) {
      this.registry.set(hookName, []);
    }

    const entries = this.registry.get(hookName)!;

    // Prevent duplicate registration of the same plugin for the same hook
    const existingIdx = entries.findIndex((e) => e.pluginId === pluginId);
    if (existingIdx !== -1) {
      entries[existingIdx] = { pluginId, handler, priority };
    } else {
      entries.push({ pluginId, handler, priority });
    }

    // Sort ascending — lower priority number runs first
    entries.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute all handlers for a hook in priority order.
   * Data flows through the chain — each handler receives the (possibly modified)
   * output of the previous handler.
   */
  async trigger(
    hookName: HookName,
    data: Record<string, unknown>,
    activePluginIds: Set<string>,
    contextFactory: (pluginId: string) => PluginContext,
    sandbox: PluginSandbox
  ): Promise<{
    finalResult: HookResult;
    traces: ExecutionTrace[];
  }> {
    const entries = this.registry.get(hookName) ?? [];
    let currentData = { ...data };
    const allErrors: string[] = [];
    const traces: ExecutionTrace[] = [];
    let wasModified = false;

    for (const entry of entries) {
      // Skip inactive plugins
      if (!activePluginIds.has(entry.pluginId)) continue;

      const payload: HookPayload = {
        hookName,
        data: { ...currentData },
        timestamp: new Date().toISOString(),
      };

      const context = contextFactory(entry.pluginId);

      const { result, durationMs, timedOut, error } = await sandbox.execute(
        entry.handler,
        context,
        payload
      );

      traces.push({
        hookName,
        pluginId: entry.pluginId,
        startedAt: payload.timestamp,
        durationMs,
        result,
        error,
        timedOut,
      });

      if (error) {
        allErrors.push(`[${entry.pluginId}] ${error}`);
      }

      // Merge modified data into the chain
      if (result.modified && result.data) {
        currentData = { ...currentData, ...result.data };
        wasModified = true;
      }

      if (result.errors.length > 0) {
        allErrors.push(...result.errors.map((e) => `[${entry.pluginId}] ${e}`));
      }
    }

    return {
      finalResult: {
        modified: wasModified,
        data: currentData,
        errors: allErrors,
      },
      traces,
    };
  }

  /** Remove all hook registrations for a given plugin. */
  unregister(pluginId: string): void {
    for (const [hookName, entries] of this.registry.entries()) {
      const filtered = entries.filter((e) => e.pluginId !== pluginId);
      if (filtered.length === 0) {
        this.registry.delete(hookName);
      } else {
        this.registry.set(hookName, filtered);
      }
    }
  }

  /** Remove a specific hook registration for a plugin. */
  unregisterHook(hookName: HookName, pluginId: string): void {
    const entries = this.registry.get(hookName);
    if (!entries) return;

    const filtered = entries.filter((e) => e.pluginId !== pluginId);
    if (filtered.length === 0) {
      this.registry.delete(hookName);
    } else {
      this.registry.set(hookName, filtered);
    }
  }

  /** List all registered hooks and their subscriber plugins. */
  getRegistered(): Map<HookName, { pluginId: string; priority: number }[]> {
    const result = new Map<HookName, { pluginId: string; priority: number }[]>();
    for (const [hookName, entries] of this.registry.entries()) {
      result.set(
        hookName as HookName,
        entries.map((e) => ({ pluginId: e.pluginId, priority: e.priority }))
      );
    }
    return result;
  }

  /** Get all plugins registered for a specific hook. */
  getPluginsForHook(hookName: HookName): string[] {
    const entries = this.registry.get(hookName) ?? [];
    return entries.map((e) => e.pluginId);
  }

  /** Get all hooks a specific plugin is registered for. */
  getHooksForPlugin(pluginId: string): HookName[] {
    const hooks: HookName[] = [];
    for (const [hookName, entries] of this.registry.entries()) {
      if (entries.some((e) => e.pluginId === pluginId)) {
        hooks.push(hookName as HookName);
      }
    }
    return hooks;
  }

  /** Clear all registrations. */
  clear(): void {
    this.registry.clear();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Semver Utilities — Lightweight version comparison
// ══════════════════════════════════════════════════════════════════════════════

function parseSemver(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Check if `version` satisfies the requirement `required`.
 * Supports exact match and caret (^) ranges.
 */
function satisfiesVersion(version: string, required: string): boolean {
  const isCaret = required.startsWith("^");
  const reqStr = isCaret ? required.slice(1) : required;

  const ver = parseSemver(version);
  const req = parseSemver(reqStr);
  if (!ver || !req) return false;

  if (isCaret) {
    // ^1.2.3 means >=1.2.3 and <2.0.0
    if (req.major > 0) {
      return ver.major === req.major &&
        (ver.minor > req.minor || (ver.minor === req.minor && ver.patch >= req.patch));
    }
    // ^0.x means minor must match
    if (req.minor > 0) {
      return ver.major === 0 &&
        ver.minor === req.minor &&
        ver.patch >= req.patch;
    }
    // ^0.0.x means exact match
    return ver.major === 0 && ver.minor === 0 && ver.patch === req.patch;
  }

  // Exact match
  return ver.major === req.major && ver.minor === req.minor && ver.patch === req.patch;
}

// ══════════════════════════════════════════════════════════════════════════════
// Plugin Manager — Central orchestrator for the plugin lifecycle
// ══════════════════════════════════════════════════════════════════════════════

const PLATFORM_VERSION = "1.0.0";

export interface PluginManagerOptions {
  platformVersion?: string;
  sandboxOptions?: Partial<SandboxOptions>;
  dataProviders?: DataProviders;
  maxLogEntries?: number;
  maxTraceEntries?: number;
  storageQuotaPerPlugin?: number;
}

export class PluginManager {
  private plugins: Map<string, InstalledPlugin> = new Map();
  private storages: Map<string, PluginStorage> = new Map();
  private readonly hookRegistry: HookRegistry;
  private readonly sandbox: PluginSandbox;
  private readonly dataProviders: DataProviders;
  private readonly platformVersion: string;
  private readonly maxLogEntries: number;
  private readonly maxTraceEntries: number;
  private readonly storageQuotaPerPlugin: number;

  private logs: PluginLogEntry[] = [];
  private traces: ExecutionTrace[] = [];

  constructor(options: PluginManagerOptions = {}) {
    this.platformVersion = options.platformVersion ?? PLATFORM_VERSION;
    this.hookRegistry = new HookRegistry();
    this.sandbox = new PluginSandbox(options.sandboxOptions);
    this.maxLogEntries = options.maxLogEntries ?? 10000;
    this.maxTraceEntries = options.maxTraceEntries ?? 5000;
    this.storageQuotaPerPlugin = options.storageQuotaPerPlugin ?? DEFAULT_STORAGE_LIMIT_BYTES;

    // Default data providers return empty data — host application overrides these
    this.dataProviders = options.dataProviders ?? createNoopDataProviders();
  }

  // ── Installation ────────────────────────────────────────────────────────

  /**
   * Install a plugin from its manifest and hook handlers.
   * Validates permissions, hooks, dependencies, and platform version.
   */
  install(
    manifest: PluginManifest,
    handlers: Partial<Record<HookName, PluginHookHandler>>,
    priorities?: Partial<Record<HookName, number>>
  ): InstalledPlugin {
    // Validate: not already installed
    if (this.plugins.has(manifest.id)) {
      throw new PluginInstallError(manifest.id, "Plugin is already installed");
    }

    // Validate: permissions are recognized
    for (const perm of manifest.permissions) {
      if (!ALL_PERMISSIONS.has(perm)) {
        throw new PluginInstallError(manifest.id, `Unknown permission: "${perm}"`);
      }
    }

    // Validate: hooks are recognized
    for (const hookName of manifest.hooks) {
      if (!VALID_HOOKS.has(hookName)) {
        throw new PluginInstallError(manifest.id, `Unknown hook: "${hookName}"`);
      }
    }

    // Validate: declared hooks match provided handlers
    for (const hookName of Object.keys(handlers)) {
      if (!manifest.hooks.includes(hookName)) {
        throw new PluginInstallError(
          manifest.id,
          `Handler provided for hook "${hookName}" which is not declared in manifest.hooks`
        );
      }
    }

    // Validate: platform version
    if (!satisfiesVersion(this.platformVersion, manifest.minPlatformVersion)) {
      throw new PluginInstallError(
        manifest.id,
        `Requires platform version ${manifest.minPlatformVersion}, ` +
          `but current platform is ${this.platformVersion}`
      );
    }

    // Validate: dependencies are installed
    for (const dep of manifest.dependencies) {
      const depPlugin = this.plugins.get(dep.pluginId);
      if (!depPlugin) {
        throw new PluginInstallError(
          manifest.id,
          `Missing dependency: "${dep.pluginId}" (requires ${dep.version})`
        );
      }
      if (!satisfiesVersion(depPlugin.manifest.version, dep.version)) {
        throw new PluginInstallError(
          manifest.id,
          `Dependency "${dep.pluginId}" version ${depPlugin.manifest.version} ` +
            `does not satisfy required ${dep.version}`
        );
      }
    }

    // Build resolved config with defaults
    const resolvedConfig: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(manifest.config)) {
      resolvedConfig[key] = field.default;
    }

    const now = new Date().toISOString();
    const installed: InstalledPlugin = {
      manifest,
      status: "installed",
      config: resolvedConfig,
      handlers,
      installedAt: now,
      updatedAt: now,
    };

    this.plugins.set(manifest.id, installed);

    // Create isolated storage
    this.storages.set(manifest.id, new PluginStorage(manifest.id, this.storageQuotaPerPlugin));

    // Register hook handlers
    for (const [hookName, handler] of Object.entries(handlers)) {
      if (handler) {
        const priority = priorities?.[hookName as HookName] ?? 100;
        this.hookRegistry.register(hookName as HookName, manifest.id, handler, priority);
      }
    }

    this.addLog(manifest.id, "info", `Plugin "${manifest.name}" v${manifest.version} installed`);

    return installed;
  }

  /**
   * Uninstall a plugin. Removes all hook registrations, storage, and state.
   * Fails if other installed plugins depend on this one.
   */
  uninstall(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" is not installed`);
    }

    // Check for dependents
    const dependents = this.getDependents(pluginId);
    if (dependents.length > 0) {
      throw new Error(
        `Cannot uninstall "${pluginId}": the following plugins depend on it: ` +
          dependents.map((d) => d.manifest.id).join(", ")
      );
    }

    // Tear down
    this.hookRegistry.unregister(pluginId);
    this.storages.get(pluginId)?.clear();
    this.storages.delete(pluginId);
    this.plugins.delete(pluginId);

    this.addLog(pluginId, "info", `Plugin "${pluginId}" uninstalled`);
  }

  // ── Enable / Disable ──────────────────────────────────────────────────

  /**
   * Enable a plugin, transitioning it to "active" status.
   * Its hooks will begin executing on the next trigger.
   */
  enable(pluginId: string): void {
    const plugin = this.requirePlugin(pluginId);

    if (plugin.status === "active") return;

    // Check that dependencies are active
    for (const dep of plugin.manifest.dependencies) {
      const depPlugin = this.plugins.get(dep.pluginId);
      if (!depPlugin || depPlugin.status !== "active") {
        throw new Error(
          `Cannot enable "${pluginId}": dependency "${dep.pluginId}" is not active`
        );
      }
    }

    plugin.status = "active";
    plugin.updatedAt = new Date().toISOString();
    plugin.lastError = undefined;

    this.addLog(pluginId, "info", `Plugin "${pluginId}" enabled`);
  }

  /**
   * Disable a plugin. Its hooks will no longer execute.
   * Also disables any plugins that depend on it (cascade).
   */
  disable(pluginId: string): void {
    const plugin = this.requirePlugin(pluginId);

    if (plugin.status === "disabled") return;

    plugin.status = "disabled";
    plugin.updatedAt = new Date().toISOString();

    // Cascade disable dependents
    const dependents = this.getDependents(pluginId);
    for (const dep of dependents) {
      if (dep.status === "active") {
        this.addLog(
          dep.manifest.id,
          "warn",
          `Auto-disabled: dependency "${pluginId}" was disabled`
        );
        dep.status = "disabled";
        dep.updatedAt = new Date().toISOString();
      }
    }

    this.addLog(pluginId, "info", `Plugin "${pluginId}" disabled`);
  }

  // ── Configuration ─────────────────────────────────────────────────────

  /**
   * Update a plugin's configuration. Validates against the manifest schema.
   */
  configure(pluginId: string, newConfig: Record<string, unknown>): void {
    const plugin = this.requirePlugin(pluginId);

    for (const [key, value] of Object.entries(newConfig)) {
      const field = plugin.manifest.config[key];
      if (!field) {
        throw new Error(`Plugin "${pluginId}" does not have config key "${key}"`);
      }

      // Type check
      const actualType = typeof value;
      if (actualType !== field.type) {
        throw new Error(
          `Config "${key}" for plugin "${pluginId}" expects ${field.type}, got ${actualType}`
        );
      }

      plugin.config[key] = value;
    }

    plugin.updatedAt = new Date().toISOString();
    this.addLog(pluginId, "info", `Plugin "${pluginId}" configuration updated`);
  }

  // ── Discovery ─────────────────────────────────────────────────────────

  /** List all installed plugins. */
  getInstalled(): InstalledPlugin[] {
    return [...this.plugins.values()];
  }

  /** Get a single installed plugin by ID. */
  getPlugin(pluginId: string): InstalledPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /** Get all active plugin IDs. */
  getActivePluginIds(): Set<string> {
    const active = new Set<string>();
    for (const [id, plugin] of this.plugins.entries()) {
      if (plugin.status === "active") {
        active.add(id);
      }
    }
    return active;
  }

  /** Get plugins that depend on the given plugin. */
  getDependents(pluginId: string): InstalledPlugin[] {
    const dependents: InstalledPlugin[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.manifest.dependencies.some((d) => d.pluginId === pluginId)) {
        dependents.push(plugin);
      }
    }
    return dependents;
  }

  // ── Dependency Resolution ─────────────────────────────────────────────

  /**
   * Resolve the correct load/enable order for all installed plugins
   * using topological sort. Detects circular dependencies.
   */
  resolveLoadOrder(): string[] {
    const graph = new Map<string, string[]>(); // pluginId -> dependencies
    const allIds = new Set<string>();

    for (const [id, plugin] of this.plugins.entries()) {
      allIds.add(id);
      graph.set(
        id,
        plugin.manifest.dependencies
          .map((d) => d.pluginId)
          .filter((depId) => allIds.has(depId))
      );
    }

    // Kahn's algorithm for topological sort
    const inDegree = new Map<string, number>();
    for (const id of allIds) {
      inDegree.set(id, 0);
    }
    for (const deps of graph.values()) {
      for (const dep of deps) {
        inDegree.set(dep, (inDegree.get(dep) ?? 0) + 1);
      }
    }

    // Wait — in plugin dependencies, if A depends on B, B must load first.
    // So the edges should be: B -> A (B must come before A).
    // Let's rebuild with correct direction.
    const reverseGraph = new Map<string, string[]>();
    const revisedInDegree = new Map<string, number>();

    for (const id of allIds) {
      reverseGraph.set(id, []);
      revisedInDegree.set(id, 0);
    }

    for (const [id, plugin] of this.plugins.entries()) {
      for (const dep of plugin.manifest.dependencies) {
        if (allIds.has(dep.pluginId)) {
          reverseGraph.get(dep.pluginId)!.push(id);
          revisedInDegree.set(id, (revisedInDegree.get(id) ?? 0) + 1);
        }
      }
    }

    const queue: string[] = [];
    for (const [id, degree] of revisedInDegree.entries()) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);

      for (const dependent of reverseGraph.get(current) ?? []) {
        const newDegree = (revisedInDegree.get(dependent) ?? 1) - 1;
        revisedInDegree.set(dependent, newDegree);
        if (newDegree === 0) {
          queue.push(dependent);
        }
      }
    }

    if (sorted.length !== allIds.size) {
      const missing = [...allIds].filter((id) => !sorted.includes(id));
      throw new Error(
        `Circular dependency detected among plugins: ${missing.join(", ")}`
      );
    }

    return sorted;
  }

  // ── Hook Execution ────────────────────────────────────────────────────

  /**
   * Trigger a hook through all active plugins in priority order.
   * Returns the final merged data and execution traces.
   */
  async executeHook(
    hookName: HookName,
    data: Record<string, unknown>
  ): Promise<{
    result: HookResult;
    traces: ExecutionTrace[];
  }> {
    const activeIds = this.getActivePluginIds();

    const contextFactory = (pluginId: string): PluginContext => {
      const plugin = this.plugins.get(pluginId)!;
      const storage = this.storages.get(pluginId)!;
      return this.sandbox.createContext(plugin, storage, (entry) => this.pushLog(entry), this.dataProviders);
    };

    const { finalResult, traces } = await this.hookRegistry.trigger(
      hookName,
      data,
      activeIds,
      contextFactory,
      this.sandbox
    );

    // Store traces
    for (const trace of traces) {
      this.pushTrace(trace);

      // If a plugin timed out or errored, mark it
      if (trace.error) {
        const plugin = this.plugins.get(trace.pluginId);
        if (plugin) {
          plugin.lastError = trace.error;
          if (trace.timedOut) {
            plugin.status = "error";
            this.addLog(
              trace.pluginId,
              "error",
              `Plugin moved to error state: ${trace.error}`
            );
          }
        }
      }
    }

    return { result: finalResult, traces };
  }

  // ── Health Checks ─────────────────────────────────────────────────────

  /**
   * Run a health check on a specific plugin.
   * Verifies that the plugin can execute a no-op without errors or timeouts.
   */
  async healthCheck(pluginId: string): Promise<{
    healthy: boolean;
    durationMs: number;
    error?: string;
  }> {
    const plugin = this.requirePlugin(pluginId);
    const storage = this.storages.get(pluginId)!;

    const context = this.sandbox.createContext(
      plugin,
      storage,
      (entry) => this.pushLog(entry),
      this.dataProviders
    );

    const noopPayload: HookPayload = {
      hookName: "campaign:after_create", // arbitrary — just for health check
      data: { _healthCheck: true },
      timestamp: new Date().toISOString(),
    };

    // Pick the first handler or use a simple passthrough
    const handlerEntries = Object.values(plugin.handlers);
    const handler: PluginHookHandler = handlerEntries[0] ?? (async () => ({
      modified: false,
      data: {},
      errors: [],
    }));

    const { durationMs, error } = await this.sandbox.execute(handler, context, noopPayload);

    if (!error) {
      plugin.healthCheckPassedAt = new Date().toISOString();
    }

    return {
      healthy: !error,
      durationMs,
      error,
    };
  }

  /**
   * Run health checks on all active plugins.
   */
  async healthCheckAll(): Promise<Map<string, { healthy: boolean; durationMs: number; error?: string }>> {
    const results = new Map<string, { healthy: boolean; durationMs: number; error?: string }>();

    for (const [id, plugin] of this.plugins.entries()) {
      if (plugin.status === "active") {
        const result = await this.healthCheck(id);
        results.set(id, result);
      }
    }

    return results;
  }

  // ── Logging & Tracing ─────────────────────────────────────────────────

  /** Get plugin logs, optionally filtered. */
  getLogs(filter?: {
    pluginId?: string;
    level?: PluginLogEntry["level"];
    limit?: number;
  }): PluginLogEntry[] {
    let filtered = [...this.logs];
    if (filter?.pluginId) {
      filtered = filtered.filter((l) => l.pluginId === filter.pluginId);
    }
    if (filter?.level) {
      filtered = filtered.filter((l) => l.level === filter.level);
    }
    const limit = filter?.limit ?? 100;
    return filtered.slice(-limit);
  }

  /** Get execution traces, optionally filtered. */
  getTraces(filter?: {
    pluginId?: string;
    hookName?: HookName;
    limit?: number;
  }): ExecutionTrace[] {
    let filtered = [...this.traces];
    if (filter?.pluginId) {
      filtered = filtered.filter((t) => t.pluginId === filter.pluginId);
    }
    if (filter?.hookName) {
      filtered = filtered.filter((t) => t.hookName === filter.hookName);
    }
    const limit = filter?.limit ?? 100;
    return filtered.slice(-limit);
  }

  /** Get the underlying hook registry for advanced introspection. */
  getHookRegistry(): HookRegistry {
    return this.hookRegistry;
  }

  /** Get the sandbox instance for advanced configuration. */
  getSandbox(): PluginSandbox {
    return this.sandbox;
  }

  /** Get storage instance for a plugin. */
  getStorage(pluginId: string): PluginStorage | undefined {
    return this.storages.get(pluginId);
  }

  /** Clear all plugins, hooks, storage, logs, and traces. Primarily for testing. */
  clear(): void {
    this.plugins.clear();
    this.hookRegistry.clear();
    for (const storage of this.storages.values()) {
      storage.clear();
    }
    this.storages.clear();
    this.logs = [];
    this.traces = [];
    this.sandbox.resetMemoryTracking();
  }

  // ── Internal ──────────────────────────────────────────────────────────

  private requirePlugin(pluginId: string): InstalledPlugin {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" is not installed`);
    }
    return plugin;
  }

  private addLog(pluginId: string, level: PluginLogEntry["level"], message: string): void {
    this.pushLog({
      timestamp: new Date().toISOString(),
      pluginId,
      level,
      message,
    });
  }

  private pushLog(entry: PluginLogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(Math.floor(this.maxLogEntries * 0.2));
    }
  }

  private pushTrace(trace: ExecutionTrace): void {
    this.traces.push(trace);
    if (this.traces.length > this.maxTraceEntries) {
      this.traces = this.traces.slice(Math.floor(this.maxTraceEntries * 0.2));
    }
  }
}

// ─── Plugin Install Error ───────────────────────────────────────────────────

export class PluginInstallError extends Error {
  constructor(
    public readonly pluginId: string,
    public readonly reason: string
  ) {
    super(`Failed to install plugin "${pluginId}": ${reason}`);
    this.name = "PluginInstallError";
  }
}

// ─── No-op Data Providers ───────────────────────────────────────────────────

function createNoopDataProviders(): DataProviders {
  return {
    campaigns: {
      list: async () => [],
      get: async () => null,
    },
    submissions: {
      list: async () => [],
    },
    analytics: {
      query: async () => null,
    },
    notifications: {
      send: async () => {},
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Built-in Plugins
// ══════════════════════════════════════════════════════════════════════════════

// ─── 1. FTC Compliance Plugin ───────────────────────────────────────────────
//
// Auto-checks FTC compliance on submissions. Ensures all campaign submissions
// include proper disclosures. Runs on submission:before_create and
// submission:before_review hooks.

const FTC_REQUIRED_DISCLOSURES: Record<string, string[]> = {
  instagram: ["#ad", "#sponsored"],
  tiktok: ["#ad", "#sponsored"],
  youtube: ["Includes paid promotion"],
  twitter: ["#ad", "#sponsored"],
  facebook: ["#ad", "#sponsored"],
  linkedin: ["#ad", "#sponsored"],
  pinterest: ["#ad"],
  snapchat: ["#ad"],
  reddit: ["Disclosure: received perk"],
  google_reviews: ["Disclosure: received a perk in exchange for this review"],
  yelp: ["Disclosure: received a perk in exchange for this review"],
  tripadvisor: ["Disclosure: received a perk in exchange for this review"],
  nextdoor: ["Disclosure: received a perk in exchange for this recommendation"],
  threads: ["#ad", "#sponsored"],
};

const FTC_COMPLIANCE_MANIFEST: PluginManifest = {
  id: "ftc-compliance",
  name: "FTC Compliance Checker",
  version: "1.0.0",
  author: "Social Perks",
  description:
    "Automatically checks all campaign submissions for FTC compliance. " +
    "Ensures required disclosures (#ad, #sponsored, etc.) are present based on " +
    "the platform. Injects missing disclosures and flags non-compliant submissions. " +
    "This plugin should always remain active — FTC compliance is mandatory.",
  permissions: [
    "campaigns:read",
    "submissions:read",
    "submissions:write",
    "storage:read",
    "storage:write",
  ],
  hooks: [
    "submission:before_create",
    "submission:before_review",
    "campaign:before_launch",
  ],
  config: {
    strictMode: {
      type: "boolean",
      default: true,
      description: "When true, block non-compliant submissions instead of just flagging them",
      required: false,
    },
    autoInjectDisclosures: {
      type: "boolean",
      default: true,
      description: "Automatically add missing disclosures to submission data",
      required: false,
    },
    customDisclosureText: {
      type: "string",
      default: "",
      description: "Additional disclosure text to require on all submissions",
      required: false,
    },
  },
  dependencies: [],
  minPlatformVersion: "^1.0.0",
};

function createFTCComplianceHandlers(): Partial<Record<HookName, PluginHookHandler>> {
  const checkCompliance: PluginHookHandler = async (
    context: PluginContext,
    payload: HookPayload
  ): Promise<HookResult> => {
    const { data } = payload;
    const errors: string[] = [];

    const platform = (data.platform as string) ?? "";
    const content = (data.content as string) ?? "";
    const existingDisclosures = ((data.disclosures as string[]) ?? []).map((d) =>
      d.toLowerCase().trim()
    );

    // Determine required disclosures for this platform
    const requiredDisclosures = FTC_REQUIRED_DISCLOSURES[platform.toLowerCase()] ?? [];
    const missingDisclosures: string[] = [];

    for (const required of requiredDisclosures) {
      const requiredLower = required.toLowerCase();
      const hasInDisclosures = existingDisclosures.some((d) => d.includes(requiredLower));
      const hasInContent = content.toLowerCase().includes(requiredLower);

      if (!hasInDisclosures && !hasInContent) {
        missingDisclosures.push(required);
      }
    }

    // Check for review-type submissions that need explicit review disclosure
    const submissionType = (data.type as string) ?? "";
    if (submissionType === "review" || submissionType === "rating") {
      const reviewDisclosure = "Disclosure: received a perk in exchange for this review";
      if (
        !existingDisclosures.includes(reviewDisclosure.toLowerCase()) &&
        !content.toLowerCase().includes(reviewDisclosure.toLowerCase())
      ) {
        missingDisclosures.push(reviewDisclosure);
      }
    }

    const strictMode = context.config.strictMode as boolean;
    const autoInject = context.config.autoInjectDisclosures as boolean;

    if (missingDisclosures.length > 0) {
      const message = `Missing FTC disclosures for ${platform}: ${missingDisclosures.join(", ")}`;
      context.logger.warn(message);

      if (strictMode && !autoInject) {
        errors.push(message);
      }
    }

    // Build updated data
    const updatedData: Record<string, unknown> = {
      _ftcChecked: true,
      _ftcCheckedAt: new Date().toISOString(),
      _ftcPlatform: platform,
    };

    if (missingDisclosures.length > 0 && autoInject) {
      const allDisclosures = [
        ...((data.disclosures as string[]) ?? []),
        ...missingDisclosures,
      ];
      updatedData.disclosures = allDisclosures;
      updatedData._ftcAutoInjected = missingDisclosures;
      context.logger.info(
        `Auto-injected ${missingDisclosures.length} disclosure(s) for ${platform}`
      );
    }

    if (missingDisclosures.length > 0) {
      updatedData._ftcMissingDisclosures = missingDisclosures;
      updatedData._ftcCompliant = false;
    } else {
      updatedData._ftcCompliant = true;
    }

    // Track compliance stats in plugin storage
    try {
      const statsKey = `compliance_stats_${platform}`;
      const existing = (await context.storage.get<{
        checked: number;
        compliant: number;
        autoInjected: number;
      }>(statsKey)) ?? { checked: 0, compliant: 0, autoInjected: 0 };

      await context.storage.set(statsKey, {
        checked: existing.checked + 1,
        compliant: existing.compliant + (missingDisclosures.length === 0 ? 1 : 0),
        autoInjected:
          existing.autoInjected + (autoInject ? missingDisclosures.length : 0),
      });
    } catch (storageErr) {
      // Non-critical — log and continue
      context.logger.warn(
        `Failed to update compliance stats: ${storageErr instanceof Error ? storageErr.message : String(storageErr)}`
      );
    }

    return {
      modified: missingDisclosures.length > 0 && autoInject,
      data: updatedData,
      errors,
    };
  };

  const checkCampaignLaunch: PluginHookHandler = async (
    context: PluginContext,
    payload: HookPayload
  ): Promise<HookResult> => {
    const { data } = payload;
    const errors: string[] = [];

    const name = (data.name as string) ?? "";
    const description = (data.description as string) ?? "";
    const guidelines = (data.guidelines as string) ?? "";
    const actions = (data.actions as string[]) ?? [];

    // Campaign must have a name
    if (!name.trim()) {
      errors.push("Campaign must have a name before launch");
    }

    // Campaign must have a description
    if (!description.trim()) {
      errors.push("Campaign must have a description before launch");
    }

    // If there are actions on platforms that require disclosures,
    // verify guidelines mention disclosure requirements
    const platformsInvolved = new Set<string>();
    for (const actionId of actions) {
      const platformId = actionId.split("_")[0];
      if (platformId) platformsInvolved.add(platformId);
    }

    const needsDisclosure = [...platformsInvolved].some(
      (pid) => FTC_REQUIRED_DISCLOSURES[pid]?.length ?? 0 > 0
    );

    if (needsDisclosure && guidelines.length > 0) {
      const guidelinesLower = guidelines.toLowerCase();
      if (
        !guidelinesLower.includes("disclose") &&
        !guidelinesLower.includes("#ad") &&
        !guidelinesLower.includes("ftc") &&
        !guidelinesLower.includes("sponsored")
      ) {
        const updatedGuidelines =
          guidelines +
          "\n\nFTC REQUIRED: All posts must include appropriate disclosure " +
          "(#ad, #sponsored) per FTC guidelines.";

        context.logger.info("Auto-appended FTC disclosure requirement to campaign guidelines");

        return {
          modified: true,
          data: {
            guidelines: updatedGuidelines,
            _ftcGuidelinesUpdated: true,
          },
          errors,
        };
      }
    }

    return {
      modified: false,
      data: { _ftcCampaignChecked: true },
      errors,
    };
  };

  return {
    "submission:before_create": checkCompliance,
    "submission:before_review": checkCompliance,
    "campaign:before_launch": checkCampaignLaunch,
  };
}

// ─── 2. Slack Notification Plugin ───────────────────────────────────────────
//
// Sends Slack notifications on campaign events. Demonstrates webhook
// integration and multi-hook subscription.

const SLACK_NOTIFICATION_MANIFEST: PluginManifest = {
  id: "slack-notifications",
  name: "Slack Notifications",
  version: "1.0.0",
  author: "Social Perks",
  description:
    "Sends real-time Slack notifications when key campaign events occur. " +
    "Notifies on campaign launches, new submissions, submission reviews, " +
    "and perk redemptions. Configurable webhook URL and channel.",
  permissions: [
    "campaigns:read",
    "submissions:read",
    "notifications:send",
    "webhooks:register",
    "storage:read",
    "storage:write",
  ],
  hooks: [
    "campaign:after_create",
    "campaign:after_launch",
    "submission:after_create",
    "submission:after_review",
    "perk:after_redeem",
  ],
  config: {
    webhookUrl: {
      type: "string",
      default: "",
      description: "Slack Incoming Webhook URL",
      required: true,
    },
    channel: {
      type: "string",
      default: "#social-perks",
      description: "Slack channel to post notifications to",
      required: false,
    },
    notifyOnCreate: {
      type: "boolean",
      default: true,
      description: "Send notification when a campaign is created",
      required: false,
    },
    notifyOnLaunch: {
      type: "boolean",
      default: true,
      description: "Send notification when a campaign is launched",
      required: false,
    },
    notifyOnSubmission: {
      type: "boolean",
      default: true,
      description: "Send notification when a new submission arrives",
      required: false,
    },
    notifyOnReview: {
      type: "boolean",
      default: true,
      description: "Send notification when a submission is reviewed",
      required: false,
    },
    notifyOnRedeem: {
      type: "boolean",
      default: false,
      description: "Send notification when a perk is redeemed",
      required: false,
    },
    mentionUsers: {
      type: "boolean",
      default: false,
      description: "Include @channel mention for high-priority events",
      required: false,
    },
  },
  dependencies: [],
  minPlatformVersion: "^1.0.0",
};

interface SlackMessage {
  channel: string;
  text: string;
  emoji: string;
  priority: "low" | "normal" | "high";
}

function createSlackNotificationHandlers(): Partial<Record<HookName, PluginHookHandler>> {
  /**
   * Queue a Slack message. In a real deployment this would POST to the
   * webhook URL; here we log it and store in plugin storage for inspection.
   */
  const queueSlackMessage = async (
    context: PluginContext,
    message: SlackMessage
  ): Promise<void> => {
    const webhookUrl = context.config.webhookUrl as string;
    const mentionUsers = context.config.mentionUsers as boolean;

    const fullText = mentionUsers && message.priority === "high"
      ? `<!channel> ${message.emoji} ${message.text}`
      : `${message.emoji} ${message.text}`;

    // In production: POST to webhookUrl
    // For now, log and store
    context.logger.info(`Slack [${message.channel}]: ${fullText}`);

    if (webhookUrl) {
      context.logger.debug(`Would POST to ${webhookUrl}`, {
        channel: message.channel,
        text: fullText,
      });
    }

    // Store message history for auditability
    try {
      const historyKey = "message_history";
      const history = (await context.storage.get<SlackMessage[]>(historyKey)) ?? [];
      history.push(message);
      // Keep last 100 messages
      const trimmed = history.slice(-100);
      await context.storage.set(historyKey, trimmed);

      // Update send count
      const countKey = "total_sent";
      const count = (await context.storage.get<number>(countKey)) ?? 0;
      await context.storage.set(countKey, count + 1);
    } catch (storageErr) {
      context.logger.warn(
        `Failed to store message history: ${storageErr instanceof Error ? storageErr.message : String(storageErr)}`
      );
    }
  };

  const makePassthroughResult = (): HookResult => ({
    modified: false,
    data: {},
    errors: [],
  });

  const onCampaignCreated: PluginHookHandler = async (context, payload) => {
    if (!(context.config.notifyOnCreate as boolean)) return makePassthroughResult();

    const channel = context.config.channel as string;
    const name = (payload.data.name as string) ?? "Unnamed campaign";
    const businessName = (payload.data.businessName as string) ?? "Unknown business";

    await queueSlackMessage(context, {
      channel,
      text: `New campaign created: *${name}* by ${businessName}`,
      emoji: ":sparkles:",
      priority: "normal",
    });

    return makePassthroughResult();
  };

  const onCampaignLaunched: PluginHookHandler = async (context, payload) => {
    if (!(context.config.notifyOnLaunch as boolean)) return makePassthroughResult();

    const channel = context.config.channel as string;
    const name = (payload.data.name as string) ?? "Unnamed campaign";
    const businessName = (payload.data.businessName as string) ?? "Unknown business";
    const budget = (payload.data.budget as number) ?? 0;

    await queueSlackMessage(context, {
      channel,
      text: `Campaign launched: *${name}* by ${businessName} (budget: $${budget.toLocaleString()})`,
      emoji: ":rocket:",
      priority: "high",
    });

    return makePassthroughResult();
  };

  const onSubmissionCreated: PluginHookHandler = async (context, payload) => {
    if (!(context.config.notifyOnSubmission as boolean)) return makePassthroughResult();

    const channel = context.config.channel as string;
    const campaignName = (payload.data.campaignName as string) ?? "Unknown campaign";
    const creatorName = (payload.data.creatorName as string) ?? "Unknown creator";
    const platform = (payload.data.platform as string) ?? "Unknown platform";

    await queueSlackMessage(context, {
      channel,
      text: `New submission on *${campaignName}* from ${creatorName} (${platform})`,
      emoji: ":inbox_tray:",
      priority: "normal",
    });

    return makePassthroughResult();
  };

  const onSubmissionReviewed: PluginHookHandler = async (context, payload) => {
    if (!(context.config.notifyOnReview as boolean)) return makePassthroughResult();

    const channel = context.config.channel as string;
    const campaignName = (payload.data.campaignName as string) ?? "Unknown campaign";
    const creatorName = (payload.data.creatorName as string) ?? "Unknown creator";
    const status = (payload.data.reviewStatus as string) ?? "unknown";
    const emoji = status === "approved" ? ":white_check_mark:" : ":x:";

    await queueSlackMessage(context, {
      channel,
      text: `Submission ${status}: *${campaignName}* by ${creatorName}`,
      emoji,
      priority: status === "rejected" ? "high" : "normal",
    });

    return makePassthroughResult();
  };

  const onPerkRedeemed: PluginHookHandler = async (context, payload) => {
    if (!(context.config.notifyOnRedeem as boolean)) return makePassthroughResult();

    const channel = context.config.channel as string;
    const perkName = (payload.data.perkName as string) ?? "Unknown perk";
    const userName = (payload.data.userName as string) ?? "Unknown user";
    const value = (payload.data.value as number) ?? 0;

    await queueSlackMessage(context, {
      channel,
      text: `Perk redeemed: ${userName} used *${perkName}* ($${value.toFixed(2)})`,
      emoji: ":gift:",
      priority: "low",
    });

    return makePassthroughResult();
  };

  return {
    "campaign:after_create": onCampaignCreated,
    "campaign:after_launch": onCampaignLaunched,
    "submission:after_create": onSubmissionCreated,
    "submission:after_review": onSubmissionReviewed,
    "perk:after_redeem": onPerkRedeemed,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Factory Functions — Create and register built-in plugins
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new PluginManager and register the built-in plugins.
 * Returns the manager ready for use.
 */
export function createPluginManager(
  options: PluginManagerOptions = {}
): PluginManager {
  const manager = new PluginManager(options);

  // Install FTC Compliance plugin (priority 10 — runs first)
  manager.install(FTC_COMPLIANCE_MANIFEST, createFTCComplianceHandlers(), {
    "submission:before_create": 10,
    "submission:before_review": 10,
    "campaign:before_launch": 10,
  });
  manager.enable("ftc-compliance");

  // Install Slack Notifications plugin (priority 900 — runs late, after business logic)
  manager.install(SLACK_NOTIFICATION_MANIFEST, createSlackNotificationHandlers(), {
    "campaign:after_create": 900,
    "campaign:after_launch": 900,
    "submission:after_create": 900,
    "submission:after_review": 900,
    "perk:after_redeem": 900,
  });
  manager.enable("slack-notifications");

  return manager;
}

/**
 * Get the FTC Compliance plugin manifest (useful for external registration).
 */
export function getFTCComplianceManifest(): PluginManifest {
  return { ...FTC_COMPLIANCE_MANIFEST };
}

/**
 * Get the FTC Compliance plugin handlers.
 */
export function getFTCComplianceHandlers(): Partial<Record<HookName, PluginHookHandler>> {
  return createFTCComplianceHandlers();
}

/**
 * Get the Slack Notification plugin manifest (useful for external registration).
 */
export function getSlackNotificationManifest(): PluginManifest {
  return { ...SLACK_NOTIFICATION_MANIFEST };
}

/**
 * Get the Slack Notification plugin handlers.
 */
export function getSlackNotificationHandlers(): Partial<Record<HookName, PluginHookHandler>> {
  return createSlackNotificationHandlers();
}

// ── Default singleton instance ──────────────────────────────────────────────

export const pluginRuntime = createPluginManager();
