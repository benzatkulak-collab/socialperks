"use client";

import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";

/**
 * Example-campaigns section.
 *
 * HONESTY: these are ILLUSTRATIVE example setups, not customer results. The
 * company has zero live customers, so we do NOT show fabricated outcome
 * numbers ("200+ stories/month", "4x ROI") dressed as "real numbers from real
 * campaigns" — that is FTC-deceptive and corrodes trust the moment a buyer
 * digs in. We show the *shape* of a campaign (who, the perk, the action) and
 * label it plainly as an example. Replace with real, attributed case studies
 * once customers exist and consent.
 */

interface ExampleCampaign {
  business: string;
  type: string;
  offer: string;
  action: string;
  accent: string;
}

const EXAMPLE_CAMPAIGNS: ExampleCampaign[] = [
  {
    business: "Coffee shop",
    type: "Local cafe",
    offer: "Free pastry",
    action: "Instagram story tag",
    accent: "border-brand-green",
  },
  {
    business: "Yoga studio",
    type: "Boutique fitness",
    offer: "10% off membership",
    action: "Instagram story tag",
    accent: "border-brand-cyan",
  },
  {
    business: "Taqueria",
    type: "Restaurant",
    offer: "Free appetizer",
    action: "TikTok video",
    accent: "border-brand-amber",
  },
  {
    business: "Hair salon",
    type: "Salon & beauty",
    offer: "15% off color",
    action: "Before/after IG post",
    accent: "border-brand-pink",
  },
];

export function SocialProof() {
  return (
    <section
      className="relative bg-brand-bg py-20 sm:py-28 lg:py-32"
      aria-labelledby="results-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll animation="fade-up" className="mb-14 text-center sm:mb-16 lg:mb-20">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Example campaigns
          </p>
          <h2
            id="results-heading"
            className="font-heading text-[clamp(1.75rem,3vw,3rem)] italic text-brand-white leading-tight"
          >
            What a campaign looks like
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim leading-relaxed sm:text-lg">
            Illustrative example setups — not customer results. We&apos;ll publish real,
            attributed numbers as campaigns go live.
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll animation="fade-up" stagger staggerDelay={100} className="mx-auto max-w-5xl grid gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
          {EXAMPLE_CAMPAIGNS.map((r) => (
            <div
              key={r.business}
              className={`rounded-xl border-l-2 ${r.accent} border border-brand-border/40 bg-brand-surface/30 p-5 transition-all duration-300 hover:border-brand-border/70 hover:bg-brand-surface/45 sm:p-7`}
            >
              {/* Business info */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-sm font-semibold text-brand-white sm:text-base">{r.business}</p>
                  <p className="text-xs text-brand-muted mt-0.5">{r.type}</p>
                </div>
                <span className="rounded-full border border-brand-border/60 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-muted whitespace-nowrap">
                  Example
                </span>
              </div>

              {/* The deal */}
              <div className="flex flex-col gap-3 rounded-lg bg-brand-bg/60 px-4 py-3.5 sm:flex-row sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-brand-muted">Offer</p>
                  <p className="text-sm text-brand-amber font-medium mt-0.5">{r.offer}</p>
                </div>
                <div className="hidden h-auto w-px bg-brand-border/30 sm:block" />
                <div className="h-px w-full bg-brand-border/20 sm:hidden" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-brand-muted">In exchange for</p>
                  <p className="text-sm text-brand-cyan font-medium mt-0.5">{r.action}</p>
                </div>
              </div>
            </div>
          ))}
        </AnimateOnScroll>
      </div>
    </section>
  );
}
