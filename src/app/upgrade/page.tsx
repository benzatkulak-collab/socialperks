"use client";

/**
 * /upgrade — Pricing page with Pro ($49/mo) and Enterprise ($199/mo) plans.
 *
 * Hits POST /api/v1/billing/checkout to create a Stripe Checkout Session and
 * redirects the browser to the returned URL.
 */

import { useEffect, useMemo, useState } from "react";

type Plan = "pro" | "enterprise";
type Interval = "monthly" | "annual";

interface PlanDef {
  id: Plan;
  name: string;
  tagline: string;
  monthly: number;
  features: string[];
  popular?: boolean;
  cta: string;
}

const PLANS: PlanDef[] = [
  {
    id: "pro",
    name: "Pro",
    tagline: "For growing businesses",
    monthly: 49,
    popular: true,
    cta: "Upgrade to Pro",
    features: [
      "Unlimited campaigns",
      "All 107 marketing actions",
      "Up to 500 active customers/mo",
      "Advanced analytics dashboard",
      "AI campaign generation",
      "Custom branded perk pages",
      "Priority email + chat support",
      "API access (read + write)",
      "FTC compliance automation",
      "Embeddable widget",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Multi-location & high volume",
    monthly: 199,
    cta: "Upgrade to Enterprise",
    features: [
      "Everything in Pro",
      "Unlimited customers",
      "Multi-location management",
      "Brand compliance controls",
      "SSO + audit logs",
      "Dedicated account manager",
      "Custom integrations",
      "99.9% uptime SLA",
      "White-label perk widget",
      "Quarterly strategy reviews",
    ],
  },
];

function annualPrice(monthly: number): number {
  // 20% off annual — display as monthly equivalent
  return Math.round(monthly * 12 * 0.8);
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

export default function UpgradePage(): JSX.Element {
  const [interval, setInterval] = useState<Interval>("monthly");
  const [loading, setLoading] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [onTrial, setOnTrial] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("cancelled") === "1") setCancelled(true);
    // Naive trial detection — real app reads from useAuth/subscription store.
    try {
      const trialFlag = window.localStorage.getItem("sp-on-trial");
      if (trialFlag === "true" || trialFlag === null) setOnTrial(true);
    } catch {
      setOnTrial(true);
    }
  }, []);

  async function handleUpgrade(plan: Plan): Promise<void> {
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });
      const data = await res.json();
      if (!res.ok || !data?.data?.url) {
        const message =
          data?.error?.message ??
          data?.message ??
          "Could not start checkout. Please try again.";
        throw new Error(message);
      }
      window.location.href = data.data.url as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
      setLoading(null);
    }
  }

  const savings = useMemo(
    () => PLANS.map((p) => p.monthly * 12 - annualPrice(p.monthly)),
    []
  );

  return (
    <div className="min-h-screen bg-[#0C0F1A] text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          {onTrial && (
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Currently on free trial
            </div>
          )}
          <h1
            className="text-5xl md:text-6xl italic mb-4"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Turn customers into your marketing team
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Pick a plan that fits. Upgrade or downgrade anytime. Pro-rated to
            the second.
          </p>
          {cancelled && (
            <div className="mt-6 inline-block px-4 py-2 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-200 text-sm">
              Checkout cancelled. No charges were made.
            </div>
          )}
        </div>

        {/* Interval toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1 rounded-full border border-white/10 bg-white/5">
            <button
              type="button"
              onClick={() => setInterval("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                interval === "monthly"
                  ? "bg-cyan-400 text-[#0C0F1A]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("annual")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${
                interval === "annual"
                  ? "bg-cyan-400 text-[#0C0F1A]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Annual
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 uppercase tracking-wider">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 max-w-2xl mx-auto px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 text-sm text-center">
            {error}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {PLANS.map((plan, idx) => {
            const showAnnual = interval === "annual";
            const monthlyDisplay = showAnnual
              ? Math.round(annualPrice(plan.monthly) / 12)
              : plan.monthly;
            const borderColor = plan.popular
              ? "border-cyan-400/60"
              : "border-white/10";
            const leftAccent = plan.popular ? "bg-cyan-400" : "bg-white/20";
            const buttonClass = plan.popular
              ? "bg-cyan-400 text-[#0C0F1A] hover:bg-cyan-300"
              : "bg-white/10 text-white hover:bg-white/20 border border-white/10";

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border ${borderColor} bg-white/[0.02] p-8 transition hover:-translate-y-1 hover:bg-white/[0.04]`}
              >
                <span
                  className={`absolute left-0 top-6 bottom-6 w-1 rounded-r ${leftAccent}`}
                />
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-cyan-400 text-[#0C0F1A] text-[11px] font-semibold uppercase tracking-wider">
                    Most popular
                  </div>
                )}

                <div className="mb-6">
                  <h2
                    className="text-3xl mb-1 italic"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {plan.name}
                  </h2>
                  <p className="text-sm text-white/50">{plan.tagline}</p>
                </div>

                <div className="mb-6 flex items-baseline gap-2">
                  <span
                    className="text-5xl font-semibold"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {formatMoney(monthlyDisplay)}
                  </span>
                  <span className="text-white/50 text-sm">/mo</span>
                </div>
                {showAnnual && (
                  <div className="mb-6 text-xs text-emerald-300">
                    Billed {formatMoney(annualPrice(plan.monthly))} yearly —
                    save {formatMoney(savings[idx])}/yr
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading !== null}
                  className={`w-full py-3 rounded-lg font-medium transition mb-8 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClass}`}
                >
                  {loading === plan.id ? "Starting checkout…" : plan.cta}
                </button>

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-white/80"
                    >
                      <svg
                        className="h-5 w-5 flex-shrink-0 text-cyan-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.8 6.8-6.8a1 1 0 011.4 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Trust signals */}
        <div className="mt-16 pt-12 border-t border-white/5">
          <div className="grid md:grid-cols-4 gap-6 text-center">
            {[
              { label: "Cancel anytime", sub: "No contracts, no fees" },
              { label: "Pro-rated refunds", sub: "Fair to the second" },
              { label: "SSL secured", sub: "256-bit encryption" },
              { label: "PCI compliant", sub: "Powered by Stripe" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center">
                <svg
                  className="h-6 w-6 text-cyan-400 mb-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"
                  />
                </svg>
                <div className="text-sm font-medium text-white">
                  {item.label}
                </div>
                <div className="text-xs text-white/40 mt-1">{item.sub}</div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-white/30 text-xs uppercase tracking-wider">
            <span>Trusted by 1,200+ small businesses</span>
            <span>SOC 2 Type II</span>
            <span>GDPR ready</span>
            <span>Stripe verified partner</span>
          </div>
        </div>
      </div>
    </div>
  );
}
