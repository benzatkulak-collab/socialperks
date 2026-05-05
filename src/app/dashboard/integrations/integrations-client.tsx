"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

// ─── Constants ──────────────────────────────────────────────────────────────

// Mirror of SCOPE_LABELS from src/app/oauth/authorize/page.tsx. The
// consent screen is server-only (so its constants can't be imported
// into a client bundle without dragging server modules along), so we
// duplicate the dict here. Keep in sync — there are only four entries.
const SCOPE_LABELS: Record<string, { label: string; detail: string }> = {
  read: {
    label: "Read your campaigns and stats",
    detail: "List active campaigns, view analytics, read submission status.",
  },
  write: {
    label: "Create and manage campaigns",
    detail: "Launch new campaigns, change rewards, end campaigns.",
  },
  "webhooks:write": {
    label: "Subscribe to your campaign events",
    detail: "Get real-time notifications when submissions come in.",
  },
  "sms:enqueue": {
    label: "Schedule customer-facing SMS",
    detail: "Send post-purchase messages on your behalf via your Twilio.",
  },
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface Integration {
  authorizationId: string;
  appId: string;
  scopes: string[];
  authorizedAt: string;
  lastUsedAt: string | null;
  app: {
    name: string;
    description: string | null;
    homepageUrl: string | null;
    status: "active" | "suspended" | "revoked";
  };
}

interface IntegrationsClientProps {
  businessId: string;
  businessEmail: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
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
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function hostname(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function statusBadge(s: Integration["app"]["status"]): { color: "green" | "amber" | "red"; label: string } {
  if (s === "active") return { color: "green", label: "authorized" };
  if (s === "suspended") return { color: "amber", label: "app suspended" };
  return { color: "red", label: "app revoked" };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function IntegrationsClient({ businessEmail }: IntegrationsClientProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Integration | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/integrations", {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setIntegrations(data?.data?.integrations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleRevoke = useCallback(
    async (appId: string) => {
      setBusyId(appId);
      try {
        const res = await fetch(
          `/api/v1/integrations?app_id=${encodeURIComponent(appId)}`,
          { method: "DELETE", credentials: "include" }
        );
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
              Developer · Integrations
            </p>
            <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">
              Authorized integrations
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-brand-dim">
              AI agents and third-party tools that you&apos;ve approved to act
              on behalf of your shop. Revoke anything you no longer trust.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => void refresh()}>
              Refresh
            </Button>
          </div>
        </div>

        {/* "What is this?" explainer */}
        <Card padding="md" className="mb-6">
          <button
            onClick={() => setExplainerOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-4 bg-transparent border-none cursor-pointer text-left p-0"
            aria-expanded={explainerOpen}
          >
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-cyan/10 text-brand-cyan"
                aria-hidden
              >
                ?
              </span>
              <span className="text-sm font-medium text-brand-white">
                What is this?
              </span>
            </div>
            <span
              className={`text-brand-muted text-xs font-mono transition-transform ${
                explainerOpen ? "rotate-90" : ""
              }`}
              aria-hidden
            >
              ›
            </span>
          </button>
          {explainerOpen && (
            <div className="mt-4 pt-4 border-t border-brand-border text-sm text-brand-dim leading-relaxed space-y-2">
              <p>
                Integrations are AI agents or third-party tools you&apos;ve
                authorized to manage your perks. They identify themselves
                with their own credentials, then ask you to grant them
                specific scopes (read your campaigns, create new
                campaigns, etc.).
              </p>
              <p>
                Revoking immediately invalidates their access tokens —
                they&apos;ll have to re-ask for permission. Use this if a
                vendor relationship ends, an integration is misbehaving,
                or you spot activity you didn&apos;t expect.
              </p>
            </div>
          )}
        </Card>

        {error && (
          <div className="mb-6 rounded-xl border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-brand-red">
            {error}
          </div>
        )}

        {/* List */}
        {loading ? (
          <Card padding="lg" className="text-center">
            <p className="text-sm text-brand-dim">Loading integrations…</p>
          </Card>
        ) : integrations.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3 list-none p-0">
            {integrations.map((it) => (
              <li key={it.authorizationId}>
                <IntegrationRow
                  integration={it}
                  busy={busyId === it.appId}
                  onRevoke={() => setRevokeTarget(it)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Revoke confirmation */}
      {revokeTarget && (
        <RevokeModal
          open={!!revokeTarget}
          target={revokeTarget}
          busy={busyId === revokeTarget.appId}
          onCancel={() => setRevokeTarget(null)}
          onConfirm={() => void handleRevoke(revokeTarget.appId)}
        />
      )}
    </main>
  );
}

// ─── Integration Row ────────────────────────────────────────────────────────

function IntegrationRow({
  integration,
  busy,
  onRevoke,
}: {
  integration: Integration;
  busy: boolean;
  onRevoke: () => void;
}) {
  const status = statusBadge(integration.app.status);
  const host = hostname(integration.app.homepageUrl);

  return (
    <Card padding="md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* Left side */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge color={status.color} dot>
              {status.label}
            </Badge>
          </div>

          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-lg font-heading italic text-brand-white">
              {integration.app.name}
            </h3>
            {integration.app.homepageUrl && host && (
              <a
                href={integration.app.homepageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-brand-cyan underline underline-offset-2 decoration-brand-cyan/40 hover:decoration-brand-cyan transition-colors"
              >
                {host}
              </a>
            )}
          </div>

          {integration.app.description && (
            <p className="mt-2 text-sm text-brand-dim">
              {integration.app.description}
            </p>
          )}

          {/* Scopes */}
          <div className="mt-4">
            <div className="text-3xs font-mono uppercase tracking-widest text-brand-muted mb-2">
              Granted scopes
            </div>
            <div className="space-y-1.5">
              {integration.scopes.map((s) => {
                const meta = SCOPE_LABELS[s];
                return (
                  <div
                    key={s}
                    className="flex items-start gap-2 rounded-lg border border-brand-border/40 bg-brand-bg/40 p-2.5"
                  >
                    <span className="inline-flex shrink-0 items-center px-1.5 py-0.5 rounded-md font-mono text-3xs uppercase tracking-wider bg-brand-elevated text-brand-cyan border border-brand-cyan/30">
                      {s}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs text-brand-text">
                        {meta?.label ?? s}
                      </div>
                      {meta?.detail && (
                        <div className="text-3xs text-brand-muted mt-0.5">
                          {meta.detail}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timestamps */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-3xs font-mono uppercase tracking-wider text-brand-muted">
                Authorized
              </div>
              <div className="mt-0.5 font-mono text-brand-dim">
                {formatDate(integration.authorizedAt)}
              </div>
            </div>
            <div>
              <div className="text-3xs font-mono uppercase tracking-wider text-brand-muted">
                Last activity
              </div>
              <div
                className={`mt-0.5 font-mono ${
                  integration.lastUsedAt ? "text-brand-green" : "text-brand-muted"
                }`}
              >
                {relativeTime(integration.lastUsedAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Right side: actions */}
        <div className="flex flex-row lg:flex-col items-stretch gap-2 lg:w-44 shrink-0">
          <Button
            size="sm"
            variant="destructive"
            onClick={onRevoke}
            loading={busy}
          >
            Revoke access
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <Card padding="lg" borderColor="cyan">
      <div className="max-w-2xl">
        <p className="text-xs font-mono uppercase tracking-widest text-brand-cyan mb-2">
          Nothing connected yet
        </p>
        <h2 className="font-heading text-3xl italic text-brand-white mb-3">
          No integrations authorized yet
        </h2>
        <p className="text-sm text-brand-dim leading-relaxed">
          When an AI agent or third-party tool asks to connect to your
          shop, you&apos;ll see them here. Each integration only has the
          scopes you explicitly granted, and you can revoke any of them
          instantly.
        </p>
      </div>
    </Card>
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
  target: Integration;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title="Revoke integration" size="md">
      <div className="space-y-4">
        <div className="rounded-lg border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-brand-red">
          <p className="font-semibold mb-1">Revoking takes effect immediately.</p>
          <p className="text-xs leading-relaxed">
            <span className="font-medium">{target.app.name}</span>&apos;s
            access tokens will be invalidated. They&apos;ll have to ask
            you for permission again to do anything on your behalf.
          </p>
        </div>

        <div className="bg-brand-bg border border-brand-border rounded-lg p-3">
          <div className="text-3xs font-mono uppercase tracking-widest text-brand-muted mb-1">
            Revoking access for
          </div>
          <div className="text-sm text-brand-white font-medium">
            {target.app.name}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {target.scopes.map((s) => (
              <span
                key={s}
                className="inline-flex items-center px-1.5 py-0.5 rounded-md font-mono text-3xs uppercase tracking-wider bg-brand-elevated text-brand-dim border border-brand-border"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-brand-border">
          <Button variant="ghost" size="md" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" size="md" onClick={onConfirm} loading={busy}>
            Revoke access
          </Button>
        </div>
      </div>
    </Modal>
  );
}
