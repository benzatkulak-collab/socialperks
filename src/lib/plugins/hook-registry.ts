// ══════════════════════════════════════════════════════════════════════════════
// Hook Registry — Central registry for hook handler subscriptions
// ══════════════════════════════════════════════════════════════════════════════

import type {
  HookName,
  HookPayload,
  HookRegistration,
  HookResult,
  ExecutionTrace,
  PluginContext,
  PluginHookHandler,
} from "./types";
import { VALID_HOOKS } from "./types";
import type { PluginSandbox } from "./sandbox";

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
