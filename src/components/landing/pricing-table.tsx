"use client";

import { useState } from "react";
import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";

interface PricingFeature {
  name: string;
  starter: boolean | string;
  growth: boolean | string;
  enterprise: boolean | string;
}

interface PricingTier {
  key: string;
  name: string;
  monthlyPrice: number | null;
  description: string;
  highlights: string[];
  cta: string;
  ctaHref: string;
  popular: boolean;
  accent: string;
}

const TIERS: PricingTier[] = [
  {
    key: "starter",
    name: "Starter",
    monthlyPrice: 0,
    description: "Perfect for trying out Social Perks with your first campaign.",
    highlights: [
      "1 active campaign",
      "50 submissions/month",
      "Basic analytics",
      "Email support",
    ],
    cta: "Get Started Free",
    ctaHref: "/dashboard#signup",
    popular: false,
    accent: "text-brand-dim",
  },
  {
    key: "growth",
    name: "Growth",
    monthlyPrice: 49,
    description: "Everything you need to grow your marketing with real customers.",
    highlights: [
      "10 active campaigns",
      "500 submissions/month",
      "AI recommendations",
      "Priority support",
      "API access",
    ],
    cta: "Start Free Trial",
    ctaHref: "/dashboard#signup",
    popular: true,
    accent: "text-brand-cyan",
  },
  {
    key: "enterprise",
    name: "Enterprise",
    monthlyPrice: 199,
    description: "For multi-location businesses with custom needs and dedicated support.",
    highlights: [
      "Unlimited campaigns",
      "Unlimited submissions",
      "Multi-location",
      "Custom branding",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    ctaHref: "/dashboard#signup",
    popular: false,
    accent: "text-brand-amber",
  },
];

const FEATURES: PricingFeature[] = [
  { name: "Active campaigns", starter: "1", growth: "10", enterprise: "Unlimited" },
  { name: "Submissions per month", starter: "50", growth: "500", enterprise: "Unlimited" },
  { name: "Basic analytics", starter: true, growth: true, enterprise: true },
  { name: "Advanced analytics", starter: false, growth: true, enterprise: true },
  { name: "AI recommendations", starter: false, growth: true, enterprise: true },
  { name: "QR codes", starter: true, growth: true, enterprise: true },
  { name: "API access", starter: false, growth: true, enterprise: true },
  { name: "Priority support", starter: false, growth: true, enterprise: true },
  { name: "Multi-location management", starter: false, growth: false, enterprise: true },
  { name: "Custom branding", starter: false, growth: false, enterprise: true },
  { name: "Dedicated account manager", starter: false, growth: false, enterprise: true },
  { name: "SLA guarantee", starter: false, growth: false, enterprise: true },
  { name: "FTC-compliant disclosures", starter: true, growth: true, enterprise: true },
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-4 w-4 text-brand-green"}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-4 w-4 text-brand-muted/40"}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function PricingTable() {
  const [annual, setAnnual] = useState(false);

  function getDisplayPrice(tier: PricingTier): string {
    if (tier.monthlyPrice === null) return "Custom";
    if (tier.monthlyPrice === 0) return "$0";
    if (annual) return `$${Math.round(tier.monthlyPrice * 0.8)}`;
    return `$${tier.monthlyPrice}`;
  }

  function getPeriod(tier: PricingTier): string {
    if (tier.monthlyPrice === null) return "";
    if (tier.monthlyPrice === 0) return "forever";
    return annual ? "/mo, billed annually" : "/month";
  }

  return (
    <section
      id="pricing-table"
      className="relative bg-brand-bg py-20 sm:py-28 lg:py-32"
      aria-labelledby="pricing-table-heading"
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
            id="pricing-table-heading"
            className="font-heading text-[clamp(1.75rem,3vw,3rem)] italic text-brand-white leading-tight"
          >
            Simple pricing, serious results
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim leading-relaxed sm:text-lg">
            Start free. Upgrade when you&apos;re ready. No hidden fees, no contracts.
          </p>

          {/* Annual toggle */}
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
        <AnimateOnScroll
          animation="fade-up"
          stagger
          staggerDelay={120}
          className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 lg:gap-6 items-start"
        >
          {TIERS.map((tier) => (
            <div
              key={tier.key}
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
              <p
                className={`mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.15em] ${tier.accent} sm:text-xs`}
              >
                {tier.name}
              </p>

              {/* Price */}
              <div className="mb-1 flex items-baseline gap-1">
                <span className="font-heading text-3xl text-brand-white sm:text-4xl">
                  {getDisplayPrice(tier)}
                </span>
                {getPeriod(tier) && (
                  <span className="text-sm text-brand-muted">{getPeriod(tier)}</span>
                )}
              </div>

              {/* Description */}
              <p className="mb-6 text-sm text-brand-dim leading-relaxed">
                {tier.description}
              </p>

              {/* Divider */}
              <div className="mb-6 h-px bg-brand-border/40" />

              {/* Feature highlights */}
              <ul className="mb-8 flex-1 space-y-3" role="list">
                {tier.highlights.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                        tier.popular
                          ? "bg-brand-cyan/10 text-brand-cyan"
                          : "bg-brand-muted/10 text-brand-muted"
                      }`}
                      aria-hidden="true"
                    >
                      &#10003;
                    </span>
                    <span className="text-sm text-brand-text">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={tier.ctaHref}
                className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg ${
                  tier.popular
                    ? "bg-brand-cyan text-brand-bg hover:bg-brand-cyan/90 hover:shadow-md hover:shadow-brand-cyan/20 focus-visible:ring-brand-cyan/50"
                    : "border border-brand-border bg-brand-surface text-brand-text hover:border-brand-subtle hover:bg-brand-elevated focus-visible:ring-brand-cyan/30"
                }`}
                aria-label={`${tier.cta} - ${tier.name} plan`}
              >
                {tier.cta}
              </a>

              {/* Annual savings note for paid tiers */}
              {annual && tier.monthlyPrice !== null && tier.monthlyPrice > 0 && (
                <p className="mt-3 text-center text-xs text-brand-green">
                  Save ${Math.round(tier.monthlyPrice * 12 * 0.2)}/year
                </p>
              )}
            </div>
          ))}
        </AnimateOnScroll>

        {/* Feature comparison grid */}
        <AnimateOnScroll animation="fade-up" delay={200} className="mt-16 sm:mt-20 lg:mt-24">
          <h3 className="mb-8 text-center font-heading text-xl italic text-brand-white sm:text-2xl">
            Compare plans
          </h3>

          <div className="mx-auto max-w-4xl overflow-x-auto">
            <table className="w-full text-left" aria-label="Feature comparison">
              {/* Header */}
              <thead>
                <tr className="border-b border-brand-border/40">
                  <th className="pb-4 pr-4 text-sm font-medium text-brand-muted" scope="col">
                    Feature
                  </th>
                  {TIERS.map((tier) => (
                    <th
                      key={tier.key}
                      className={`pb-4 text-center text-sm font-semibold ${
                        tier.popular ? "text-brand-cyan" : "text-brand-white"
                      }`}
                      scope="col"
                    >
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {FEATURES.map((feature, idx) => (
                  <tr
                    key={feature.name}
                    className={
                      idx < FEATURES.length - 1 ? "border-b border-brand-border/20" : ""
                    }
                  >
                    <td className="py-3.5 pr-4 text-sm text-brand-dim">{feature.name}</td>
                    {(["starter", "growth", "enterprise"] as const).map((tierKey) => {
                      const val = feature[tierKey];
                      return (
                        <td key={tierKey} className="py-3.5 text-center">
                          {typeof val === "string" ? (
                            <span className="text-sm font-medium text-brand-text">
                              {val}
                            </span>
                          ) : val ? (
                            <span className="inline-flex items-center justify-center">
                              <CheckIcon />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center">
                              <XIcon />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimateOnScroll>

        {/* Bottom note */}
        <p className="mt-12 text-center text-sm text-brand-muted">
          All plans include FTC-compliant disclosures, SSL encryption, and 99.9% uptime.
        </p>
      </div>
    </section>
  );
}
