"use client";

import { useEffect, useState } from "react";
import { formatNumber } from "@/lib/shared/formatters";

interface StatItem {
  label: string;
  value: number;
  suffix: string;
  prefix?: string;
}

const STATS: StatItem[] = [
  { label: "Businesses Active", value: 312, suffix: "+" },
  { label: "Reviews Generated", value: 18400, suffix: "+" },
  { label: "Social Posts Created", value: 47200, suffix: "+" },
  { label: "Revenue Driven", value: 2100000, suffix: "", prefix: "$" },
];

function AnimatedCounter({
  target,
  prefix,
  suffix,
}: {
  target: number;
  prefix?: string;
  suffix: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const current = Math.min(target, Math.round(increment * step));
      setCount(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [target]);

  return (
    <span className="font-mono text-2xl font-semibold text-brand-white sm:text-3xl lg:text-4xl">
      {prefix}
      {formatNumber(count)}
      {suffix}
    </span>
  );
}

export function Hero() {
  return (
    <section
      className="relative min-h-screen overflow-hidden bg-brand-bg"
      aria-label="Hero section"
    >
      {/* Background gradient mesh */}
      <div
        className="pointer-events-none absolute inset-0 animate-gradient bg-[length:300%_300%] bg-[linear-gradient(135deg,rgba(34,211,238,0.07),rgba(167,139,250,0.05),rgba(244,114,182,0.04),rgba(34,211,238,0.02))]"
        aria-hidden="true"
      />
      {/* Radial glow accents */}
      <div
        className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand-cyan/5 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-brand-purple/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-5 pb-20 pt-32 text-center sm:px-8 sm:pt-40 lg:pt-48">
        {/* Badge */}
        <div className="mb-8 animate-fade-in rounded-full border border-brand-border bg-brand-surface/60 px-5 py-2 backdrop-blur-sm">
          <span className="font-mono text-xs tracking-wide text-brand-dim">
            25 platforms &middot; 125 marketing actions &middot; 1 dashboard
          </span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up font-heading text-4xl italic leading-tight text-brand-white sm:text-5xl md:text-6xl lg:text-7xl">
          Turn your customers into
          <br />
          <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
            your marketing team
          </span>
        </h1>

        {/* Subline */}
        <p className="mt-6 max-w-2xl animate-fade-up text-lg leading-relaxed text-brand-dim animate-delay-100 sm:mt-8 sm:text-xl">
          Offer perks. They post, review, and share. You grow.
          <br className="hidden sm:block" />
          From neighborhood coffee shops to national brands.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex animate-fade-up flex-col items-center gap-4 animate-delay-200 sm:flex-row">
          <a
            href="#signup"
            className="rounded-lg bg-brand-cyan px-8 py-3.5 font-body text-base font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/20 focus:outline-none focus:ring-2 focus:ring-brand-cyan/50 focus:ring-offset-2 focus:ring-offset-brand-bg"
            aria-label="Start free account"
          >
            Start Free
          </a>
          <a
            href="#how-it-works"
            className="rounded-lg border border-brand-border bg-brand-surface/50 px-8 py-3.5 font-body text-base font-medium text-brand-text transition-all hover:border-brand-subtle hover:bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:ring-offset-2 focus:ring-offset-brand-bg"
            aria-label="See how it works"
          >
            See How It Works
          </a>
        </div>

        {/* Social proof line */}
        <p className="mt-8 animate-fade-up text-sm text-brand-muted animate-delay-300">
          No credit card required &middot; Set up in 5 minutes
        </p>

        {/* Stats */}
        <div
          className="mt-16 grid w-full max-w-4xl animate-fade-up grid-cols-2 gap-6 animate-delay-400 sm:mt-20 lg:grid-cols-4 lg:gap-8"
          aria-label="Platform statistics"
        >
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-2 rounded-xl border border-brand-border/50 bg-brand-surface/40 px-4 py-6 backdrop-blur-sm"
            >
              <AnimatedCounter
                target={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
              />
              <span className="text-xs font-medium uppercase tracking-wider text-brand-muted">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
