"use client";

import { useEffect, useState } from "react";

const TERMINAL_LINES: { text: string; type: "ok" | "info" }[] = [
  { text: "Detected 3 new 5-star reviews", type: "ok" },
  { text: "Created campaign for 4th of July weekend", type: "ok" },
  { text: "Approved 12 customer submissions", type: "ok" },
  { text: "Sent 8 perks via email", type: "ok" },
  { text: "Working: matching influencers in your niche...", type: "info" },
];

export function AiHero() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines >= TERMINAL_LINES.length) return;
    const t = setTimeout(() => {
      setVisibleLines((n) => n + 1);
    }, 700);
    return () => clearTimeout(t);
  }, [visibleLines]);

  return (
    <section
      className="relative min-h-screen overflow-hidden bg-brand-bg pt-32 pb-20 sm:pt-40 sm:pb-28 lg:pt-48"
      aria-label="AI hero section"
    >
      {/* Background gradient mesh */}
      <div
        className="pointer-events-none absolute inset-0 animate-gradient bg-[length:300%_300%] bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(167,139,250,0.05),rgba(34,211,238,0.03))]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand-cyan/5 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-brand-purple/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            {/* Eyebrow badge */}
            <div className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-cyan opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-cyan" />
              </span>
              New · Powered by AI
            </div>

            {/* Headline */}
            <h1 className="mt-6 animate-fade-up animate-delay-100 font-heading text-[clamp(2.25rem,5vw,4.25rem)] italic leading-[1.05] text-brand-white tracking-tight">
              Your AI marketing manager{" "}
              <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
                works while you sleep.
              </span>
            </h1>

            {/* Subhead */}
            <p className="mt-6 max-w-xl animate-fade-up text-base leading-relaxed text-brand-dim animate-delay-200 sm:text-lg lg:mx-0 mx-auto">
              Connects to your social accounts, runs review campaigns,
              manages influencer outreach — all on autopilot. You just
              answer the door when the results show up.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex animate-fade-up flex-col items-center gap-3 animate-delay-300 sm:flex-row sm:justify-center lg:justify-start">
              <a
                href="/auth"
                className="w-full sm:w-auto rounded-xl bg-brand-cyan px-8 py-3.5 font-body text-base font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg active:translate-y-0"
              >
                Get my AI assistant →
              </a>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto rounded-xl border border-brand-border bg-brand-surface/50 px-8 py-3.5 font-body text-base font-medium text-brand-text transition-all hover:border-brand-subtle hover:bg-brand-surface hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/30 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg active:translate-y-0"
              >
                Watch 60-second demo
              </a>
            </div>

            <p className="mt-6 animate-fade-up text-sm text-brand-muted animate-delay-400">
              Free for 14 days. No credit card. Cancel any time.
            </p>
          </div>

          {/* Right: faux terminal */}
          <div className="relative animate-fade-up animate-delay-200">
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-brand-cyan/15 via-brand-purple/10 to-transparent blur-2xl" aria-hidden="true" />
            <div className="relative rounded-2xl border border-brand-border/60 bg-brand-surface/80 p-1 backdrop-blur-sm shadow-2xl">
              {/* Terminal chrome */}
              <div className="flex items-center gap-2 border-b border-brand-border/40 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-red/70" aria-hidden="true" />
                <span className="h-2.5 w-2.5 rounded-full bg-brand-amber/70" aria-hidden="true" />
                <span className="h-2.5 w-2.5 rounded-full bg-brand-green/70" aria-hidden="true" />
                <div className="ml-auto flex items-center gap-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-cyan opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-cyan" />
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-cyan">
                    AI agent · Active
                  </span>
                </div>
              </div>

              {/* Terminal body */}
              <div
                className="space-y-2.5 px-5 py-5 font-mono text-[13px] leading-relaxed sm:px-6 sm:py-6"
                aria-live="polite"
              >
                {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
                  <div
                    key={i}
                    className="animate-fade-up flex items-start gap-2.5"
                  >
                    {line.type === "ok" ? (
                      <span
                        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-[10px] font-bold text-brand-green"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center"
                        aria-hidden="true"
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-amber opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-amber" />
                        </span>
                      </span>
                    )}
                    <span
                      className={
                        line.type === "ok"
                          ? "text-brand-text"
                          : "text-brand-amber"
                      }
                    >
                      {line.text}
                    </span>
                  </div>
                ))}

                {/* Cursor */}
                {visibleLines >= TERMINAL_LINES.length && (
                  <div className="flex items-center gap-2 pt-1 text-brand-cyan">
                    <span aria-hidden="true">$</span>
                    <span
                      className="inline-block h-4 w-2 animate-pulse bg-brand-cyan"
                      aria-hidden="true"
                    />
                  </div>
                )}
              </div>

              {/* Terminal footer */}
              <div className="flex items-center justify-between border-t border-brand-border/40 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                <span>socialperks-agent</span>
                <span>v2.4.1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
