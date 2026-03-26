// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Plugin / Extension Architecture
// Future-proofing foundation for third-party extensibility
// ══════════════════════════════════════════════════════════════════════════════

// ─── Hook Definitions ───────────────────────────────────────────────────────

export type PluginHook =
  | "campaign.beforeCreate"
  | "campaign.afterCreate"
  | "campaign.beforeLaunch"
  | "campaign.afterLaunch"
  | "submission.beforeCreate"
  | "submission.afterCreate"
  | "submission.beforeApprove"
  | "submission.afterApprove"
  | "perk.beforeAward"
  | "perk.afterAward"
  | "perk.beforeRedeem"
  | "perk.afterRedeem"
  | "analytics.beforeQuery"
  | "analytics.afterQuery"
  | "auth.afterLogin"
  | "auth.afterSignup";

const VALID_HOOKS: ReadonlySet<string> = new Set<PluginHook>([
  "campaign.beforeCreate",
  "campaign.afterCreate",
  "campaign.beforeLaunch",
  "campaign.afterLaunch",
  "submission.beforeCreate",
  "submission.afterCreate",
  "submission.beforeApprove",
  "submission.afterApprove",
  "perk.beforeAward",
  "perk.afterAward",
  "perk.beforeRedeem",
  "perk.afterRedeem",
  "analytics.beforeQuery",
  "analytics.afterQuery",
  "auth.afterLogin",
  "auth.afterSignup",
]);

// ─── Plugin Interfaces ──────────────────────────────────────────────────────

export interface PluginContext {
  hook: PluginHook;
  data: Record<string, unknown>;
  metadata: {
    timestamp: string;
    actorId: string;
    actorType: string;
  };
}

export interface PluginResult {
  modified: boolean;
  data?: Record<string, unknown>;
  /** If true, the operation that triggered this hook is cancelled. */
  abort?: boolean;
  /** Human-readable reason for aborting. */
  abortReason?: string;
}

export type PluginHandler = (context: PluginContext) => Promise<PluginResult>;

export interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  hooks: Record<string, PluginHandler>;
  config?: Record<string, unknown>;
  enabled: boolean;
}

// ─── Hook Registration Entry ────────────────────────────────────────────────

interface HookEntry {
  pluginId: string;
  handler: PluginHandler;
  priority: number;
}

// ─── Plugin Execution Log ───────────────────────────────────────────────────

export interface PluginExecutionLog {
  hook: PluginHook;
  pluginId: string;
  timestamp: string;
  durationMs: number;
  result: PluginResult;
  error?: string;
}

// ─── Plugin Manager ─────────────────────────────────────────────────────────

class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private hookRegistry: Map<string, HookEntry[]> = new Map();
  private executionLog: PluginExecutionLog[] = [];
  private maxLogSize = 10000;

  // ── Registration ────────────────────────────────────────────────────────

  /**
   * Validate and register a plugin. Throws if the plugin ID is already
   * registered or if the plugin declares hooks that are not recognized.
   */
  register(plugin: Plugin, priorities?: Record<string, number>): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin "${plugin.id}" is already registered.`);
    }

    // Validate that every hook name the plugin declares is a known hook
    for (const hookName of Object.keys(plugin.hooks)) {
      if (!VALID_HOOKS.has(hookName)) {
        throw new Error(
          `Plugin "${plugin.id}" declares unknown hook "${hookName}". ` +
            `Valid hooks: ${[...VALID_HOOKS].join(", ")}`
        );
      }
    }

    this.plugins.set(plugin.id, { ...plugin });

    // Register each hook handler
    for (const [hookName, handler] of Object.entries(plugin.hooks)) {
      if (!this.hookRegistry.has(hookName)) {
        this.hookRegistry.set(hookName, []);
      }
      const entries = this.hookRegistry.get(hookName)!;
      const priority = priorities?.[hookName] ?? 100;
      entries.push({ pluginId: plugin.id, handler, priority });
      // Sort ascending so lower priority number runs first
      entries.sort((a, b) => a.priority - b.priority);
    }
  }

  /**
   * Remove a plugin and all of its hook registrations.
   */
  unregister(pluginId: string): void {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin "${pluginId}" is not registered.`);
    }

    this.plugins.delete(pluginId);

    // Remove from all hook registries
    for (const [hookName, entries] of this.hookRegistry.entries()) {
      const filtered = entries.filter((e) => e.pluginId !== pluginId);
      if (filtered.length === 0) {
        this.hookRegistry.delete(hookName);
      } else {
        this.hookRegistry.set(hookName, filtered);
      }
    }
  }

  // ── Enable / Disable ───────────────────────────────────────────────────

  /**
   * Enable a previously disabled plugin. Throws if the plugin is not found.
   */
  enable(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error(`Plugin "${pluginId}" is not registered.`);
    plugin.enabled = true;
  }

  /**
   * Disable a plugin without removing it. Disabled plugins are skipped
   * during hook execution.
   */
  disable(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error(`Plugin "${pluginId}" is not registered.`);
    plugin.enabled = false;
  }

  // ── Hook Execution ─────────────────────────────────────────────────────

  /**
   * Execute all registered handlers for a hook in priority order.
   *
   * Each handler receives the (possibly modified) data from the previous
   * handler in the chain. If any handler sets `abort: true`, execution
   * stops and the abort result is returned immediately.
   *
   * Returns the final (merged) data after all handlers have run, along
   * with metadata about whether the operation was aborted.
   */
  async executeHook(
    hook: PluginHook,
    data: Record<string, unknown>,
    metadata: { actorId: string; actorType: string }
  ): Promise<{
    data: Record<string, unknown>;
    aborted: boolean;
    abortReason?: string;
    pluginsExecuted: string[];
  }> {
    const entries = this.hookRegistry.get(hook) ?? [];
    let currentData = { ...data };
    const pluginsExecuted: string[] = [];

    for (const entry of entries) {
      const plugin = this.plugins.get(entry.pluginId);
      if (!plugin || !plugin.enabled) continue;

      const context: PluginContext = {
        hook,
        data: { ...currentData },
        metadata: {
          timestamp: new Date().toISOString(),
          actorId: metadata.actorId,
          actorType: metadata.actorType,
        },
      };

      const start = Date.now();
      let result: PluginResult;
      let error: string | undefined;

      try {
        result = await entry.handler(context);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        result = { modified: false, abort: false };
      }

      const durationMs = Date.now() - start;

      // Log the execution
      this.addLog({
        hook,
        pluginId: entry.pluginId,
        timestamp: new Date().toISOString(),
        durationMs,
        result,
        error,
      });

      pluginsExecuted.push(entry.pluginId);

      // Merge modified data back into the chain
      if (result.modified && result.data) {
        currentData = { ...currentData, ...result.data };
      }

      // Abort the operation if requested
      if (result.abort) {
        return {
          data: currentData,
          aborted: true,
          abortReason: result.abortReason ?? `Aborted by plugin "${entry.pluginId}"`,
          pluginsExecuted,
        };
      }
    }

    return {
      data: currentData,
      aborted: false,
      pluginsExecuted,
    };
  }

  // ── Discovery ──────────────────────────────────────────────────────────

  /** List all registered plugins. */
  getPlugins(): Plugin[] {
    return [...this.plugins.values()];
  }

  /** Get a single plugin by ID, or null if not found. */
  getPlugin(pluginId: string): Plugin | null {
    return this.plugins.get(pluginId) ?? null;
  }

  /** Get the list of hooks a plugin is registered for. */
  getHooksForPlugin(pluginId: string): string[] {
    const hooks: string[] = [];
    for (const [hookName, entries] of this.hookRegistry.entries()) {
      if (entries.some((e) => e.pluginId === pluginId)) {
        hooks.push(hookName);
      }
    }
    return hooks;
  }

  /** Get all plugins registered for a specific hook. */
  getPluginsForHook(hook: PluginHook): Plugin[] {
    const entries = this.hookRegistry.get(hook) ?? [];
    const plugins: Plugin[] = [];
    for (const entry of entries) {
      const plugin = this.plugins.get(entry.pluginId);
      if (plugin) plugins.push(plugin);
    }
    return plugins;
  }

  /** Get recent execution logs, optionally filtered by hook or plugin. */
  getExecutionLog(filter?: {
    hook?: PluginHook;
    pluginId?: string;
    limit?: number;
  }): PluginExecutionLog[] {
    let logs = [...this.executionLog];
    if (filter?.hook) logs = logs.filter((l) => l.hook === filter.hook);
    if (filter?.pluginId) logs = logs.filter((l) => l.pluginId === filter.pluginId);
    const limit = filter?.limit ?? 100;
    return logs.slice(-limit);
  }

  /** Clear all plugins and hook registrations. Primarily for testing. */
  clear(): void {
    this.plugins.clear();
    this.hookRegistry.clear();
    this.executionLog = [];
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private addLog(log: PluginExecutionLog): void {
    this.executionLog.push(log);
    if (this.executionLog.length > this.maxLogSize) {
      // Trim oldest 20% to avoid frequent trimming
      this.executionLog = this.executionLog.slice(
        Math.floor(this.maxLogSize * 0.2)
      );
    }
  }
}

// ── Singleton Export ────────────────────────────────────────────────────────

export const pluginManager = new PluginManager();

// ══════════════════════════════════════════════════════════════════════════════
// Built-in Plugins
// ══════════════════════════════════════════════════════════════════════════════

// ─── 1. FTC Compliance Plugin ───────────────────────────────────────────────
//
// Checks campaigns before launch to ensure FTC disclosure requirements are met.
// Adds required disclosures if missing, and can abort launches that violate rules.

const FTC_DISCLOSURES: Record<string, string[]> = {
  ig: ["#ad", "#sponsored"],
  tt: ["#ad", "#sponsored"],
  fb: ["#ad", "#sponsored"],
  xw: ["#ad", "#sponsored"],
  yt: ["Includes paid promotion"],
  li: ["#ad", "#sponsored"],
  pi: ["#ad"],
  th: ["#ad", "#sponsored"],
  sc: ["#ad"],
  rd: ["Disclosure: received perk"],
  go: ["Disclosure: received a perk in exchange for this review"],
  yp: ["Disclosure: received a perk in exchange for this review"],
  ta: ["Disclosure: received a perk in exchange for this review"],
  nd: ["Disclosure: received a perk in exchange for this recommendation"],
  rf: [],
};

const ftcCompliancePlugin: Plugin = {
  id: "ftc-compliance",
  name: "FTC Compliance Checker",
  version: "1.0.0",
  author: "Social Perks",
  description:
    "Ensures all campaigns include required FTC disclosures before launch. " +
    "Automatically injects disclosure requirements per platform and action type. " +
    "This plugin cannot be disabled — FTC compliance is mandatory.",
  enabled: true,
  config: {
    strictMode: true,
    autoInjectDisclosures: true,
  },
  hooks: {
    "campaign.beforeLaunch": async (
      context: PluginContext
    ): Promise<PluginResult> => {
      const { data } = context;
      const actions = (data.actions as string[]) ?? [];
      const existingDisclosures = ((data.ftcDisclosures as string[]) ?? []).map(
        (d) => d.toLowerCase()
      );

      // Determine which platforms are involved
      const platformIds = new Set<string>();
      for (const actionId of actions) {
        // Action IDs follow the pattern: platformId_actionCode (e.g., "ig_rl")
        const platformId = actionId.split("_")[0];
        if (platformId) platformIds.add(platformId);
      }

      // Collect required disclosures
      const requiredDisclosures = new Set<string>();
      for (const platformId of platformIds) {
        const disclosures = FTC_DISCLOSURES[platformId];
        if (disclosures) {
          for (const d of disclosures) requiredDisclosures.add(d);
        }
      }

      // Check which are missing
      const missingDisclosures: string[] = [];
      for (const required of requiredDisclosures) {
        if (!existingDisclosures.includes(required.toLowerCase())) {
          missingDisclosures.push(required);
        }
      }

      // Determine if any review actions lack review-specific disclosures
      const hasReviewActions = actions.some((a) => {
        const parts = a.split("_");
        return parts[1] === "rv" || parts[1] === "rd" || parts[1] === "rp" || parts[1] === "rc";
      });

      if (hasReviewActions) {
        const reviewDisclosure =
          "Disclosure: received a perk in exchange for this review";
        if (
          !existingDisclosures.includes(reviewDisclosure.toLowerCase()) &&
          !missingDisclosures.includes(reviewDisclosure)
        ) {
          missingDisclosures.push(reviewDisclosure);
        }
      }

      // Auto-inject missing disclosures
      const allDisclosures = [
        ...((data.ftcDisclosures as string[]) ?? []),
        ...missingDisclosures,
      ];

      // Campaign name / description checks
      const name = (data.name as string) ?? "";
      const description = (data.description as string) ?? "";
      const guidelines = (data.guidelines as string) ?? "";

      // If guidelines exist, ensure they mention disclosure
      const guidelinesNeedUpdate =
        guidelines.length > 0 &&
        !guidelines.toLowerCase().includes("disclose") &&
        !guidelines.toLowerCase().includes("#ad") &&
        !guidelines.toLowerCase().includes("ftc");

      let updatedGuidelines = guidelines;
      if (guidelinesNeedUpdate) {
        updatedGuidelines +=
          "\n\nFTC REQUIRED: All posts must include appropriate disclosure " +
          "(#ad #sponsored) per FTC guidelines. Reviews must state the perk received.";
      }

      // Abort if there is no campaign name (data integrity check)
      if (!name || name.trim().length === 0) {
        return {
          modified: false,
          abort: true,
          abortReason: "Campaign must have a name before launch.",
        };
      }

      // Abort if description is empty
      if (!description || description.trim().length === 0) {
        return {
          modified: false,
          abort: true,
          abortReason: "Campaign must have a description before launch.",
        };
      }

      return {
        modified: missingDisclosures.length > 0 || guidelinesNeedUpdate,
        data: {
          ftcDisclosures: allDisclosures,
          guidelines: updatedGuidelines,
          _ftcChecked: true,
          _ftcDisclosuresAdded: missingDisclosures,
        },
      };
    },
  },
};

// ─── 2. Fraud Detection Plugin ──────────────────────────────────────────────
//
// Examines submissions before approval for common fraud signals:
// - Suspiciously fast submission times
// - Duplicate proof URLs
// - Submissions from the same user within too-short windows
// - Stock photo / generic URL detection

const FRAUD_SUSPICIOUS_DOMAINS = [
  "stock",
  "placeholder",
  "example.com",
  "test.com",
  "lorem",
  "picsum",
  "via.placeholder",
];

const fraudDetectionPlugin: Plugin = {
  id: "fraud-detection",
  name: "Fraud Detection Engine",
  version: "1.0.0",
  author: "Social Perks",
  description:
    "Analyzes campaign submissions for fraud signals before approval. " +
    "Checks for duplicate proofs, suspicious timing, stock imagery, and " +
    "known fraud patterns. Flags or blocks suspicious submissions.",
  enabled: true,
  config: {
    maxRiskScore: 70, // Abort if risk score exceeds this
    minSubmissionAgeSeconds: 30, // Submissions faster than this are suspicious
    maxDailySubmissionsPerUser: 20,
  },
  hooks: {
    "submission.beforeApprove": async (
      context: PluginContext
    ): Promise<PluginResult> => {
      const { data } = context;
      const proofUrl = (data.proofUrl as string) ?? "";
      const submittedAt = (data.submittedAt as string) ?? "";
      const userId = (data.userId as string) ?? "";
      const campaignId = (data.campaignId as string) ?? "";

      let riskScore = 0;
      const riskFlags: string[] = [];

      // Check 1: Suspicious proof URL domains
      const urlLower = proofUrl.toLowerCase();
      for (const domain of FRAUD_SUSPICIOUS_DOMAINS) {
        if (urlLower.includes(domain)) {
          riskScore += 40;
          riskFlags.push(`Proof URL contains suspicious domain: "${domain}"`);
          break;
        }
      }

      // Check 2: Empty or malformed proof URL
      if (!proofUrl || proofUrl.trim().length === 0) {
        riskScore += 50;
        riskFlags.push("Proof URL is empty");
      } else if (!proofUrl.startsWith("http://") && !proofUrl.startsWith("https://")) {
        riskScore += 20;
        riskFlags.push("Proof URL does not use HTTP(S) protocol");
      }

      // Check 3: Suspiciously fast submission
      if (submittedAt) {
        const submissionTime = new Date(submittedAt).getTime();
        const now = Date.now();
        const ageSeconds = (now - submissionTime) / 1000;
        // If the submission was created in the future or is extremely recent
        if (ageSeconds < 0) {
          riskScore += 30;
          riskFlags.push("Submission timestamp is in the future");
        }
      }

      // Check 4: Missing required fields
      if (!userId) {
        riskScore += 30;
        riskFlags.push("Missing user ID");
      }
      if (!campaignId) {
        riskScore += 30;
        riskFlags.push("Missing campaign ID");
      }

      // Check 5: Proof URL suspiciously short (likely not a real screenshot/post)
      if (proofUrl.length > 0 && proofUrl.length < 15) {
        riskScore += 15;
        riskFlags.push("Proof URL is suspiciously short");
      }

      // Check 6: Duplicate proof URL detection via data hint
      const knownProofUrls = (data._knownProofUrls as string[]) ?? [];
      if (proofUrl && knownProofUrls.includes(proofUrl)) {
        riskScore += 60;
        riskFlags.push("Duplicate proof URL — this exact URL was already submitted");
      }

      // Cap at 100
      riskScore = Math.min(100, riskScore);

      const maxAllowed = 70;
      const shouldAbort = riskScore >= maxAllowed;

      return {
        modified: true,
        data: {
          _fraudCheck: {
            riskScore,
            riskFlags,
            checkedAt: new Date().toISOString(),
            passed: !shouldAbort,
          },
        },
        abort: shouldAbort,
        abortReason: shouldAbort
          ? `Submission flagged for fraud (risk score: ${riskScore}/100). Flags: ${riskFlags.join("; ")}`
          : undefined,
      };
    },
  },
};

// ─── 3. Analytics Tracker Plugin ────────────────────────────────────────────
//
// Logs events for all "after" hooks to build an analytics trail.
// In production this would push to an analytics pipeline; here it maintains
// an in-memory event log accessible via getAnalyticsEvents().

export interface AnalyticsPluginEvent {
  id: string;
  hook: PluginHook;
  entityType: string;
  entityId: string;
  actorId: string;
  actorType: string;
  timestamp: string;
  data: Record<string, unknown>;
}

let analyticsEventCounter = 0;
const analyticsEvents: AnalyticsPluginEvent[] = [];
const MAX_ANALYTICS_EVENTS = 50000;

function recordAnalyticsEvent(context: PluginContext): void {
  analyticsEventCounter++;
  const event: AnalyticsPluginEvent = {
    id: `ae_${analyticsEventCounter}_${Date.now().toString(36)}`,
    hook: context.hook,
    entityType: deriveEntityType(context.hook),
    entityId:
      (context.data.id as string) ??
      (context.data.campaignId as string) ??
      (context.data.submissionId as string) ??
      "unknown",
    actorId: context.metadata.actorId,
    actorType: context.metadata.actorType,
    timestamp: context.metadata.timestamp,
    data: sanitizeForAnalytics(context.data),
  };
  analyticsEvents.push(event);

  // Trim if over limit
  if (analyticsEvents.length > MAX_ANALYTICS_EVENTS) {
    analyticsEvents.splice(0, Math.floor(MAX_ANALYTICS_EVENTS * 0.2));
  }
}

function deriveEntityType(hook: PluginHook): string {
  if (hook.startsWith("campaign.")) return "campaign";
  if (hook.startsWith("submission.")) return "submission";
  if (hook.startsWith("perk.")) return "perk";
  if (hook.startsWith("analytics.")) return "analytics";
  if (hook.startsWith("auth.")) return "user";
  return "unknown";
}

function sanitizeForAnalytics(
  data: Record<string, unknown>
): Record<string, unknown> {
  // Strip internal fields (prefixed with _) and large objects
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith("_")) continue;
    if (typeof value === "string" && value.length > 500) {
      sanitized[key] = value.slice(0, 500) + "...(truncated)";
    } else if (Array.isArray(value) && value.length > 50) {
      sanitized[key] = `[Array of ${value.length} items]`;
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/** Read the analytics events collected by the analytics tracker plugin. */
export function getAnalyticsEvents(filter?: {
  hook?: PluginHook;
  entityType?: string;
  actorId?: string;
  since?: string;
  limit?: number;
}): AnalyticsPluginEvent[] {
  let events = [...analyticsEvents];
  if (filter?.hook) events = events.filter((e) => e.hook === filter.hook);
  if (filter?.entityType)
    events = events.filter((e) => e.entityType === filter.entityType);
  if (filter?.actorId)
    events = events.filter((e) => e.actorId === filter.actorId);
  if (filter?.since) {
    const sinceTime = new Date(filter.since).getTime();
    events = events.filter((e) => new Date(e.timestamp).getTime() >= sinceTime);
  }
  const limit = filter?.limit ?? 100;
  return events.slice(-limit);
}

/** Clear all analytics events. Primarily for testing. */
export function clearAnalyticsEvents(): void {
  analyticsEvents.length = 0;
  analyticsEventCounter = 0;
}

// Build the handler that records analytics for every "after" hook
function makeAnalyticsHandler(): PluginHandler {
  return async (context: PluginContext): Promise<PluginResult> => {
    recordAnalyticsEvent(context);
    return { modified: false };
  };
}

const analyticsHandler = makeAnalyticsHandler();

const analyticsTrackerPlugin: Plugin = {
  id: "analytics-tracker",
  name: "Analytics Event Tracker",
  version: "1.0.0",
  author: "Social Perks",
  description:
    "Logs analytics events for all lifecycle hooks. Captures campaign creation, " +
    "launches, submissions, perk awards, redemptions, and auth events. " +
    "Events are queryable via getAnalyticsEvents().",
  enabled: true,
  config: {
    maxEvents: MAX_ANALYTICS_EVENTS,
    trackBeforeHooks: false,
    trackAfterHooks: true,
  },
  hooks: {
    "campaign.afterCreate": analyticsHandler,
    "campaign.afterLaunch": analyticsHandler,
    "submission.afterCreate": analyticsHandler,
    "submission.afterApprove": analyticsHandler,
    "perk.afterAward": analyticsHandler,
    "perk.afterRedeem": analyticsHandler,
    "analytics.afterQuery": analyticsHandler,
    "auth.afterLogin": analyticsHandler,
    "auth.afterSignup": analyticsHandler,
  },
};

// ── Register Built-in Plugins on Module Load ────────────────────────────────

// FTC compliance runs first (priority 10) — it can abort bad campaigns
pluginManager.register(ftcCompliancePlugin, {
  "campaign.beforeLaunch": 10,
});

// Fraud detection runs early (priority 20) — blocks bad submissions
pluginManager.register(fraudDetectionPlugin, {
  "submission.beforeApprove": 20,
});

// Analytics tracker runs last (priority 1000) — observes final state
pluginManager.register(analyticsTrackerPlugin, {
  "campaign.afterCreate": 1000,
  "campaign.afterLaunch": 1000,
  "submission.afterCreate": 1000,
  "submission.afterApprove": 1000,
  "perk.afterAward": 1000,
  "perk.afterRedeem": 1000,
  "analytics.afterQuery": 1000,
  "auth.afterLogin": 1000,
  "auth.afterSignup": 1000,
});
