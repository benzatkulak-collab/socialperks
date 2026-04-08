// ══════════════════════════════════════════════════════════════════════════════
// Plugin Manager — Central orchestrator for the plugin lifecycle
// ══════════════════════════════════════════════════════════════════════════════

import type {
  DataProviders,
  ExecutionTrace,
  HookName,
  HookPayload,
  HookResult,
  InstalledPlugin,
  PluginContext,
  PluginHookHandler,
  PluginLogEntry,
  PluginManifest,
} from "./types";
import { ALL_PERMISSIONS, VALID_HOOKS } from "./types";
import { PluginStorage, DEFAULT_STORAGE_LIMIT_BYTES } from "./storage";
import { PluginSandbox, type SandboxOptions } from "./sandbox";
import { HookRegistry } from "./hook-registry";
import { satisfiesVersion } from "./semver";

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

// ─── Manager ────────────────────────────────────────────────────────────────

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

  enable(pluginId: string): void {
    const plugin = this.requirePlugin(pluginId);

    if (plugin.status === "active") return;

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

  configure(pluginId: string, newConfig: Record<string, unknown>): void {
    const plugin = this.requirePlugin(pluginId);

    for (const [key, value] of Object.entries(newConfig)) {
      const field = plugin.manifest.config[key];
      if (!field) {
        throw new Error(`Plugin "${pluginId}" does not have config key "${key}"`);
      }

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

  getInstalled(): InstalledPlugin[] {
    return [...this.plugins.values()];
  }

  getPlugin(pluginId: string): InstalledPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  getActivePluginIds(): Set<string> {
    const active = new Set<string>();
    for (const [id, plugin] of this.plugins.entries()) {
      if (plugin.status === "active") {
        active.add(id);
      }
    }
    return active;
  }

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

  resolveLoadOrder(): string[] {
    const graph = new Map<string, string[]>();
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

    for (const trace of traces) {
      this.pushTrace(trace);

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
      hookName: "campaign:after_create",
      data: { _healthCheck: true },
      timestamp: new Date().toISOString(),
    };

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

  getHookRegistry(): HookRegistry {
    return this.hookRegistry;
  }

  getSandbox(): PluginSandbox {
    return this.sandbox;
  }

  getStorage(pluginId: string): PluginStorage | undefined {
    return this.storages.get(pluginId);
  }

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
