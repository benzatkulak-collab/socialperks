// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Plugin Types & Permissions
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

export const ALL_PERMISSIONS: ReadonlySet<PluginPermission> = new Set<PluginPermission>([
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

export const VALID_HOOKS: ReadonlySet<string> = new Set<HookName>([
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

export interface HookRegistration {
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

// ─── Plugin Storage Interface ───────────────────────────────────────────────

export interface PluginStorageInterface {
  get: <T = unknown>(key: string) => Promise<T | undefined>;
  set: <T = unknown>(key: string, value: T) => Promise<void>;
  delete: (key: string) => Promise<boolean>;
  has: (key: string) => Promise<boolean>;
  list: () => Promise<string[]>;
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
