"use client";

import React, { useState, useEffect, useCallback } from "react";
import { clearFlagCache } from "@/lib/hooks/use-feature-flag";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetSegments: Segment[];
  variants: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface Segment {
  type: "role" | "plan" | "businessId" | "userId" | "custom";
  operator: "eq" | "neq" | "in" | "nin";
  value: string | string[];
}

interface NewFlagForm {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FeatureFlagsPanel() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newFlag, setNewFlag] = useState<NewFlagForm>({
    id: "",
    name: "",
    description: "",
    enabled: true,
    rolloutPercentage: 100,
  });

  // ── Fetch Flags ─────────────────────────────────────────────────────────

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "list" }),
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch flags: ${res.status}`);
      }
      const json = await res.json();
      if (json.success) {
        setFlags(json.data);
      } else {
        setError(json.error?.message ?? "Failed to load flags");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load flags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  // ── Toggle Flag ─────────────────────────────────────────────────────────

  const toggleFlag = async (flagId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch("/api/v1/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "update",
          flagId,
          flag: { enabled: !currentEnabled },
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      const json = await res.json();
      if (json.success) {
        setFlags((prev) =>
          prev.map((f) => (f.id === flagId ? json.data : f))
        );
        clearFlagCache();
      }
    } catch {
      setError("Failed to toggle flag");
    }
  };

  // ── Update Rollout ──────────────────────────────────────────────────────

  const updateRollout = async (flagId: string, rolloutPercentage: number) => {
    try {
      const res = await fetch("/api/v1/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "update",
          flagId,
          flag: { rolloutPercentage },
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      const json = await res.json();
      if (json.success) {
        setFlags((prev) =>
          prev.map((f) => (f.id === flagId ? json.data : f))
        );
        clearFlagCache();
      }
    } catch {
      setError("Failed to update rollout");
    }
  };

  // ── Create Flag ─────────────────────────────────────────────────────────

  const createFlag = async () => {
    if (!newFlag.id.trim() || !newFlag.name.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/v1/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "create",
          flag: {
            id: newFlag.id.trim().toLowerCase().replace(/\s+/g, "_"),
            name: newFlag.name.trim(),
            description: newFlag.description.trim(),
            enabled: newFlag.enabled,
            rolloutPercentage: newFlag.rolloutPercentage,
          },
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Create failed");
      }
      const json = await res.json();
      if (json.success) {
        setFlags((prev) => [...prev, json.data]);
        setNewFlag({ id: "", name: "", description: "", enabled: true, rolloutPercentage: 100 });
        setShowCreate(false);
        clearFlagCache();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create flag");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete Flag ─────────────────────────────────────────────────────────

  const deleteFlag = async (flagId: string) => {
    try {
      const res = await fetch("/api/v1/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "delete", flagId }),
      });
      if (!res.ok) throw new Error("Delete failed");
      const json = await res.json();
      if (json.success) {
        setFlags((prev) => prev.filter((f) => f.id !== flagId));
        setConfirmDeleteId(null);
        clearFlagCache();
      }
    } catch {
      setError("Failed to delete flag");
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-brand-white">Feature Flags</h2>
          <p className="mt-1 text-sm text-brand-muted">
            {flags.length} flag{flags.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90"
        >
          {showCreate ? "Cancel" : "Create Flag"}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-brand-red/30 bg-brand-red/10 px-4 py-3">
          <p className="text-sm text-brand-red">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-brand-red/60 transition-colors hover:text-brand-red"
            aria-label="Dismiss error"
          >
            &#10005;
          </button>
        </div>
      )}

      {/* Create Flag Form */}
      {showCreate && (
        <div className="rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-5">
          <h3 className="text-sm font-medium text-brand-white">New Feature Flag</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="flag-id"
                className="block text-xs font-medium text-brand-muted mb-1.5"
              >
                Flag ID
              </label>
              <input
                id="flag-id"
                type="text"
                value={newFlag.id}
                onChange={(e) => setNewFlag((f) => ({ ...f, id: e.target.value }))}
                className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 font-mono text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                placeholder="e.g. new_onboarding"
              />
            </div>
            <div>
              <label
                htmlFor="flag-name"
                className="block text-xs font-medium text-brand-muted mb-1.5"
              >
                Display Name
              </label>
              <input
                id="flag-name"
                type="text"
                value={newFlag.name}
                onChange={(e) => setNewFlag((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                placeholder="New Onboarding Flow"
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="flag-description"
                className="block text-xs font-medium text-brand-muted mb-1.5"
              >
                Description
              </label>
              <input
                id="flag-description"
                type="text"
                value={newFlag.description}
                onChange={(e) => setNewFlag((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                placeholder="Short description of what this flag controls"
              />
            </div>
            <div>
              <label
                htmlFor="flag-rollout"
                className="block text-xs font-medium text-brand-muted mb-1.5"
              >
                Rollout Percentage
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="flag-rollout"
                  type="range"
                  min={0}
                  max={100}
                  value={newFlag.rolloutPercentage}
                  onChange={(e) =>
                    setNewFlag((f) => ({ ...f, rolloutPercentage: Number(e.target.value) }))
                  }
                  className="flex-1 accent-[#22D3EE]"
                />
                <span className="w-12 text-right font-mono text-sm text-brand-text">
                  {newFlag.rolloutPercentage}%
                </span>
              </div>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <ToggleSwitch
                  checked={newFlag.enabled}
                  onChange={(checked) => setNewFlag((f) => ({ ...f, enabled: checked }))}
                />
                <span className="text-sm text-brand-text">Enabled by default</span>
              </label>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={!newFlag.id.trim() || !newFlag.name.trim() || saving}
              onClick={createFlag}
              className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Creating..." : "Create Flag"}
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-cyan/30 border-t-brand-cyan" />
        </div>
      )}

      {/* Flags List */}
      {!loading && (
        <div className="space-y-3">
          {flags.map((flag) => (
            <div
              key={flag.id}
              className="rounded-xl border border-brand-border bg-brand-surface p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <ToggleSwitch
                      checked={flag.enabled}
                      onChange={() => toggleFlag(flag.id, flag.enabled)}
                    />
                    <div>
                      <h3 className="text-sm font-medium text-brand-white">{flag.name}</h3>
                      <code className="mt-0.5 block font-mono text-xs text-brand-dim">{flag.id}</code>
                    </div>
                  </div>
                  {flag.description && (
                    <p className="mt-2 text-sm text-brand-muted">{flag.description}</p>
                  )}

                  {/* Rollout Slider */}
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-xs text-brand-muted whitespace-nowrap">Rollout:</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={flag.rolloutPercentage}
                      onChange={(e) => updateRollout(flag.id, Number(e.target.value))}
                      className="flex-1 max-w-xs accent-[#22D3EE]"
                      aria-label={`Rollout percentage for ${flag.name}`}
                    />
                    <span className="w-12 text-right font-mono text-xs text-brand-text">
                      {flag.rolloutPercentage}%
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {flag.targetSegments.length > 0 && (
                      <span className="rounded-full border border-brand-purple/30 bg-brand-purple/10 px-2 py-0.5 text-[10px] font-medium text-brand-purple">
                        {flag.targetSegments.length} segment{flag.targetSegments.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {Object.keys(flag.variants).length > 0 && (
                      <span className="rounded-full border border-brand-amber/30 bg-brand-amber/10 px-2 py-0.5 text-[10px] font-medium text-brand-amber">
                        {Object.keys(flag.variants).length} variant{Object.keys(flag.variants).length !== 1 ? "s" : ""}
                      </span>
                    )}
                    <span className="text-xs text-brand-subtle">
                      Updated {new Date(flag.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Delete Button */}
                <div className="shrink-0">
                  {confirmDeleteId === flag.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-brand-muted">Delete?</span>
                      <button
                        type="button"
                        onClick={() => deleteFlag(flag.id)}
                        className="rounded-lg border border-brand-red/30 bg-brand-red/10 px-3 py-1.5 text-xs font-medium text-brand-red transition-colors hover:bg-brand-red/20"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-brand-border px-3 py-1.5 text-xs text-brand-muted transition-colors hover:text-brand-text"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(flag.id)}
                      className="text-xs text-brand-muted transition-colors hover:text-brand-red"
                      aria-label={`Delete flag ${flag.name}`}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && flags.length === 0 && (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-brand-border bg-brand-surface">
          <p className="text-sm text-brand-muted">No feature flags configured. Create one to get started.</p>
        </div>
      )}
    </div>
  );
}

// ─── Toggle Switch Component ────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg
        ${checked ? "bg-brand-cyan" : "bg-brand-elevated"}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg
          ring-0 transition-transform duration-200 ease-in-out
          ${checked ? "translate-x-5" : "translate-x-0"}
        `}
      />
    </button>
  );
}
