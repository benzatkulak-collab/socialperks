"use client";

import { Fragment, useEffect, useState } from "react";
import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";
import { track } from "@/lib/analytics";

// ─── Live stats hook ────────────────────────────────────────────────────────
// Fetches the aggregate platform stats from /api/v1/stats/public on mount
// and exposes them to the trust strip. Server-side endpoint caches for 5
// minutes and floors values, so this is both privacy-preserving and
// network-cheap. Falls back to "hidden" silently if the call fails or the
// platform is below the minimum activity threshold (avoids "2 businesses
// use this" optics).
interface LiveStats {
  show: boolean;
  campaigns: number;
  businesses: number;
  active: number;
}

function useLiveStats(): LiveStats | null {
  const [stats, setStats] = useState<LiveStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    fetch("/api/v1/stats/public", { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled || !body?.data) return;
        const d = body.data as Partial<LiveStats>;
        if (
          typeof d.show === "boolean" &&
          typeof d.campaigns === "number" &&
          typeof d.businesses === "number" &&
          typeof d.active === "number"
        ) {
          setStats({
            show: d.show,
            campaigns: d.campaigns,
            businesses: d.businesses,
            active: d.active,
          });
        }
      })
      .catch(() => {
        // Network/abort/decode failures all collapse to "no stats"
        // which hides the strip — same as below-threshold case.
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  return stats;
}

interface PricingTier {
  /** Marketing display name. */
  name: string;
  /**
   * Billing engine plan key — must match a key in src/lib/billing/store.ts PLANS.
   * `null` means this is a marketing-only tier (e.g. Free) that doesn't
   * trigger Stripe checkout.
   */
  planKey: "starter" | "professional" | "enterprise" | null;
  price: string;
  /** Real annual total (matches Stripe + billing/store.ts); shown per-month on the annual toggle. */
  annualPrice?: number;
  period: string;
  description: string;
  features: string[];
  cta: string;
  ctaSubtext?: string;
  popular: boolean;
  accent: string;
  badge?: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: "Free",
    planKey: null,
    price: "$0",
    period: "forever",
    description: "Run your first campaign and see results.",
    features: [
      "1 active campaign",
      "Up to 50 completions/month",
      "Basic analytics",
      "Email support",
    ],
    cta: "Start Free",
    ctaSubtext: "No credit card",
    popular: false,
    accent: "text-brand-dim",
  },
  {
    name: "Starter",
    planKey: "starter",
    price: "$29",
    annualPrice: 290,
    period: "/month",
    description: "For solo owners ready to grow.",
    features: [
      "10 active campaigns",
      "500 completions/month",
      "Full analytics + CSV export",
      "QR codes for your counter",
      "Email support",
    ],
    cta: "Get Started",
    ctaSubtext: "30-day money-back",
    popular: false,
    accent: "text-brand-cyan",
  },
  {
    name: "Pro",
    planKey: "professional",
    price: "$49",
    annualPrice: 490,
    period: "/month",
    description: "Everything you need to scale.",
    features: [
      "50 active campaigns",
      "5,000 completions/month",
      "Advanced analytics + smart recommendations",
      "API access",
      "Priority verification",
      "Priority support",
    ],
    cta: "Get Started",
    ctaSubtext: "30-day money-back",
    popular: true,
    accent: "text-brand-cyan",
    badge: "Most Popular",
  },
  {
    name: "Enterprise",
    planKey: "enterprise",
    price: "Custom",
    period: "",
    description: "Multiple locations, custom needs.",
    features: [
      "Unlimited campaigns",
      "Multi-location management",
      "Team permissions & role controls",
      "Dedicated account manager",
      "Custom integrations + SLA",
    ],
    cta: "Talk to Sales →",
    popular: false,
    accent: "text-brand-amber",
  },
];

// ─── "Works with" platform logos row ────────────────────────────────────────
// Same emoji vocabulary as the onboarding wizard and platforms.ts. Provides
// immediate visual confirmation of what channels Social Perks supports
// without forcing a buyer to dig through features lists or FAQs.
const WORKS_WITH = [
  { icon: "📸", name: "Instagram" },
  { icon: "🎬", name: "TikTok" },
  { icon: "👍", name: "Facebook" },
  { icon: "📺", name: "YouTube" },
  { icon: "✍️", name: "X" },
  { icon: "💼", name: "LinkedIn" },
  { icon: "📌", name: "Pinterest" },
];

export function PricingSection() {
  // Default to annual: 20% saving is real revenue uplift per signup; plus
  // the visible "Save 20%" badge becomes immediate social-proof of value.
  const [annual, setAnnual] = useState(true);
  const liveStats = useLiveStats();

  // Track pricing CTA clicks via event delegation — captures plan +
  // period from data-* attributes the CTAs already emit. Cheaper than
  // wiring an onClick on every <a>, and works for both Free signup and
  // paid checkout handoffs. Fires through src/lib/analytics.ts which
  // no-ops if PostHog isn't loaded.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-plan]");
      if (!target) return;
      const plan = target.dataset.plan ?? "unknown";
      const period = target.dataset.period ?? "monthly";
      track("pricing_cta_click", { plan, period });
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <section
      id="pricing"
      className="relative bg-brand-bg py-20 sm:py-28 lg:py-32"
      aria-labelledby="pricing-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <AnimateOnScroll animation="fade-up" className="mb-12 text-center sm:mb-16">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Pricing
          </p>
          <h2
            id="pricing-heading"
            className="font-heading text-[clamp(1.75rem,3vw,3rem)] italic text-brand-white leading-tight"
          >
            Turn one Instagram ad&apos;s budget into 50 customer posts
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim leading-relaxed sm:text-lg">
            Start free. Upgrade when you outgrow it. Cancel anytime — no phone calls, no retention scripts.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span
              className={`text-sm transition-colors ${
                !annual ? "text-brand-white font-medium" : "text-brand-muted"
              }`}
            >
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative h-7 w-12 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg ${
                annual
                  ? "border-brand-cyan/40 bg-brand-cyan/20"
                  : "border-brand-border bg-brand-surface"
              }`}
              role="switch"
              aria-checked={annual}
              aria-label="Toggle annual billing"
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-brand-white shadow-sm transition-transform duration-200 ${
                  annual ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
            <span
              className={`text-sm transition-colors ${
                annual ? "text-brand-white font-medium" : "text-brand-muted"
              }`}
            >
              Annual
            </span>
            {annual && (
              <span className="ml-1 rounded-full bg-brand-green/10 px-2.5 py-0.5 text-xs font-semibold text-brand-green">
                2 months free
              </span>
            )}
          </div>
        </AnimateOnScroll>

        {/* "Works with" logo row — answers "does this support my platform?"
            before the buyer has to read a single feature bullet. Trust by
            association with channels they already know. */}
        <AnimateOnScroll animation="fade-up" delay={80} className="mb-10">
          <p className="text-center text-xs font-mono uppercase tracking-[0.15em] text-brand-muted mb-4">
            Works with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-8">
            {WORKS_WITH.map((p) => (
              <span
                key={p.name}
                className="flex items-center gap-2 text-sm text-brand-dim"
                title={p.name}
              >
                <span className="text-lg" aria-hidden="true">{p.icon}</span>
                <span className="hidden sm:inline">{p.name}</span>
              </span>
            ))}
          </div>
        </AnimateOnScroll>

        {/* Live stats strip — pulled from /api/v1/stats/public.
            Hidden by the endpoint when the platform is below the
            minimum activity threshold so we don't broadcast "we have
            3 customers" during cold-start. */}
        {liveStats?.show && (
          <div className="mb-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
            <span className="flex items-baseline gap-2">
              <span className="font-heading text-xl italic text-brand-cyan">
                {liveStats.campaigns.toLocaleString()}+
              </span>
              <span className="text-brand-dim">campaigns launched</span>
            </span>
            <span className="hidden sm:inline-block w-px h-4 bg-brand-border self-center" aria-hidden="true" />
            <span className="flex items-baseline gap-2">
              <span className="font-heading text-xl italic text-brand-cyan">
                {liveStats.businesses.toLocaleString()}+
              </span>
              <span className="text-brand-dim">businesses using Social Perks</span>
            </span>
            {liveStats.active > 0 && (
              <>
                <span className="hidden sm:inline-block w-px h-4 bg-brand-border self-center" aria-hidden="true" />
                <span className="flex items-baseline gap-2">
                  <span className="font-heading text-xl italic text-brand-green">
                    {liveStats.active.toLocaleString()}+
                  </span>
                  <span className="text-brand-dim">live right now</span>
                </span>
              </>
            )}
          </div>
        )}

        {/* Trust strip */}
        <div className="mb-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-brand-muted">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-green" aria-hidden="true" />
            FTC-compliant by default
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" aria-hidden="true" />
            Cancel anytime
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-amber" aria-hidden="true" />
            Onboarding the first 10 coffee shops by hand
          </span>
        </div>

        {/* Pricing cards — 4 tiers now (Free / Starter / Pro / Enterprise). */}
        <AnimateOnScroll
          animation="fade-up"
          stagger
          staggerDelay={100}
          className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5 lg:gap-5 items-start"
        >
          {PRICING_TIERS.map((tier) => {
            const monthlyAmount =
              tier.price !== "$0" && tier.price !== "Custom"
                ? parseInt(tier.price.replace("$", ""))
                : null;
            const annualMonthlyAmount =
              tier.annualPrice != null ? Math.round(tier.annualPrice / 12) : null;
            const displayPrice =
              annual && annualMonthlyAmount !== null
                ? `$${annualMonthlyAmount}`
                : tier.price;
            const annualSavings =
              annual && monthlyAmount !== null && tier.annualPrice != null
                ? monthlyAmount * 12 - tier.annualPrice
                : 0;

            return (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-xl border ${
                  tier.popular
                    ? "border-brand-cyan/40 bg-brand-surface/60 shadow-lg shadow-brand-cyan/5"
                    : "border-brand-border/40 bg-brand-surface/30"
                } p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-border/70 hover:shadow-lg hover:shadow-brand-bg/50 sm:p-6`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-brand-cyan px-4 py-1 text-xs font-semibold text-brand-bg shadow-md shadow-brand-cyan/20 whitespace-nowrap">
                      {tier.badge}
                    </span>
                  </div>
                )}

                {/* Tier name */}
                <p className={`mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.15em] ${tier.accent} sm:text-xs`}>
                  {tier.name}
                </p>

                {/* Price */}
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="font-heading text-3xl text-brand-white sm:text-4xl">
                    {displayPrice}
                  </span>
                  {tier.period && (
                    <span className="text-sm text-brand-muted">
                      {tier.period}
                    </span>
                  )}
                </div>

                {annualSavings > 0 && (
                  <p className="mb-3 text-xs font-medium text-brand-green">
                    Save ${annualSavings}/yr vs. monthly
                  </p>
                )}

                {/* Description */}
                <p className="mb-5 text-sm text-brand-dim leading-relaxed">{tier.description}</p>

                {/* Divider */}
                <div className="mb-5 h-px bg-brand-border/40" />

                {/* Features */}
                <ul className="mb-6 flex-1 space-y-2.5" role="list">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${tier.popular ? "bg-brand-cyan/10 text-brand-cyan" : "bg-brand-muted/10 text-brand-muted"}`}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      <span className="text-sm text-brand-text">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {/*
                  Paid tiers route through signup → plan-intent → the in-app
                  create_checkout path (billing/route.ts), which attaches the
                  businessId metadata the webhook requires to provision the
                  subscription. Linking straight to a static Stripe Payment Link
                  here would capture money but provision NOTHING (the webhook
                  drops events with no businessId), so we MUST go through signup.
                */}
                <a
                  href={
                    tier.planKey === null
                      ? "/dashboard#signup"
                      : tier.planKey === "enterprise"
                        ? "/contact?intent=enterprise"
                        : `/dashboard#signup?plan=${tier.planKey}&period=${annual ? "annual" : "monthly"}`
                  }
                  className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg ${
                    tier.popular
                      ? "bg-brand-cyan text-brand-bg hover:bg-brand-cyan/90 hover:shadow-md hover:shadow-brand-cyan/20 focus-visible:ring-brand-cyan/50"
                      : "border border-brand-border bg-brand-surface text-brand-text hover:border-brand-subtle hover:bg-brand-elevated focus-visible:ring-brand-cyan/30"
                  }`}
                  aria-label={`${tier.cta} - ${tier.name} plan`}
                  data-plan={tier.planKey ?? "free"}
                  data-period={annual ? "annual" : "monthly"}
                >
                  {tier.cta}
                </a>

                {/* CTA subtext — sets cancel/refund expectation right at
                    the click moment, where conversion lives or dies. */}
                {tier.ctaSubtext && (
                  <p className="mt-2 text-center text-xs text-brand-muted">
                    {tier.ctaSubtext}
                  </p>
                )}
              </div>
            );
          })}
        </AnimateOnScroll>

        {/* Comparison table — for the buyer who wants to scan the full
            picture side-by-side before clicking. Always under the cards
            so it doesn't compete for the primary action above the fold. */}
        <ComparisonTable annual={annual} />

        {/* Bottom note */}
        <p className="mt-12 text-center text-sm text-brand-muted">
          All plans include FTC-compliant disclosures, SSL encryption, and 99.9% uptime.
        </p>

        {/* Talk-to-founder track for high-intent prospects who want a real
            conversation before buying. Lower friction than the signup form
            and signals "we're early — talk to a human" which is a feature
            for the first 10 customers. */}
        <p className="mt-4 text-center text-sm text-brand-dim">
          Have questions before you sign up?{" "}
          <a
            href="/contact?intent=questions"
            className="text-brand-cyan underline-offset-2 hover:underline"
          >
            Talk to the founder →
          </a>
        </p>

        {/* FAQ — addresses the most common objection points blocking signup.
            Also emits FAQPage schema so it can earn a rich result in Google. */}
        <PricingFaq />
      </div>
    </section>
  );
}

// ─── Comparison Table ───────────────────────────────────────────────────────

interface ComparisonRow {
  feature: string;
  free: string | boolean;
  starter: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
  group?: string;
}

const COMPARISON: ComparisonRow[] = [
  // Campaigns & usage
  { group: "Campaigns & usage", feature: "Active campaigns", free: "1", starter: "10", pro: "50", enterprise: "Unlimited" },
  { feature: "Completions per month", free: "50", starter: "500", pro: "5,000", enterprise: "Unlimited" },
  { feature: "Marketing actions available", free: "5", starter: "20", pro: "All 107", enterprise: "All 107" },
  { feature: "Campaign suggestions", free: "3/mo", starter: "50/mo", pro: "500/mo", enterprise: "Unlimited" },
  // Analytics
  { group: "Analytics", feature: "Basic analytics dashboard", free: true, starter: true, pro: true, enterprise: true },
  { feature: "Advanced analytics + smart recommendations", free: false, starter: false, pro: true, enterprise: true },
  { feature: "CSV export", free: false, starter: true, pro: true, enterprise: true },
  // Features
  { group: "Features", feature: "QR codes for your counter", free: false, starter: true, pro: true, enterprise: true },
  { feature: "API access", free: false, starter: false, pro: true, enterprise: true },
  { feature: "Multi-location management", free: false, starter: false, pro: false, enterprise: true },
  { feature: "Team permissions & role controls", free: false, starter: false, pro: false, enterprise: true },
  { feature: "Custom integrations", free: false, starter: false, pro: false, enterprise: true },
  // Support
  { group: "Support", feature: "Email support", free: true, starter: true, pro: true, enterprise: true },
  { feature: "Priority support", free: false, starter: false, pro: true, enterprise: true },
  { feature: "Dedicated account manager", free: false, starter: false, pro: false, enterprise: true },
  { feature: "SLA guarantee", free: false, starter: false, pro: false, enterprise: true },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-green/10 text-brand-green text-xs" aria-label="Included">
        ✓
      </span>
    );
  }
  if (value === false) {
    return <span className="text-brand-muted/60 text-sm" aria-label="Not included">—</span>;
  }
  return <span className="text-sm font-medium text-brand-white">{value}</span>;
}

function ComparisonTable({ annual }: { annual: boolean }) {
  return (
    <AnimateOnScroll animation="fade-up" delay={120} className="mx-auto mt-16 max-w-5xl">
      <details className="group rounded-2xl border border-brand-border/40 bg-brand-surface/20">
        <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 sm:px-6 list-none [&::-webkit-details-marker]:hidden hover:bg-brand-surface/30 transition-colors">
          <div>
            <h3 className="font-heading text-lg italic text-brand-white">
              Compare plans, feature by feature
            </h3>
            <p className="text-xs text-brand-muted mt-0.5">
              {annual ? "Annual pricing shown" : "Monthly pricing shown"} · 16 features
            </p>
          </div>
          <span
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-border text-brand-cyan transition-transform group-open:rotate-45"
            aria-hidden="true"
          >
            +
          </span>
        </summary>

        <div className="overflow-x-auto border-t border-brand-border/40">
          <table className="w-full text-left">
            <thead className="bg-brand-surface/40">
              <tr>
                <th scope="col" className="px-4 py-3 text-xs font-mono uppercase tracking-wide text-brand-muted sm:px-6">
                  Feature
                </th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-mono uppercase tracking-wide text-brand-muted">
                  Free
                </th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-mono uppercase tracking-wide text-brand-cyan">
                  Starter
                </th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-mono uppercase tracking-wide text-brand-cyan">
                  Pro
                </th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-mono uppercase tracking-wide text-brand-amber">
                  Enterprise
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <Fragment key={`row-${i}`}>
                  {row.group && (
                    <tr className="bg-brand-bg/40">
                      <td colSpan={5} className="px-4 py-2 sm:px-6 text-xs font-mono uppercase tracking-wide text-brand-muted">
                        {row.group}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-brand-border/30">
                    <td className="px-4 py-3 text-sm text-brand-text sm:px-6">{row.feature}</td>
                    <td className="px-3 py-3 text-center"><Cell value={row.free} /></td>
                    <td className="px-3 py-3 text-center"><Cell value={row.starter} /></td>
                    <td className="px-3 py-3 text-center"><Cell value={row.pro} /></td>
                    <td className="px-3 py-3 text-center"><Cell value={row.enterprise} /></td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </AnimateOnScroll>
  );
}

// ─── FAQ ────────────────────────────────────────────────────────────────────

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is there really a free tier?",
    a: "Yes. Run one campaign with up to 50 completions per month, forever. No credit card. We only charge when you outgrow it.",
  },
  {
    q: "What if I cancel?",
    a: "Cancel anytime from your dashboard in two clicks. No phone calls, no retention scripts. Your data stays accessible for export for 30 days after.",
  },
  {
    q: "Do I get a refund if it doesn't work?",
    a: "30-day money-back guarantee on Starter and Pro. If your customers aren't posting, email us within 30 days of your first paid month and we'll refund in full.",
  },
  {
    q: "How does the FTC compliance piece work?",
    a: "Every campaign auto-injects the platform-specific disclosure (#ad on Instagram, branded-content tag on TikTok, etc.) into the customer's posting flow. You can't accidentally launch a non-compliant campaign — the system blocks it.",
  },
  {
    q: "Why don't you support paying for Google reviews?",
    a: "Google's Terms of Service prohibit incentivized reviews — same with Yelp and TripAdvisor. The platform actively blocks these to protect your account from being suspended. We focus on Instagram, TikTok, Facebook, and other channels where incentivization is allowed with proper disclosure.",
  },
  {
    q: "What's the difference between Starter and Pro?",
    a: "Starter (10 campaigns, 500 completions/mo) is for a single solo owner who's launching a few campaigns at a time. Pro (50 campaigns, 5,000 completions/mo) adds smart recommendations, API access, and priority support — the right fit once you're running campaigns continuously or wiring Social Perks into your own tools.",
  },
  {
    q: "What if I have multiple locations?",
    a: "That's the Enterprise tier. Multi-location dashboard, team permissions and role controls, brand-compliance review across stores, and a dedicated account manager. Reach out via Contact.",
  },
];

function PricingFaq() {
  return (
    <div className="mx-auto mt-20 max-w-3xl">
      <h3 className="text-center font-heading text-2xl italic text-brand-white sm:text-3xl">
        Questions
      </h3>
      <dl className="mt-8 divide-y divide-brand-border/40 rounded-2xl border border-brand-border/40 bg-brand-surface/30">
        {FAQ.map((item, i) => (
          <details
            key={item.q}
            className="group p-5 sm:p-6 [&[open]>summary>span:last-child]:rotate-45"
            open={i === 0}
          >
            <summary className="flex cursor-pointer items-start justify-between gap-4 text-left list-none [&::-webkit-details-marker]:hidden">
              <dt className="font-body text-base font-semibold text-brand-white sm:text-lg">
                {item.q}
              </dt>
              <span
                className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-border text-brand-cyan transition-transform"
                aria-hidden="true"
              >
                +
              </span>
            </summary>
            <dd className="mt-3 text-sm leading-relaxed text-brand-dim sm:text-base">
              {item.a}
            </dd>
          </details>
        ))}
      </dl>

      {/* FAQPage JSON-LD — eligible for Google rich result */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.a,
              },
            })),
          }),
        }}
      />
    </div>
  );
}
