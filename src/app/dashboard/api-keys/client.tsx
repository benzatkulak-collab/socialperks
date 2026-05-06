"use client";

import { useCallback, useEffect, useState } from "react";

interface ApiKeyMetadata {
  id: string;
  agentName: string;
  keyPrefix: string;
  env: "live" | "test";
  permissions: string[];
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

interface CreatedKey extends ApiKeyMetadata {
  key: string; // plaintext, shown ONCE
  warning: string;
}

type FetchState =
  | { status: "loading" }
  | { status: "ready"; keys: ApiKeyMetadata[] }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

const API = "/api/v1/api-keys";

async function jsonFetch<T>(
  url: string,
  init: RequestInit = {}
): Promise<{ ok: true; data: T } | { ok: false; status: number; code: string; message: string }> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  let body: { success?: boolean; data?: T; error?: { code: string; message: string } };
  try {
    body = await res.json();
  } catch {
    return { ok: false, status: res.status, code: "INVALID_RESPONSE", message: "Server returned non-JSON" };
  }
  if (body.success && body.data !== undefined) return { ok: true, data: body.data };
  const code = body.error?.code ?? "UNKNOWN";
  const message = body.error?.message ?? `HTTP ${res.status}`;
  return { ok: false, status: res.status, code, message };
}

export function ApiKeysClient() {
  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [creating, setCreating] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [permRead, setPermRead] = useState(true);
  const [permWrite, setPermWrite] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<CreatedKey | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setState({ status: "loading" });
    const r = await jsonFetch<{ keys: ApiKeyMetadata[] }>(API);
    if (r.ok) {
      setState({ status: "ready", keys: r.data.keys });
    } else if (r.status === 401) {
      setState({ status: "unauthenticated" });
    } else {
      setState({ status: "error", message: r.message });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (agentName.trim().length === 0) {
      setCreateError("Agent name is required.");
      return;
    }
    const permissions: string[] = [];
    if (permRead) permissions.push("read");
    if (permWrite) permissions.push("write");
    if (permissions.length === 0) {
      setCreateError("Pick at least one permission.");
      return;
    }
    setCreating(true);
    const r = await jsonFetch<CreatedKey>(API, {
      method: "POST",
      body: JSON.stringify({ agentName: agentName.trim(), permissions }),
    });
    setCreating(false);
    if (!r.ok) {
      setCreateError(r.message);
      return;
    }
    setJustCreated(r.data);
    setAgentName("");
    void refresh();
  }

  async function handleRevoke(id: string, agentName: string) {
    if (!confirm(`Revoke "${agentName}"? Existing requests using this key will start failing immediately.`)) {
      return;
    }
    setRevoking(id);
    const r = await jsonFetch<{ id: string; revoked: boolean }>(`${API}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setRevoking(null);
    if (!r.ok) {
      alert(`Failed to revoke: ${r.message}`);
      return;
    }
    void refresh();
  }

  return (
    <div className="space-y-8">
      {/* Just-created banner */}
      {justCreated && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-6">
          <div className="flex items-start justify-between mb-3">
            <h2 className="font-serif italic text-xl text-amber-300">
              Key created — copy it now
            </h2>
            <button
              onClick={() => setJustCreated(null)}
              className="text-brand-text-dim hover:text-brand-white text-sm"
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </div>
          <p className="text-amber-200 text-sm mb-4">{justCreated.warning}</p>
          <div className="flex gap-2 mb-2">
            <code className="flex-1 font-mono text-sm bg-black/40 border border-amber-500/30 rounded px-3 py-2 text-brand-white break-all">
              {justCreated.key}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(justCreated.key)}
              className="px-4 py-2 bg-amber-500 text-black font-medium rounded hover:bg-amber-400"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-brand-text-dim">
            Agent: <span className="text-brand-text">{justCreated.agentName}</span> · Permissions: <span className="text-brand-text">{justCreated.permissions.join(", ")}</span> · Created: <span className="text-brand-text">{new Date(justCreated.createdAt).toLocaleString()}</span>
          </p>
        </div>
      )}

      {/* Create form */}
      <section className="rounded-lg border border-brand-border bg-brand-card p-6">
        <h2 className="font-serif italic text-xl mb-4 text-brand-white">
          Create a new key
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm text-brand-text-dim mb-1.5" htmlFor="agentName">
              Agent name
            </label>
            <input
              id="agentName"
              type="text"
              required
              maxLength={255}
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g. Marketing bot"
              className="w-full bg-black/40 border border-brand-border rounded px-3 py-2 text-brand-white placeholder-brand-text-dim focus:outline-none focus:border-brand-cyan"
              disabled={creating}
            />
            <p className="text-xs text-brand-text-dim mt-1">
              Just a label for you — describe which agent or service this key
              is for.
            </p>
          </div>
          <div>
            <label className="block text-sm text-brand-text-dim mb-1.5">
              Permissions
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permRead}
                  onChange={(e) => setPermRead(e.target.checked)}
                  disabled={creating}
                />
                <span className="text-brand-text">read</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permWrite}
                  onChange={(e) => setPermWrite(e.target.checked)}
                  disabled={creating}
                />
                <span className="text-brand-text">write</span>
              </label>
            </div>
          </div>
          {createError && (
            <p className="text-red-400 text-sm">{createError}</p>
          )}
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-brand-cyan text-black font-medium rounded hover:bg-brand-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "Creating..." : "Create key"}
          </button>
        </form>
      </section>

      {/* Existing keys */}
      <section>
        <h2 className="font-serif italic text-xl mb-4 text-brand-white">
          Your keys
        </h2>
        {state.status === "loading" && (
          <p className="text-brand-text-dim">Loading…</p>
        )}
        {state.status === "unauthenticated" && (
          <div className="rounded-lg border border-brand-border bg-brand-card p-6">
            <p className="text-brand-text mb-3">
              Sign in to your business account to manage API keys.
            </p>
            <a
              href="/dashboard"
              className="inline-block px-4 py-2 bg-brand-cyan text-black font-medium rounded hover:bg-brand-cyan/90"
            >
              Go to dashboard
            </a>
          </div>
        )}
        {state.status === "error" && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-6">
            <p className="text-red-300">Couldn&apos;t load keys: {state.message}</p>
            <button
              onClick={() => void refresh()}
              className="mt-3 text-sm text-red-200 underline hover:text-red-100"
            >
              Retry
            </button>
          </div>
        )}
        {state.status === "ready" && state.keys.length === 0 && (
          <p className="text-brand-text-dim">
            No keys yet. Create one above to get started.
          </p>
        )}
        {state.status === "ready" && state.keys.length > 0 && (
          <ul className="space-y-3">
            {state.keys.map((k) => (
              <li
                key={k.id}
                className="rounded-lg border border-brand-border bg-brand-card p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-brand-white truncate">
                      {k.agentName}
                    </span>
                    {!k.active && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                        revoked
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded bg-brand-bg text-brand-text-dim border border-brand-border">
                      {k.env}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-brand-text-dim">
                    <code className="font-mono">sp_{k.env}_{k.keyPrefix}_…</code>
                    <span>·</span>
                    <span>{k.permissions.join(", ") || "no perms"}</span>
                    <span>·</span>
                    <span>
                      {k.lastUsedAt
                        ? `last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                        : "never used"}
                    </span>
                  </div>
                </div>
                {k.active && (
                  <button
                    onClick={() => void handleRevoke(k.id, k.agentName)}
                    disabled={revoking === k.id}
                    className="text-sm text-red-300 hover:text-red-200 disabled:opacity-50"
                  >
                    {revoking === k.id ? "Revoking…" : "Revoke"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
