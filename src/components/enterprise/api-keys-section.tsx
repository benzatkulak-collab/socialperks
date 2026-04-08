"use client";

import type { ApiKey } from "./api-console-types";

// ═══════════════ Types ═══════════════

interface ApiKeysSectionProps {
  filteredKeys: ApiKey[];
  environment: "sandbox" | "production";
  showCreateKey: boolean;
  newKeyName: string;
  copiedKeyId: string | null;
  statusStyles: Record<string, { label: string; className: string }>;
  onToggleCreateKey: () => void;
  onNewKeyNameChange: (name: string) => void;
  onGenerateKey: () => void;
  onCopyKey: (keyId: string, keyPrefix: string) => void;
  onRevokeKey: (keyId: string) => void;
}

// ═══════════════ Component ═══════════════

export function ApiKeysSection({
  filteredKeys,
  environment,
  showCreateKey,
  newKeyName,
  copiedKeyId,
  statusStyles,
  onToggleCreateKey,
  onNewKeyNameChange,
  onGenerateKey,
  onCopyKey,
  onRevokeKey,
}: ApiKeysSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-brand-muted">
          {filteredKeys.length} {environment} key{filteredKeys.length !== 1 ? "s" : ""}
        </p>
        <button
          type="button"
          onClick={onToggleCreateKey}
          className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90"
        >
          Create Key
        </button>
      </div>

      {/* Create Key Form */}
      {showCreateKey && (
        <div className="rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-4">
          <h3 className="text-sm font-medium text-brand-white">Create New API Key</h3>
          <div className="mt-3 flex gap-3">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => onNewKeyNameChange(e.target.value)}
              className="flex-1 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
              placeholder="Key name (e.g., Production Server)"
              aria-label="API key name"
            />
            <button
              type="button"
              disabled={!newKeyName}
              onClick={onGenerateKey}
              className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Generate
            </button>
          </div>
          <p className="mt-2 text-xs text-brand-muted">
            Environment: <span className="font-medium capitalize text-brand-text">{environment}</span>
          </p>
        </div>
      )}

      {/* Keys List */}
      <div className="space-y-3">
        {filteredKeys.map((key) => {
          const statusCfg = statusStyles[key.status];
          return (
            <div
              key={key.id}
              className="rounded-xl border border-brand-border bg-brand-surface p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-brand-white">{key.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCfg.className}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="font-mono text-xs text-brand-dim">{key.keyPrefix}...&bull;&bull;&bull;&bull;</code>
                    <button
                      type="button"
                      onClick={() => onCopyKey(key.id, key.keyPrefix)}
                      className="text-xs text-brand-cyan transition-colors hover:text-brand-white"
                      aria-label={`Copy API key ${key.name}`}
                    >
                      {copiedKeyId === key.id ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-brand-muted">
                    Created {key.createdAt}
                    {key.lastUsed && ` · Last used ${key.lastUsed}`}
                    {` · ${key.requestsToday} requests today`}
                  </p>
                </div>
                {key.status === "active" && (
                  <button
                    type="button"
                    onClick={() => onRevokeKey(key.id)}
                    className="shrink-0 rounded-lg border border-brand-red/30 bg-brand-red/10 px-3 py-1.5 text-xs font-medium text-brand-red transition-colors hover:bg-brand-red/20"
                    aria-label={`Revoke API key ${key.name}`}
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredKeys.length === 0 && (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-brand-border bg-brand-surface">
          <p className="text-sm text-brand-muted">No {environment} API keys. Create one to get started.</p>
        </div>
      )}
    </div>
  );
}
