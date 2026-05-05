"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

// Mirror of `KNOWN_EVENT_TYPES` from `@/lib/webhooks`. Inlined here to avoid
// dragging the server-only webhook store (which imports `postgres`) into the
// client bundle. Keep these in sync if the server list changes — there is a
// test in `src/lib/webhooks/__tests__` that asserts the union, and the
// server validates incoming POSTs against the canonical list anyway.
const KNOWN_EVENT_TYPES = [
  "campaign.created",
  "campaign.launched",
  "campaign.paused",
  "campaign.resumed",
  "campaign.ended",
  "campaign.expired",
  "submission.created",
  "submission.approved",
  "submission.rejected",
  "submission.expired",
  "perk.awarded",
  "perk.redeemed",
  "perk.expired",
  "user.signup",
  "user.login",
  "user.logout",
  "influencer.applied",
  "influencer.accepted",
  "influencer.rejected",
  "agent.query",
  "agent.campaign_execute",
] as const;

// ─── Types ──────────────────────────────────────────────────────────────────

interface WebhookSummary {
  id: string;
  url: string;
  events: string[];
  secret: string; // masked from server (prefix only)
  status: "active" | "inactive" | "failing";
  failureCount: number;
  lastTriggered: string | null;
  lastSuccess: string | null;
  lastFailure: string | null;
  createdAt: string;
}

interface WebhooksClientProps {
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

function statusColor(s: WebhookSummary["status"]): "green" | "amber" | "red" {
  if (s === "active") return "green";
  if (s === "failing") return "amber";
  return "red";
}

function truncateUrl(url: string, max = 48): string {
  if (url.length <= max) return url;
  return url.slice(0, max) + "…";
}

// ─── Component ──────────────────────────────────────────────────────────────

export function WebhooksClient({ businessEmail }: WebhooksClientProps) {
  const [webhooks, setWebhooks] = useState<WebhookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<{
    id: string;
    secret: string;
    url: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; msg: string } | null>(
    null
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/webhooks", {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setWebhooks(data?.data?.webhooks ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = useCallback(
    async (url: string, events: string[]) => {
      const res = await fetch("/api/v1/webhooks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, events }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      const wh = data.data.webhook as WebhookSummary;
      setCreatedSecret({ id: wh.id, secret: wh.secret, url: wh.url });
      setCreateOpen(false);
      await refresh();
    },
    [refresh]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this webhook? This cannot be undone.")) return;
      setBusyId(id);
      try {
        const res = await fetch(`/api/v1/webhooks?webhookId=${encodeURIComponent(id)}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
        }
        await refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Delete failed");
      } finally {
        setBusyId(null);
      }
    },
    [refresh]
  );

  const handleTest = useCallback(async (id: string) => {
    setBusyId(id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/v1/webhooks/${encodeURIComponent(id)}/test`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setTestResult({
          id,
          ok: false,
          msg: data?.error?.message ?? `HTTP ${res.status}`,
        });
      } else {
        const delivery = data.data.delivery;
        const ok =
          delivery?.status === "delivered" ||
          (delivery?.statusCode && delivery.statusCode >= 200 && delivery.statusCode < 300);
        setTestResult({
          id,
          ok: !!ok,
          msg: ok
            ? `Delivered (HTTP ${delivery.statusCode}) in ${delivery?.attempts ?? 1} attempt(s)`
            : `Failed: ${delivery?.error ?? `HTTP ${delivery?.statusCode ?? "?"}`}`,
        });
      }
    } catch (e) {
      setTestResult({
        id,
        ok: false,
        msg: e instanceof Error ? e.message : "Test failed",
      });
    } finally {
      setBusyId(null);
    }
  }, []);

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
              Developer · Webhooks
            </p>
            <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">
              Webhook subscriptions
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-brand-dim">
              Receive real-time events from Social Perks pushed to your endpoint —
              campaigns, submissions, perks, and agent activity. HMAC-signed,
              automatically retried with exponential backoff.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => void refresh()}>
              Refresh
            </Button>
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              + Create webhook
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-brand-red">
            {error}
          </div>
        )}

        {testResult && (
          <div
            className={`mb-6 rounded-xl border p-4 text-sm ${
              testResult.ok
                ? "border-brand-green/30 bg-brand-green/10 text-brand-green"
                : "border-brand-amber/30 bg-brand-amber/10 text-brand-amber"
            }`}
          >
            <span className="font-mono text-3xs uppercase tracking-wider mr-2">
              Test {testResult.ok ? "OK" : "FAIL"}
            </span>
            {testResult.msg}
          </div>
        )}

        {/* List */}
        {loading ? (
          <Card padding="lg" className="text-center">
            <p className="text-sm text-brand-dim">Loading webhooks…</p>
          </Card>
        ) : webhooks.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <ul className="space-y-3 list-none p-0">
            {webhooks.map((wh) => (
              <li key={wh.id}>
                <WebhookRow
                  webhook={wh}
                  busy={busyId === wh.id}
                  onTest={() => void handleTest(wh.id)}
                  onDelete={() => void handleDelete(wh.id)}
                />
              </li>
            ))}
          </ul>
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
          onClose={() => setCreatedSecret(null)}
          secret={createdSecret.secret}
          url={createdSecret.url}
        />
      )}
    </main>
  );
}

// ─── Webhook Row ────────────────────────────────────────────────────────────

function WebhookRow({
  webhook,
  busy,
  onTest,
  onDelete,
}: {
  webhook: WebhookSummary;
  busy: boolean;
  onTest: () => void;
  onDelete: () => void;
}) {
  const isFailing = webhook.failureCount >= 3 && webhook.status !== "inactive";
  const statusLabel = isFailing
    ? "failing"
    : webhook.status === "active"
      ? "active"
      : "inactive";

  return (
    <Card padding="md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* Left side */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge color={statusColor(isFailing ? "failing" : webhook.status)} dot>
              {statusLabel}
            </Badge>
            {webhook.failureCount > 0 && (
              <Badge color="amber" variant="outline" size="sm">
                {webhook.failureCount} failure{webhook.failureCount === 1 ? "" : "s"}
              </Badge>
            )}
          </div>

          <div
            className="font-mono text-sm text-brand-white truncate"
            title={webhook.url}
          >
            {truncateUrl(webhook.url, 64)}
          </div>

          <div className="mt-1 text-3xs font-mono text-brand-muted">
            {webhook.id}
          </div>

          {/* Event chips */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {webhook.events.map((ev) => (
              <span
                key={ev}
                className="inline-flex items-center px-1.5 py-0.5 rounded-md font-mono text-3xs uppercase tracking-wider bg-brand-elevated text-brand-dim border border-brand-border"
              >
                {ev}
              </span>
            ))}
          </div>

          {/* Timestamps */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-3xs font-mono uppercase tracking-wider text-brand-muted">
                Last success
              </div>
              <div
                className={`mt-0.5 font-mono ${webhook.lastSuccess ? "text-brand-green" : "text-brand-muted"}`}
              >
                {relativeTime(webhook.lastSuccess)}
              </div>
            </div>
            <div>
              <div className="text-3xs font-mono uppercase tracking-wider text-brand-muted">
                Last failure
              </div>
              <div
                className={`mt-0.5 font-mono ${webhook.lastFailure ? "text-brand-amber" : "text-brand-muted"}`}
              >
                {relativeTime(webhook.lastFailure)}
              </div>
            </div>
            <div>
              <div className="text-3xs font-mono uppercase tracking-wider text-brand-muted">
                Created
              </div>
              <div className="mt-0.5 font-mono text-brand-dim">
                {relativeTime(webhook.createdAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Right side: actions */}
        <div className="flex flex-row lg:flex-col items-stretch gap-2 lg:w-44 shrink-0">
          <Link
            href={`/dashboard/webhooks/${encodeURIComponent(webhook.id)}`}
            className="inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg min-h-[32px] gap-1.5 bg-transparent border border-brand-border text-brand-dim font-medium font-body transition-all hover:border-brand-cyan/40 hover:text-brand-cyan hover:bg-brand-cyan/5"
          >
            View deliveries
          </Link>
          <Button
            size="sm"
            variant="secondary"
            onClick={onTest}
            loading={busy}
          >
            Test
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onDelete}
            loading={busy}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const snippet = `// Verify the HMAC signature on every webhook request
import { createHmac, timingSafeEqual } from "crypto";

export function verify(rawBody: string, signature: string, secret: string) {
  const expected =
    "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Express handler
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.header("X-SocialPerks-Signature") ?? "";
  if (!verify(req.body.toString("utf8"), sig, process.env.SP_WEBHOOK_SECRET!)) {
    return res.status(401).end();
  }
  const event = JSON.parse(req.body.toString("utf8"));
  // ... handle event.event and event.payload
  res.status(200).end();
});`;

  return (
    <Card padding="lg" borderColor="cyan">
      <div className="max-w-2xl">
        <p className="text-xs font-mono uppercase tracking-widest text-brand-cyan mb-2">
          Get started
        </p>
        <h2 className="font-heading text-3xl italic text-brand-white mb-3">
          No webhooks set up yet
        </h2>
        <p className="text-sm text-brand-dim leading-relaxed">
          Webhooks deliver Social Perks events to your server in real time — no
          polling, no missed beats. We sign every payload with HMAC-SHA256 and
          automatically retry failures with exponential backoff over 72 hours.
        </p>

        <div className="mt-6">
          <p className="text-3xs font-mono uppercase tracking-widest text-brand-muted mb-3">
            Why use webhooks?
          </p>
          <ul className="space-y-2 text-sm text-brand-text list-none p-0">
            <li className="flex items-start gap-2">
              <span className="text-brand-cyan mt-0.5" aria-hidden>
                ›
              </span>
              <span>
                <span className="text-brand-white font-medium">Instant.</span>{" "}
                Receive submissions, redemptions, and campaign events the moment
                they happen.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-cyan mt-0.5" aria-hidden>
                ›
              </span>
              <span>
                <span className="text-brand-white font-medium">Reliable.</span>{" "}
                We retry up to 6 times across 72 hours, with full delivery logs.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-cyan mt-0.5" aria-hidden>
                ›
              </span>
              <span>
                <span className="text-brand-white font-medium">Secure.</span>{" "}
                Every request is HMAC-signed so you can trust the source.
              </span>
            </li>
          </ul>
        </div>

        <div className="mt-6">
          <p className="text-3xs font-mono uppercase tracking-widest text-brand-muted mb-2">
            Verifying the signature (Node.js)
          </p>
          <pre className="text-3xs font-mono bg-brand-bg border border-brand-border rounded-lg p-4 overflow-x-auto text-brand-dim leading-relaxed">
            {snippet}
          </pre>
        </div>

        <div className="mt-7">
          <Button variant="primary" size="lg" onClick={onCreate}>
            Create your first webhook
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
  onSubmit: (url: string, events: string[]) => Promise<void>;
}) {
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const allEvents = useMemo(() => [...KNOWN_EVENT_TYPES], []);

  const toggle = (ev: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ev)) next.delete(ev);
      else next.add(ev);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allEvents));
  const selectNone = () => setSelected(new Set());

  const submit = async () => {
    setLocalError(null);
    if (!url.trim().startsWith("https://")) {
      setLocalError("URL must use HTTPS.");
      return;
    }
    if (selected.size === 0) {
      setLocalError("Select at least one event type.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(url.trim(), [...selected]);
      setUrl("");
      setSelected(new Set());
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed to create webhook");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create webhook" size="lg">
      <div className="space-y-5">
        <div>
          <label className="block text-3xs font-mono uppercase tracking-widest text-brand-muted mb-1.5">
            Endpoint URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/webhooks/social-perks"
            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted font-mono focus:outline-none focus:border-brand-cyan/60"
          />
          <p className="mt-1 text-3xs text-brand-muted">
            Must be HTTPS. We&apos;ll POST signed JSON payloads here.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-3xs font-mono uppercase tracking-widest text-brand-muted">
              Event types ({selected.size}/{allEvents.length})
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-3xs font-mono uppercase tracking-wider text-brand-cyan hover:text-cyan-300 transition-colors bg-transparent border-none cursor-pointer"
              >
                Select all
              </button>
              <span className="text-3xs text-brand-muted">·</span>
              <button
                type="button"
                onClick={selectNone}
                className="text-3xs font-mono uppercase tracking-wider text-brand-dim hover:text-brand-text transition-colors bg-transparent border-none cursor-pointer"
              >
                Select none
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto p-2 bg-brand-bg border border-brand-border rounded-lg">
            {allEvents.map((ev) => {
              const isSelected = selected.has(ev);
              return (
                <label
                  key={ev}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-brand-cyan/10 text-brand-cyan"
                      : "text-brand-dim hover:bg-brand-elevated"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(ev)}
                    className="accent-cyan-400"
                  />
                  <span className="font-mono text-3xs">{ev}</span>
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
            Create webhook
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
  url,
}: {
  open: boolean;
  onClose: () => void;
  secret: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);

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
    <Modal open={open} onClose={onClose} title="Webhook created" size="lg">
      <div className="space-y-4">
        <div className="rounded-lg border border-brand-amber/40 bg-brand-amber/10 p-4 text-sm text-brand-amber">
          <p className="font-semibold mb-1">Save this secret now.</p>
          <p className="text-xs leading-relaxed">
            This is the only time you&apos;ll see the full signing secret. Store it
            in your environment variables and use it to verify the
            <span className="font-mono"> X-SocialPerks-Signature </span> header
            on every request.
          </p>
        </div>

        <div>
          <label className="block text-3xs font-mono uppercase tracking-widest text-brand-muted mb-1.5">
            Endpoint
          </label>
          <div className="font-mono text-xs text-brand-dim bg-brand-bg border border-brand-border rounded-lg p-3 break-all">
            {url}
          </div>
        </div>

        <div>
          <label className="block text-3xs font-mono uppercase tracking-widest text-brand-muted mb-1.5">
            Signing secret
          </label>
          <div className="flex gap-2">
            <code className="flex-1 font-mono text-xs text-brand-cyan bg-brand-bg border border-brand-cyan/30 rounded-lg p-3 break-all">
              {secret}
            </code>
            <Button
              size="md"
              variant="secondary"
              onClick={() => void copy()}
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-brand-border">
          <Button variant="primary" size="md" onClick={onClose}>
            I&apos;ve saved the secret
          </Button>
        </div>
      </div>
    </Modal>
  );
}
