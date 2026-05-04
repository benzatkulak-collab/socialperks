"use client";

import { useState } from "react";
import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";

interface PricingTier {
  /** Marketing display name. */
  name: string;
  /**
   * Billing engine plan key — must match a key in src/lib/billing/store.ts PLANS.
   * `null` means this is a marketing-only tier (e.g. Free) that doesn't
   * trigger Stripe checkout. Without this mapping, the visible "Pro" tier
   * was a 400 from billing because no PLANS["pro"] entry exists.
   */
  planKey: "starter" | "professional" | "enterprise" | null;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
  accent: string;
  accentBorder: string;
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
    popular: false,
    accent: "text-brand-dim",
    accentBorder: "border-brand-border",
  },
  {
    name: "Pro",
    planKey: "professional",
    price: "$49",
    period: "/month",
    description: "Everything you need to grow.",
    features: [
      "Unlimited campaigns",
      "Unlimited completions",
      "Full analytics dashboard",
      "QR codes for your counter",
      "Priority verification",
      "API access",
    ],
    cta: "Start Free Trial",
    popular: true,
    accent: "text-brand-cyan",
    accentBorder: "border-brand-cyan/40",
  },
  {
    name: "Enterprise",
    planKey: "enterprise",
    price: "Custom",
    period: "",
    description: "Multiple locations, custom needs.",
    features: [
      "Everything in Pro",
      "Multi-location management",
      "Team permissions",
      "Dedicated account manager",
      "Custom integrations",
    ],
    cta: "Contact Us",
    popular: false,
    accent: "text-brand-amber",
    accentBorder: "border-brand-amber/30",
  },
];

export function PricingSection() {
  // Default to annual: 20% saving is real revenue uplift per signup; plus
  // the visible "Save 20%" badge becomes immediate social-proof of value.
  const [annual, setAnnual] = useState(true);

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
            Costs less than one Instagram ad
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim leading-relaxed sm:text-lg">
            Start free. Most businesses stay on free or Starter. No contracts, cancel anytime.
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
                Save 20%
              </span>
            )}
          </div>
        </AnimateOnScroll>

        {/* Pricing cards */}
        <AnimateOnScroll animation="fade-up" stagger staggerDelay={120} className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 lg:gap-6 items-start">
          {PRICING_TIERS.map((tier) => {
            const displayPrice =
              annual && tier.price !== "$0" && tier.price !== "Custom"
                ? `$${Math.round(parseInt(tier.price.replace("$", "")) * 0.8)}`
                : tier.price;

            return (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-xl border ${
                  tier.popular
                    ? "border-brand-cyan/40 bg-brand-surface/60 shadow-lg shadow-brand-cyan/5"
                    : "border-brand-border/40 bg-brand-surface/30"
                } p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-border/70 hover:shadow-lg hover:shadow-brand-bg/50 sm:p-7 lg:p-8`}
              >
                {/* Popular badge */}
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-brand-cyan px-4 py-1 text-xs font-semibold text-brand-bg shadow-md shadow-brand-cyan/20">
                      Most Popular
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

                {/* Description */}
                <p className="mb-6 text-sm text-brand-dim leading-relaxed">{tier.description}</p>

                {/* Divider */}
                <div className="mb-6 h-px bg-brand-border/40" />

                {/* Features */}
                <ul className="mb-8 flex-1 space-y-3" role="list">
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

                {/* CTA — preserve the chosen plan key + billing period
                    in the URL so the dashboard can pre-select them after
                    signup. Enterprise has no checkout; route to /contact. */}
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
              </div>
            );
          })}
        </AnimateOnScroll>

        {/* Bottom note */}
        <p className="mt-12 text-center text-sm text-brand-muted">
          All plans include FTC-compliant disclosures, SSL encryption, and 99.9% uptime.
        </p>

        {/* FAQ — addresses the most common objection points blocking signup.
            Also emits FAQPage schema so it can earn a rich result in Google. */}
        <PricingFaq />
      </div>
    </section>
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
    a: "Cancel anytime from your dashboard. No phone calls, no retention scripts. Your data stays accessible for export for 30 days after.",
  },
  {
    q: "Do I get a refund if it doesn't work?",
    a: "30-day money-back guarantee on Pro. If your customers aren't posting, email us within 30 days of your first paid month and we'll refund in full.",
  },
  {
    q: "How does the FTC compliance piece work?",
    a: "Every campaign auto-injects the platform-specific disclosure (#ad on Instagram, branded-content tag on TikTok, etc.) into the customer's posting flow. You can't accidentally launch a non-compliant campaign — the system blocks it.",
  },
  {
    q: "Why don't you support paying for Google reviews?",
    a: "Google's Terms of Service prohibit incentivized reviews — same with Yelp and Tripadvisor. The platform actively blocks these to protect your account from being suspended. We focus on Instagram, TikTok, and Facebook posts where incentivization is allowed with proper disclosure.",
  },
  {
    q: "What if I have multiple locations?",
    a: "That's the Enterprise tier. Multi-location dashboard, team permissions, brand-compliance review across stores, and a dedicated account manager. Reach out via Contact.",
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
