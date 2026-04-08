// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Plugin / Extension Runtime
// Production-grade plugin system with sandboxed execution, hook chaining,
// isolated storage, dependency resolution, and built-in plugins.
//
// Barrel file — re-exports from focused sub-modules:
//   types.ts           — Permissions, hooks, manifest, context, payload types
//   storage.ts         — Per-plugin isolated key-value store
//   sandbox.ts         — Restricted execution environment with timeout/memory
//   hook-registry.ts   — Central registry for hook handler subscriptions
//   manager.ts         — Plugin lifecycle orchestrator (install/enable/disable)
//   built-in-plugins.ts — FTC Compliance & Slack Notification plugins
// ══════════════════════════════════════════════════════════════════════════════

// ─── Types & Constants ─────────────────────────────────────────────────────

export type {
  PluginPermission,
  HookName,
  PluginConfigField,
  PluginDependency,
  PluginManifest,
  PluginStatus,
  HookPayload,
  HookResult,
  SandboxedApi,
  PluginLogger,
  PluginContext,
  PluginHookHandler,
  InstalledPlugin,
  HookRegistration,
  PluginLogEntry,
  ExecutionTrace,
  PluginStorageInterface,
  DataProviders,
} from "./types";

export { ALL_PERMISSIONS, VALID_HOOKS } from "./types";

// ─── Storage ───────────────────────────────────────────────────────────────

export { PluginStorage, PluginStorageQuotaError, DEFAULT_STORAGE_LIMIT_BYTES } from "./storage";

// ─── Sandbox ───────────────────────────────────────────────────────────────

export type { SandboxOptions } from "./sandbox";
export { PluginSandbox, PluginTimeoutError, PluginPermissionError } from "./sandbox";

// ─── Hook Registry ─────────────────────────────────────────────────────────

export { HookRegistry } from "./hook-registry";

// ─── Plugin Manager ────────────────────────────────────────────────────────

export type { PluginManagerOptions } from "./manager";
export { PluginManager, PluginInstallError } from "./manager";

// ─── Built-in Plugins & Factory ────────────────────────────────────────────

export {
  createPluginManager,
  getFTCComplianceManifest,
  getFTCComplianceHandlers,
  getSlackNotificationManifest,
  getSlackNotificationHandlers,
} from "./built-in-plugins";

// ─── Default singleton instance ────────────────────────────────────────────

import { createPluginManager } from "./built-in-plugins";

export const pluginRuntime = createPluginManager();
