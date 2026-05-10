"use client";

import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";

interface Row {
  without: string;
  withAI: string;
}

const ROWS: Row[] = [
  {
    without: "10 hrs/week managing campaigns",
    withAI: "0 hrs — runs itself",
  },
  {
    without: "$500–2,000/month for an agency",
    withAI: "$49/month",
  },
  {
    without: "Miss seasonal opportunities",
    withAI: "AI never sleeps",
  },
  {
    without: "Manually approve every submission",
    withAI: "AI approves, you review only edge cases",
  },
  {
    without: "Guessing what works",
    withAI: "A/B tests every campaign",
  },
];

export function AiComparison() {
  return (
    <section
      className="relative bg-brand-bg py-20 sm:py-28 lg:py-32"
      aria-labelledby="ai-comparison-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll animation="fade-up" className="mb-14 text-center sm:mb-16">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            With AI vs. Without
          </p>
          <h2
            id="ai-comparison-heading"
            className="font-heading text-[clamp(1.75rem,3vw,3rem)] italic text-brand-white leading-tight"
          >
            What changes when AI runs the show
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim leading-relaxed sm:text-lg">
            Same marketing work. About 10 hours less of your week.
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll animation="fade-up" delay={150}>
          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            {/* Without */}
            <div className="rounded-2xl border-l-2 border-brand-red/60 border border-brand-border/40 bg-brand-surface/30 p-6 backdrop-blur-sm sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-muted">
                    Without Social Perks
                  </p>
                  <h3 className="font-heading text-xl italic text-brand-white sm:text-2xl">
                    The old way
                  </h3>
                </div>
              </div>

              <ul className="space-y-3.5" role="list">
                {ROWS.map((row) => (
                  <li
                    key={row.without}
                    className="flex items-start gap-3 rounded-lg bg-brand-bg/40 px-4 py-3"
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-red/15 text-[11px] font-bold text-brand-red"
                      aria-hidden="true"
                    >
                      ✗
                    </span>
                    <span className="text-sm text-brand-text leading-relaxed sm:text-base">
                      {row.without}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* With AI */}
            <div className="relative rounded-2xl border-l-2 border-brand-green/60 border border-brand-cyan/30 bg-brand-surface/60 p-6 backdrop-blur-sm shadow-lg shadow-brand-cyan/5 sm:p-8">
              <div className="absolute -top-3 right-6 rounded-full bg-brand-cyan px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-bg shadow-md shadow-brand-cyan/25">
                Recommended
              </div>

              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      d="m5 12 5 5 9-11"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-cyan">
                    With Social Perks AI
                  </p>
                  <h3 className="font-heading text-xl italic text-brand-white sm:text-2xl">
                    The new way
                  </h3>
                </div>
              </div>

              <ul className="space-y-3.5" role="list">
                {ROWS.map((row) => (
                  <li
                    key={row.withAI}
                    className="flex items-start gap-3 rounded-lg bg-brand-bg/40 px-4 py-3"
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-[11px] font-bold text-brand-green"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    <span className="text-sm font-medium text-brand-white leading-relaxed sm:text-base">
                      {row.withAI}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
