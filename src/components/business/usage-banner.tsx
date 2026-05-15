"use client";

/**
 * UsageBanner — proactive upgrade prompt that surfaces BEFORE the user
 * hits a hard plan limit and gets a 403.
 *
 * Reads /api/v1/billing { action: "get_usage" } on mount. Renders one of
 * four variants depending on plan + current usage:
 *
 *   - "hidden"     — Pro/Enterprise with comfortable headroom; we don't
 *                    pester paying customers about upgrades.
 *   - "informational" — Free plan, low usage. Subtle "On Free — Starter
 *                    starts at $29" callout. Establishes that there's a
 *                    next step without being pushy.
 *   - "warning"    — Any plan, 80–99% of any limit. Amber elevation.
 *   - "blocking"   — Any plan, ≥100% of any limit. Red elevation with a
 *                    direct upgrade CTA — same surface plan-limit-modal
 *                    pops on a server 403, but visible without having to
 *                    hit the wall first.
 *
 * Why this exists: PlanLimitModal is reactive (server 403 → modal). It
 * surfaces upgrade *after* the user has been blocked. Most upgrade
 * revenue comes from people who see the limit coming and convert before
 * hitting it. This component is that earlier surface.
 */

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/csrf-fetch";
import { track } from "@/lib/analytics";

interface UsageSlot {
  used: number;
  limit: number | null; // null = unlimited
}

interface UsageData {
  plan: string;
  usage: {
    month: string;
    campaigns: UsageSlot;
    completions: UsageSlot;
    aiGenerations: UsageSlot;
  };
}

type Variant = "hidden" | "informational" | "warning" | "blocking";

export interface UsageBannerProps {
  businessId: string;
  plan?: string;
}

function pctUsed(slot: UsageSlot): number {
  if (slot.limit === null) return 0;
  if (slot.limit <= 0) return 0;
  return Math.min(1, slot.used / slot.limit);
}

function pickVariant(data: UsageData): Variant {
  const slots = [data.usage.campaigns, data.usage.completions];
  const maxPct = Math.max(...slots.map(pctUsed));
  if (maxPct >= 1) return "blocking";
  if (maxPct >= 0.8) return "warning";
  // Always show something for Free so the next step is obvious. Paid
  // users with comfortable headroom see nothing — no upsell pressure.
  if (data.plan === "free") return "informational";
  return "hidden";
}

function findTriggeringSlot(data: UsageData): {
  name: "campaigns" | "completions" | null;
  slot: UsageSlot;
} {
  const c = data.usage.campaigns;
  const m = data.usage.completions;
  if (pctUsed(c) >= 0.8 && pctUsed(c) >= pctUsed(m)) return { name: "campaigns", slot: c };
  if (pctUsed(m) >= 0.8) return { name: "completions", slot: m };
  return { name: null, slot: c };
}

function nextPlan(currentPlan: string): { key: string; label: string; price: string } {
  if (currentPlan === "free") return { key: "starter", label: "Starter", price: "$29/mo" };
  if (currentPlan === "starter") return { key: "professional", label: "Pro", price: "$49/mo" };
  // Pro hitting limits → Enterprise (talk-to-sales). Same for any unknown plan.
  return { key: "enterprise", label: "Enterprise", price: "Custom" };
}

export function UsageBanner({ businessId, plan: planProp }: UsageBannerProps) {
  const [data, setData] = useState<UsageData | null>(null);

  useEffect(() => {
    if (!businessId) return;
    const ac = new AbortController();
    apiFetch("/api/v1/billing", {
      method: "POST",
      signal: ac.signal,
      body: JSON.stringify({ action: "get_usage", businessId }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!body?.data) return;
        setData(body.data as UsageData);
      })
      .catch(() => {
        // Fail-soft: if /billing is unavailable, hide the banner. No
        // upgrade-prompt is better than a broken upgrade-prompt.
      });
    return () => ac.abort();
  }, [businessId]);

  if (!data) return null;
  const variant = pickVariant(data);
  if (variant === "hidden") return null;

  const upsell = nextPlan(planProp ?? data.plan);
  const trigger = findTriggeringSlot(data);
  const upgradeHref = `/pricing#${upsell.key}`;

  const tone =
    variant === "blocking"
      ? {
          border: "border-brand-red/40",
          bg: "bg-brand-red/5",
          accent: "text-brand-red",
          bar: "bg-brand-red",
        }
      : variant === "warning"
        ? {
            border: "border-brand-amber/40",
            bg: "bg-brand-amber/5",
            accent: "text-brand-amber",
            bar: "bg-brand-amber",
          }
        : {
            border: "border-brand-cyan/30",
            bg: "bg-brand-cyan/5",
            accent: "text-brand-cyan",
            bar: "bg-brand-cyan",
          };

  const headline =
    variant === "blocking"
      ? trigger.name === "campaigns"
        ? "You're at your campaign limit"
        : "You're at your monthly completion limit"
      : variant === "warning"
        ? trigger.name === "campaigns"
          ? "You're approaching your campaign limit"
          : "You're approaching your monthly completion limit"
        : "You're on Social Perks Free";

  const body =
    variant === "blocking"
      ? `Upgrade to ${upsell.label} (${upsell.price}) to keep launching campaigns.`
      : variant === "warning"
        ? trigger.slot.limit !== null
          ? `${trigger.slot.used} of ${trigger.slot.limit} used. ${upsell.label} (${upsell.price}) raises the cap.`
          : `${upsell.label} (${upsell.price}) raises the cap.`
        : `Step up to ${upsell.label} (${upsell.price}) for ${
            upsell.key === "starter"
              ? "10 campaigns, 500 completions/mo, full analytics, and QR codes."
              : "more headroom and advanced features."
          }`;

  return (
    <div className={`mb-6 rounded-xl border ${tone.border} ${tone.bg} p-4 sm:p-5`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`font-mono text-[11px] uppercase tracking-[0.15em] ${tone.accent} mb-1`}>
            {variant === "blocking" ? "Action required" : variant === "warning" ? "Heads up" : "Plan"}
          </p>
          <p className="text-sm font-semibold text-brand-white">{headline}</p>
          <p className="text-xs text-brand-dim mt-1 leading-relaxed">{body}</p>

          {/* Progress bar — only shown when we have a numeric limit to
              measure against, and only for the highest-utilized slot
              that matters. Pure visual signal; doesn't drive logic. */}
          {trigger.slot.limit !== null && variant !== "informational" && (
            <div className="mt-3 h-1.5 w-full rounded-full bg-brand-bg/60 overflow-hidden">
              <div
                className={`h-full ${tone.bar} transition-all duration-500`}
                style={{ width: `${Math.round(pctUsed(trigger.slot) * 100)}%` }}
                aria-label={`${trigger.slot.used} of ${trigger.slot.limit} used`}
              />
            </div>
          )}
        </div>

        <a
          href={upgradeHref}
          onClick={() => {
            track("pricing_cta_click", {
              plan: upsell.key,
              period: "monthly",
              source: `usage_banner_${variant}`,
            });
          }}
          className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg ${
            variant === "blocking"
              ? "bg-brand-red text-brand-bg hover:bg-brand-red/90 focus-visible:ring-brand-red/50"
              : variant === "warning"
                ? "bg-brand-amber text-brand-bg hover:bg-brand-amber/90 focus-visible:ring-brand-amber/50"
                : "bg-brand-cyan text-brand-bg hover:bg-brand-cyan/90 focus-visible:ring-brand-cyan/50"
          }`}
          data-plan={upsell.key}
          data-period="monthly"
        >
          {variant === "blocking" ? `Upgrade to ${upsell.label}` : `See ${upsell.label}`}
        </a>
      </div>
    </div>
  );
}

// Card import preserved in case future variants want the brand Card
// chrome. Currently we render a plain div to keep the banner low-key
// — the tone color already does the visual work.
void Card;
