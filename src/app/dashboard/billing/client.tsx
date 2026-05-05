"use client";

import { useCallback, useEffect, useState } from "react";

interface UsageBar {
  used: number;
  limit: number | null; // null = unlimited
}

interface UsageData {
  plan: string;
  limits: {
    maxCampaigns: number | null;
    maxCompletionsPerMonth: number | null;
    aiGenerations: number | null;
    hasAnalytics: boolean;
    hasApiAccess: boolean;
    hasQrCodes: boolean;
  };
  usage: {
    month: string;
    campaigns: UsageBar;
    completions: UsageBar;
    aiGenerations: UsageBar;
  };
}

interface SubscriptionData {
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd?: number;
    plan: string;
    billingPeriod?: string;
  } | null;
  plan: string;
}

type State =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "no-business" }
  | { status: "ready"; usage: UsageData; subscription: SubscriptionData; businessId: string }
  | { status: "error"; message: string };

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  professional: "Pro",
  enterprise: "Enterprise",
};

async function readBusinessId(): Promise<string | null> {
  // Try /api/v1/auth GET to resolve the calling user's businessId without
  // hardcoding cookie parsing here. This endpoint validates the session
  // and returns the user record.
  try {
    const res = await fetch("/api/v1/auth", {
      method: "GET",
      credentials: "include",
    });
    if (res.status === 401) return null;
    const json: { success?: boolean; data?: { user?: { businessId?: string | null } } } = await res.json();
    return json.data?.user?.businessId ?? null;
  } catch {
    return null;
  }
}

async function postBilling<T>(body: Record<string, unknown>): Promise<{ ok: true; data: T } | { ok: false; status: number; code: string; message: string }> {
  const res = await fetch("/api/v1/billing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  let json: { success?: boolean; data?: T; error?: { code: string; message: string } };
  try {
    json = await res.json();
  } catch {
    return { ok: false, status: res.status, code: "INVALID_RESPONSE", message: "Server returned non-JSON" };
  }
  if (json.success && json.data !== undefined) return { ok: true, data: json.data };
  return {
    ok: false,
    status: res.status,
    code: json.error?.code ?? "UNKNOWN",
    message: json.error?.message ?? `HTTP ${res.status}`,
  };
}

export function BillingClient() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [openingPortal, setOpeningPortal] = useState(false);

  const refresh = useCallback(async () => {
    setState({ status: "loading" });
    const businessId = await readBusinessId();
    if (businessId === null) {
      // Distinguish 401 (no session) vs. session-but-no-business.
      setState({ status: "unauthenticated" });
      return;
    }
    if (businessId === "") {
      setState({ status: "no-business" });
      return;
    }

    const [usageR, subR] = await Promise.all([
      postBilling<UsageData>({ action: "get_usage", businessId }),
      postBilling<SubscriptionData>({ action: "get_subscription", businessId }),
    ]);

    if (!usageR.ok) {
      setState({ status: "error", message: usageR.message });
      return;
    }
    if (!subR.ok) {
      setState({ status: "error", message: subR.message });
      return;
    }
    setState({ status: "ready", usage: usageR.data, subscription: subR.data, businessId });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function openPortal(businessId: string) {
    setOpeningPortal(true);
    const r = await postBilling<{ url?: string }>({
      action: "create_portal",
      businessId,
      returnUrl: window.location.href,
    });
    setOpeningPortal(false);
    if (!r.ok) {
      alert(`Couldn't open the billing portal: ${r.message}`);
      return;
    }
    if (r.data.url) {
      window.location.href = r.data.url;
    }
  }

  if (state.status === "loading") {
    return <p className="text-brand-text-dim">Loading…</p>;
  }
  if (state.status === "unauthenticated") {
    return (
      <div className="rounded-lg border border-brand-border bg-brand-card p-6">
        <p className="text-brand-text mb-3">
          Sign in to your business account to manage billing.
        </p>
        <a
          href="/dashboard"
          className="inline-block px-4 py-2 bg-brand-cyan text-black font-medium rounded hover:bg-brand-cyan/90"
        >
          Go to dashboard
        </a>
      </div>
    );
  }
  if (state.status === "no-business") {
    return (
      <div className="rounded-lg border border-brand-border bg-brand-card p-6">
        <p className="text-brand-text">
          Your account isn&apos;t linked to a business yet. Sign up as a
          business from the home page to get started with billing.
        </p>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-6">
        <p className="text-red-300 mb-3">Couldn&apos;t load billing: {state.message}</p>
        <button
          onClick={() => void refresh()}
          className="text-sm text-red-200 underline hover:text-red-100"
        >
          Retry
        </button>
      </div>
    );
  }

  const { usage, subscription, businessId } = state;
  const planLabel = PLAN_LABELS[usage.plan] ?? usage.plan;
  const isPaid = usage.plan !== "free";

  return (
    <div className="space-y-8">
      {/* Current plan */}
      <section className="rounded-lg border border-brand-border bg-brand-card p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm text-brand-text-dim mb-1">Current plan</p>
            <h2 className="font-serif italic text-2xl text-brand-white">
              {planLabel}
            </h2>
            {subscription.subscription && (
              <p className="text-sm text-brand-text-dim mt-1">
                Status: {subscription.subscription.status}
                {subscription.subscription.billingPeriod
                  ? ` · Billed ${subscription.subscription.billingPeriod}`
                  : ""}
                {subscription.subscription.currentPeriodEnd
                  ? ` · Renews ${new Date(subscription.subscription.currentPeriodEnd * 1000).toLocaleDateString()}`
                  : ""}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {isPaid ? (
              <button
                onClick={() => void openPortal(businessId)}
                disabled={openingPortal}
                className="px-4 py-2 bg-brand-cyan text-black font-medium rounded hover:bg-brand-cyan/90 disabled:opacity-50"
              >
                {openingPortal ? "Opening…" : "Manage subscription"}
              </button>
            ) : (
              <a
                href="/pricing"
                className="px-4 py-2 bg-brand-cyan text-black font-medium rounded hover:bg-brand-cyan/90 text-center"
              >
                Upgrade
              </a>
            )}
          </div>
        </div>

        {!isPaid && (
          <p className="text-sm text-brand-text-dim border-t border-brand-border pt-4">
            You&apos;re on the free tier. Upgrade to unlock more campaigns,
            higher submission limits, AI generation, and analytics.
          </p>
        )}
      </section>

      {/* Usage */}
      <section className="rounded-lg border border-brand-border bg-brand-card p-6">
        <h2 className="font-serif italic text-xl text-brand-white mb-1">
          Usage this month
        </h2>
        <p className="text-sm text-brand-text-dim mb-6">
          Period: {usage.usage.month}
        </p>
        <div className="space-y-5">
          <UsageRow
            label="Campaigns"
            used={usage.usage.campaigns.used}
            limit={usage.usage.campaigns.limit}
            unit="campaigns"
          />
          <UsageRow
            label="Completions"
            used={usage.usage.completions.used}
            limit={usage.usage.completions.limit}
            unit="this month"
          />
          <UsageRow
            label="AI generations"
            used={usage.usage.aiGenerations.used}
            limit={usage.usage.aiGenerations.limit}
            unit="this month"
          />
        </div>
      </section>

      {/* Plan features */}
      <section className="rounded-lg border border-brand-border bg-brand-card p-6">
        <h2 className="font-serif italic text-xl text-brand-white mb-4">
          Plan features
        </h2>
        <ul className="space-y-2 text-sm">
          <FeatureRow label="Analytics dashboard" enabled={usage.limits.hasAnalytics} />
          <FeatureRow label="API access" enabled={usage.limits.hasApiAccess} />
          <FeatureRow label="QR code campaigns" enabled={usage.limits.hasQrCodes} />
        </ul>
        {!isPaid && (
          <a
            href="/pricing"
            className="inline-block mt-5 text-sm text-brand-cyan hover:underline"
          >
            See all plan features →
          </a>
        )}
      </section>
    </div>
  );
}

function UsageRow({
  label,
  used,
  limit,
  unit,
}: {
  label: string;
  used: number;
  limit: number | null;
  unit: string;
}) {
  const unlimited = limit === null;
  const ratio = unlimited ? 0 : Math.min(1, used / Math.max(1, limit));
  const overLimit = !unlimited && used >= (limit ?? 0);
  const nearLimit = !unlimited && ratio >= 0.8;
  const barColor = overLimit
    ? "bg-red-500"
    : nearLimit
      ? "bg-amber-500"
      : "bg-brand-cyan";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5 text-sm">
        <span className="text-brand-text">{label}</span>
        <span className="text-brand-text-dim">
          {used.toLocaleString()}
          {unlimited ? "" : ` / ${limit?.toLocaleString()}`}{" "}
          <span className="text-xs">{unit}</span>
        </span>
      </div>
      <div className="h-2 bg-black/40 rounded-full overflow-hidden">
        {unlimited ? (
          <div className="h-full w-1/3 bg-emerald-500/40 rounded-full" />
        ) : (
          <div
            className={`h-full ${barColor} rounded-full transition-all`}
            style={{ width: `${ratio * 100}%` }}
          />
        )}
      </div>
      {overLimit && (
        <p className="mt-1.5 text-xs text-red-300">
          You&apos;ve hit this limit.{" "}
          <a href="/pricing" className="underline hover:text-red-200">
            Upgrade →
          </a>
        </p>
      )}
      {!overLimit && nearLimit && (
        <p className="mt-1.5 text-xs text-amber-300">
          You&apos;re close to this limit.{" "}
          <a href="/pricing" className="underline hover:text-amber-200">
            Upgrade →
          </a>
        </p>
      )}
    </div>
  );
}

function FeatureRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className={enabled ? "text-emerald-400" : "text-brand-text-dim"}>
        {enabled ? "✓" : "—"}
      </span>
      <span className={enabled ? "text-brand-text" : "text-brand-text-dim line-through"}>
        {label}
      </span>
    </li>
  );
}
