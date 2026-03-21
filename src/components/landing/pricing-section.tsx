"use client";

import { useState } from "react";

interface PricingTier {
  name: string;
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
    price: "$0",
    period: "forever",
    description: "Try it out with your first campaign.",
    features: [
      "1 active campaign",
      "Basic analytics",
      "Up to 50 completions/month",
      "Email support",
      "Community access",
    ],
    cta: "Start Free",
    popular: false,
    accent: "text-brand-dim",
    accentBorder: "border-brand-border",
  },
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "For businesses ready to grow.",
    features: [
      "5 active campaigns",
      "Full analytics dashboard",
      "500 completions/month",
      "QR code generation",
      "Priority email support",
      "Custom perk design",
    ],
    cta: "Start Free Trial",
    popular: false,
    accent: "text-brand-green",
    accentBorder: "border-brand-green/30",
  },
  {
    name: "Pro",
    price: "$79",
    period: "/month",
    description: "The full toolkit for serious growth.",
    features: [
      "Unlimited campaigns",
      "Priority verification",
      "Unlimited completions",
      "Influencer matching",
      "API access",
      "Follower tier bonuses",
      "Advanced reporting",
      "Phone support",
    ],
    cta: "Start Free Trial",
    popular: true,
    accent: "text-brand-cyan",
    accentBorder: "border-brand-cyan/40",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For brands with multiple locations.",
    features: [
      "Everything in Pro",
      "Multi-location management",
      "SSO & team permissions",
      "Dedicated account manager",
      "White-label options",
      "Custom integrations",
      "SLA guarantee",
      "Onboarding & training",
    ],
    cta: "Talk to Sales",
    popular: false,
    accent: "text-brand-amber",
    accentBorder: "border-brand-amber/30",
  },
];

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section
      id="pricing"
      className="relative bg-brand-bg py-24 sm:py-32"
      aria-labelledby="pricing-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section header */}
        <div className="mb-12 text-center sm:mb-16">
          <p className="mb-3 font-mono text-sm uppercase tracking-widest text-brand-cyan">
            Pricing
          </p>
          <h2
            id="pricing-heading"
            className="font-heading text-3xl italic text-brand-white sm:text-4xl lg:text-5xl"
          >
            Simple pricing, serious results
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim sm:text-lg">
            Start free. Upgrade when you&apos;re ready. No hidden fees.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span
              className={`text-sm ${
                !annual ? "text-brand-white" : "text-brand-muted"
              }`}
            >
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative h-7 w-12 rounded-full border transition-colors ${
                annual
                  ? "border-brand-cyan/40 bg-brand-cyan/20"
                  : "border-brand-border bg-brand-surface"
              }`}
              role="switch"
              aria-checked={annual}
              aria-label="Toggle annual billing"
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-brand-white transition-transform ${
                  annual ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
            <span
              className={`text-sm ${
                annual ? "text-brand-white" : "text-brand-muted"
              }`}
            >
              Annual
            </span>
            {annual && (
              <span className="ml-1 rounded-full bg-brand-green/10 px-2 py-0.5 text-xs font-medium text-brand-green">
                Save 20%
              </span>
            )}
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
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
                    ? "border-brand-cyan/40 bg-brand-surface/60"
                    : "border-brand-border/50 bg-brand-surface/30"
                } p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-brand-border sm:p-8`}
              >
                {/* Popular badge */}
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-brand-cyan px-4 py-1 text-xs font-semibold text-brand-bg">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Tier name */}
                <p className={`mb-2 font-mono text-sm font-medium uppercase tracking-wider ${tier.accent}`}>
                  {tier.name}
                </p>

                {/* Price */}
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="font-heading text-4xl text-brand-white">
                    {displayPrice}
                  </span>
                  {tier.period && (
                    <span className="text-sm text-brand-muted">
                      {tier.period}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="mb-6 text-sm text-brand-dim">{tier.description}</p>

                {/* Divider */}
                <div className="mb-6 h-px bg-brand-border/50" />

                {/* Features */}
                <ul className="mb-8 flex-1 space-y-3" role="list">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <span
                        className={`mt-1 text-xs ${tier.popular ? "text-brand-cyan" : "text-brand-muted"}`}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      <span className="text-sm text-brand-text">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <a
                  href="#signup"
                  className={`block w-full rounded-lg py-3 text-center text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-bg ${
                    tier.popular
                      ? "bg-brand-cyan text-brand-bg hover:bg-brand-cyan/90 focus:ring-brand-cyan/50"
                      : "border border-brand-border bg-brand-surface text-brand-text hover:border-brand-subtle hover:bg-brand-elevated focus:ring-brand-cyan/30"
                  }`}
                  aria-label={`${tier.cta} - ${tier.name} plan`}
                >
                  {tier.cta}
                </a>
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        <p className="mt-10 text-center text-sm text-brand-muted">
          All plans include FTC-compliant disclosures, SSL encryption, and 99.9% uptime.
        </p>
      </div>
    </section>
  );
}
