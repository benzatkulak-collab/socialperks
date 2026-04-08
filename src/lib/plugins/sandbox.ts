// ══════════════════════════════════════════════════════════════════════════════
// Plugin Sandbox — Restricted execution environment
// ══════════════════════════════════════════════════════════════════════════════

import type {
  DataProviders,
  HookPayload,
  HookResult,
  InstalledPlugin,
  PluginContext,
  PluginLogger,
  PluginLogEntry,
  PluginPermission,
  PluginStorageInterface,
  SandboxedApi,
  PluginHookHandler,
} from "./types";
import type { PluginStorage } from "./storage";

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
