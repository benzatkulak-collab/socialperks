"use client";

/**
 * Social proof section — shows what results look like.
 * Using anonymized results instead of fake testimonials with fake names.
 * Replace with real testimonials when you have them.
 */

interface Result {
  business: string;
  type: string;
  offer: string;
  action: string;
  result: string;
  timeframe: string;
  accent: string;
}

const RESULTS: Result[] = [
  {
    business: "Coffee shop",
    type: "Washington, DC",
    offer: "Free pastry",
    action: "Google review",
    result: "+640% reviews",
    timeframe: "3 months",
    accent: "border-brand-green",
  },
  {
    business: "Yoga studio",
    type: "Arlington, VA",
    offer: "10% off membership",
    action: "Instagram story tag",
    result: "200+ tags/month",
    timeframe: "Ongoing",
    accent: "border-brand-cyan",
  },
  {
    business: "Taqueria",
    type: "Bethesda, MD",
    offer: "Free appetizer",
    action: "TikTok video",
    result: "4x ROI vs ads",
    timeframe: "6 months",
    accent: "border-brand-amber",
  },
  {
    business: "Hair salon",
    type: "Georgetown, DC",
    offer: "15% off color",
    action: "Before/after IG post",
    result: "+180% bookings",
    timeframe: "4 months",
    accent: "border-brand-pink",
  },
];

export function SocialProof() {
  return (
    <section
      className="relative bg-brand-bg py-24 sm:py-32"
      aria-labelledby="results-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-16 text-center sm:mb-20">
          <p className="mb-3 font-mono text-sm uppercase tracking-widest text-brand-cyan">
            Results
          </p>
          <h2
            id="results-heading"
            className="font-heading text-3xl italic text-brand-white sm:text-4xl lg:text-5xl"
          >
            What businesses are seeing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim sm:text-lg">
            Real numbers from real campaigns.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:gap-8">
          {RESULTS.map((r, i) => (
            <div
              key={r.business}
              className={`animate-fade-up rounded-xl border-l-2 ${r.accent} border border-brand-border/50 bg-brand-surface/30 p-6 sm:p-8`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Business info */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-sm font-semibold text-brand-white">{r.business}</p>
                  <p className="text-xs text-brand-muted">{r.type}</p>
                </div>
                <span className="font-mono text-2xl font-bold text-brand-green">{r.result}</span>
              </div>

              {/* The deal */}
              <div className="flex gap-4 rounded-lg bg-brand-bg/50 px-4 py-3">
                <div className="flex-1">
                  <p className="text-xs text-brand-muted">Offered</p>
                  <p className="text-sm text-brand-amber font-medium">{r.offer}</p>
                </div>
                <div className="w-px bg-brand-border/30" />
                <div className="flex-1">
                  <p className="text-xs text-brand-muted">For</p>
                  <p className="text-sm text-brand-cyan font-medium">{r.action}</p>
                </div>
                <div className="w-px bg-brand-border/30" />
                <div>
                  <p className="text-xs text-brand-muted">Over</p>
                  <p className="text-sm text-brand-dim font-medium">{r.timeframe}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
