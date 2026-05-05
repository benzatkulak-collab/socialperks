"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

// ─── Constants ──────────────────────────────────────────────────────────────

// Mirror of allowed scopes from /api/v1/api-keys POST. Inlined to avoid
// dragging server-only modules into the client bundle.
const ALL_SCOPES = [
  { id: "read", label: "read", detail: "List campaigns, view analytics, read submissions." },
  { id: "write", label: "write", detail: "Create and manage campaigns, change rewards." },
  { id: "webhooks:write", label: "webhooks:write", detail: "Subscribe to event webhooks." },
  { id: "sms:enqueue", label: "sms:enqueue", detail: "Schedule customer-facing SMS via your Twilio." },
] as const;

// ─── Types ──────────────────────────────────────────────────────────────────

interface KeySummary {
  id: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  active: boolean;
}

interface ApiKeysClientProps {
  businessId: string;
  businessEmail: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ApiKeysClient({ businessEmail }: ApiKeysClientProps) {
  const [keys, setKeys] = useState<KeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<{
    id: string;
    secret: string;
    name: string;
  } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<KeySummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/api-keys", {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setKeys(data?.data?.keys ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = useCallback(
    async (name: string, scopes: string[]) => {
      const res = await fetch("/api/v1/api-keys", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scopes }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      const k = data.data.key as { id: string; secret: string; name: string };
      setCreatedSecret({ id: k.id, secret: k.secret, name: k.name });
      setCreateOpen(false);
      await refresh();
    },
    [refresh]
  );

  const handleRevoke = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        const res = await fetch(`/api/v1/api-keys?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
        }
        setRevokeTarget(null);
        await refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Revoke failed");
      } finally {
        setBusyId(null);
      }
    },
    [refresh]
  );

  return (
    <main id="main-content" className="min-h-screen bg-brand-bg text-brand-text">
      {/* Top bar */}
      <header className="border-b border-brand-border">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="text-xs font-mono uppercase tracking-widest text-brand-dim hover:text-brand-text transition-colors"
          >
            &larr; Dashboard
          </Link>
          <div className="text-3xs text-brand-muted font-mono uppercase tracking-wider">
            {businessEmail}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Title row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-brand-cyan mb-2">
              Developer · API keys
            </p>
            <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">
              API keys
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-brand-dim">
              Personal keys for integrating Social Perks into your code, CI
              pipelines, or AI agent stack. Each key is scoped — issue the
              narrowest possible permissions and rotate compromised keys
              immediately.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => void refresh()}>
              Refresh
            </Button>
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              + New API key
            </Button>
          </div>
        </div>

        {/* CLI quick-start banner */}
        <Card padding="md" borderColor="cyan" className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-3xs font-mono uppercase tracking-widest text-brand-cyan mb-1.5">
                Prefer the CLI?
              </p>
              <p className="text-sm text-brand-dim">
                Provision and rotate keys from your terminal — no clicks
                required.
              </p>
            </div>
            <code className="font-mono text-xs text-brand-cyan bg-brand-bg border border-brand-cyan/30 rounded-lg px-3 py-2 whitespace-nowrap shrink-0">
              npx @socialperks/cli init
            </code>
          </div>
        </Card>

        {error && (
          <div className="mb-6 rounded-xl border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-brand-red">
            {error}
          </div>
        )}

        {/* List */}
        {loading ? (
          <Card padding="lg" className="text-center">
            <p className="text-sm text-brand-dim">Loading keys…</p>
          </Card>
        ) : keys.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="px-5 py-3 text-3xs font-mono uppercase tracking-widest text-brand-muted">
                      Name
                    </th>
                    <th className="px-5 py-3 text-3xs font-mono uppercase tracking-widest text-brand-muted">
                      Key
                    </th>
                    <th className="px-5 py-3 text-3xs font-mono uppercase tracking-widest text-brand-muted">
                      Scopes
                    </th>
                    <th className="px-5 py-3 text-3xs font-mono uppercase tracking-widest text-brand-muted">
                      Created
                    </th>
                    <th className="px-5 py-3 text-3xs font-mono uppercase tracking-widest text-brand-muted">
                      Last used
                    </th>
                    <th className="px-5 py-3 text-3xs font-mono uppercase tracking-widest text-brand-muted">
                      Status
                    </th>
                    <th className="px-5 py-3 text-3xs font-mono uppercase tracking-widest text-brand-muted text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr
                      key={k.id}
                      className="border-b border-brand-border/40 last:border-b-0"
                    >
                      <td className="px-5 py-4 text-sm text-brand-white font-medium">
                        {k.name}
                      </td>
                      <td className="px-5 py-4">
                        <code className="font-mono text-xs text-brand-dim">
                          {k.keyPrefix}
                        </code>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center px-1.5 py-0.5 rounded-md font-mono text-3xs uppercase tracking-wider bg-brand-elevated text-brand-dim border border-brand-border"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-brand-dim">
                        {formatDate(k.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-brand-dim">
                        {relativeTime(k.lastUsedAt)}
                      </td>
                      <td className="px-5 py-4">
                        {k.active ? (
                          <Badge color="green" dot>
                            active
                          </Badge>
                        ) : (
                          <Badge color="red" dot>
                            revoked
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {k.active ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRevokeTarget(k)}
                            loading={busyId === k.id}
                          >
                            Revoke
                          </Button>
                        ) : (
                          <span className="text-3xs font-mono text-brand-muted">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      {/* Create modal */}
      {createOpen && (
        <CreateModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />
      )}

      {/* Secret reveal modal */}
      {createdSecret && (
        <SecretModal
          open={!!createdSecret}
          name={createdSecret.name}
          secret={createdSecret.secret}
          onClose={() => setCreatedSecret(null)}
        />
      )}

      {/* Revoke confirmation */}
      {revokeTarget && (
        <RevokeModal
          open={!!revokeTarget}
          target={revokeTarget}
          busy={busyId === revokeTarget.id}
          onCancel={() => setRevokeTarget(null)}
          onConfirm={() => void handleRevoke(revokeTarget.id)}
        />
      )}
    </main>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card padding="lg" borderColor="cyan">
      <div className="max-w-2xl">
        <p className="text-xs font-mono uppercase tracking-widest text-brand-cyan mb-2">
          Get started
        </p>
        <h2 className="font-heading text-3xl italic text-brand-white mb-3">
          No API keys yet
        </h2>
        <p className="text-sm text-brand-dim leading-relaxed">
          Create one to integrate Social Perks into your code or AI agent
          stack. Keys are scoped — issue narrow permissions, rotate often,
          and revoke anything you suspect has leaked.
        </p>

        <div className="mt-6">
          <p className="text-3xs font-mono uppercase tracking-widest text-brand-muted mb-2">
            Quick example
          </p>
          <pre className="text-3xs font-mono bg-brand-bg border border-brand-border rounded-lg p-4 overflow-x-auto text-brand-dim leading-relaxed">
            {`curl https://api.socialperks.com/api/v1/campaigns \\
  -H "Authorization: Bearer sk_live_…"`}
          </pre>
        </div>

        <div className="mt-7">
          <Button variant="primary" size="lg" onClick={onCreate}>
            Create your first key
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Create Modal ───────────────────────────────────────────────────────────

function CreateModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, scopes: string[]) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(["read"]));
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    setLocalError(null);
    if (name.trim().length < 2) {
      setLocalError("Name is required (helps you remember which key is which).");
      return;
    }
    if (selected.size === 0) {
      setLocalError("Select at least one scope.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(name.trim(), [...selected]);
      setName("");
      setSelected(new Set(["read"]));
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create API key" size="lg">
      <div className="space-y-5">
        <div>
          <label className="block text-3xs font-mono uppercase tracking-widest text-brand-muted mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Production CI, Marketing agent v2"
            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted font-body focus:outline-none focus:border-brand-cyan/60"
            maxLength={100}
          />
          <p className="mt-1 text-3xs text-brand-muted">
            For your reference only. We&apos;ll show this in the dashboard list.
          </p>
        </div>

        <div>
          <label className="block text-3xs font-mono uppercase tracking-widest text-brand-muted mb-2">
            Scopes ({selected.size}/{ALL_SCOPES.length})
          </label>
          <div className="space-y-1.5">
            {ALL_SCOPES.map((s) => {
              const isSelected = selected.has(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                    isSelected
                      ? "bg-brand-cyan/5 border-brand-cyan/40"
                      : "bg-brand-bg border-brand-border hover:border-brand-border-hover"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(s.id)}
                    className="mt-0.5 accent-cyan-400"
                  />
                  <div className="min-w-0">
                    <div
                      className={`font-mono text-xs ${
                        isSelected ? "text-brand-cyan" : "text-brand-text"
                      }`}
                    >
                      {s.label}
                    </div>
                    <div className="mt-0.5 text-3xs text-brand-dim">
                      {s.detail}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {localError && (
          <div className="rounded-lg border border-brand-red/30 bg-brand-red/10 p-3 text-xs text-brand-red">
            {localError}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-brand-border">
          <Button variant="ghost" size="md" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => void submit()}
            loading={submitting}
          >
            Create key
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Secret Reveal Modal ────────────────────────────────────────────────────

function SecretModal({
  open,
  onClose,
  secret,
  name,
}: {
  open: boolean;
  onClose: () => void;
  secret: string;
  name: string;
}) {
  const [copied, setCopied] = useState(false);
  const [stored, setStored] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop — user can copy manually
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="API key created" size="lg">
      <div className="space-y-4">
        <div className="rounded-lg border border-brand-amber/40 bg-brand-amber/10 p-4 text-sm text-brand-amber">
          <p className="font-semibold mb-1">Store this secret now.</p>
          <p className="text-xs leading-relaxed">
            This is the only time the full key will be shown. Save it in
            your environment variables, secret manager, or password vault
            before continuing — there is no recovery.
          </p>
        </div>

        <div>
          <label className="block text-3xs font-mono uppercase tracking-widest text-brand-muted mb-1.5">
            Name
          </label>
          <div className="text-sm text-brand-white">{name}</div>
        </div>

        <div>
          <label className="block text-3xs font-mono uppercase tracking-widest text-brand-muted mb-1.5">
            Secret
          </label>
          {stored ? (
            <div className="font-mono text-xs text-brand-muted bg-brand-bg border border-brand-border rounded-lg p-3">
              ••••••••••••••••••••••••••••••••
            </div>
          ) : (
            <div className="flex gap-2">
              <code className="flex-1 font-mono text-xs text-brand-cyan bg-brand-bg border border-brand-cyan/30 rounded-lg p-3 break-all">
                {secret}
              </code>
              <Button size="md" variant="secondary" onClick={() => void copy()}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-brand-border">
          {!stored ? (
            <Button variant="primary" size="md" onClick={() => setStored(true)}>
              I&apos;ve stored it
            </Button>
          ) : (
            <Button variant="primary" size="md" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Revoke Confirmation Modal ──────────────────────────────────────────────

function RevokeModal({
  open,
  target,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  target: KeySummary;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title="Revoke API key" size="md">
      <div className="space-y-4">
        <div className="rounded-lg border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-brand-red">
          <p className="font-semibold mb-1">Revoking takes effect immediately.</p>
          <p className="text-xs leading-relaxed">
            Any service still using this key will start receiving 401
            responses. This cannot be undone — you&apos;ll need to issue a
            new key and update everywhere it&apos;s used.
          </p>
        </div>

        <div className="bg-brand-bg border border-brand-border rounded-lg p-3">
          <div className="text-3xs font-mono uppercase tracking-widest text-brand-muted mb-1">
            Revoking
          </div>
          <div className="text-sm text-brand-white font-medium">{target.name}</div>
          <div className="text-xs font-mono text-brand-dim mt-1">{target.keyPrefix}</div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-brand-border">
          <Button variant="ghost" size="md" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" size="md" onClick={onConfirm} loading={busy}>
            Revoke key
          </Button>
        </div>
      </div>
    </Modal>
  );
}
