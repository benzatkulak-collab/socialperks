// ══════════════════════════════════════════════════════════════════════════════
// Plugin Storage — Per-plugin isolated key-value store
// ══════════════════════════════════════════════════════════════════════════════

import type { PluginStorageInterface } from "./types";

export const DEFAULT_STORAGE_LIMIT_BYTES = 1024 * 1024; // 1 MB per plugin

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
