"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface Benchmark {
  industry: string;
  cac: number;
  note: string;
}

const BENCHMARKS: Benchmark[] = [
  { industry: "Restaurants & cafes", cac: 50, note: "High repeat visits" },
  { industry: "Salons & spas", cac: 75, note: "Service-driven loyalty" },
  { industry: "Gyms & fitness", cac: 100, note: "Long sales cycle" },
  { industry: "Retail (local)", cac: 60, note: "Foot traffic + impulse" },
  { industry: "Auto services", cac: 90, note: "High-trust referrals" },
  { industry: "Home services", cac: 120, note: "Lead gen heavy" },
  { industry: "E-commerce (DTC)", cac: 45, note: "Paid social driven" },
  { industry: "Professional services", cac: 200, note: "Long deal cycle" },
  { industry: "SaaS (SMB)", cac: 250, note: "Trial conversion" },
];

function classify(cac: number): {
  label: string;
  tone: "good" | "ok" | "high" | "critical";
  description: string;
} {
  if (cac <= 0) {
    return {
      label: "Add some numbers",
      tone: "ok",
      description: "Enter your spend and customers to see your CAC.",
    };
  }
  if (cac < 50) {
    return {
      label: "Excellent",
      tone: "good",
      description:
        "You're acquiring customers cheaply. Reinvest to scale, but keep an eye on quality.",
    };
  }
  if (cac < 100) {
    return {
      label: "Good",
      tone: "good",
      description:
        "Solid for most local businesses. Worth optimizing your top channel further.",
    };
  }
  if (cac < 200) {
    return {
      label: "Average",
      tone: "ok",
      description:
        "Workable, but room to improve. Word-of-mouth and reviews are your cheapest channels.",
    };
  }
  if (cac < 350) {
    return {
      label: "High",
      tone: "high",
      description:
        "Acquisition is expensive. Lifetime value better justify it — or it's time to fix the funnel.",
    };
  }
  return {
    label: "Critical",
    tone: "critical",
    description:
      "Your CAC is unsustainable for most categories. Look at organic, referrals, or repeat-buyer programs.",
  };
}

const TONE_CLASSES: Record<
  ReturnType<typeof classify>["tone"],
  { border: string; bg: string; text: string; dot: string }
> = {
  good: {
    border: "border-brand-green/40",
    bg: "bg-brand-green/10",
    text: "text-brand-green",
    dot: "bg-brand-green",
  },
  ok: {
    border: "border-brand-cyan/40",
    bg: "bg-brand-cyan/10",
    text: "text-brand-cyan",
    dot: "bg-brand-cyan",
  },
  high: {
    border: "border-brand-amber/40",
    bg: "bg-brand-amber/10",
    text: "text-brand-amber",
    dot: "bg-brand-amber",
  },
  critical: {
    border: "border-rose-500/40",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    dot: "bg-rose-400",
  },
};

export function CacCalculator() {
  const [spend, setSpend] = useState<string>("2000");
  const [customers, setCustomers] = useState<string>("40");
  const [copied, setCopied] = useState(false);

  // Initialize from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("spend");
    const c = params.get("customers");
    if (s) setSpend(s);
    if (c) setCustomers(c);
  }, []);

  const spendNum = Number(spend) || 0;
  const customersNum = Number(customers) || 0;
  const cac = customersNum > 0 ? spendNum / customersNum : 0;
  const result = useMemo(() => classify(cac), [cac]);
  const tone = TONE_CLASSES[result.tone];

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/tools/cac-calculator?spend=${spendNum}&customers=${customersNum}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <section className="pb-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Inputs */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-brand-border bg-brand-surface/50 p-6">
              <h2 className="font-heading text-xl italic text-brand-white">
                Your numbers
              </h2>
              <p className="mt-1 text-sm text-brand-dim">
                Updates as you type.
              </p>

              <div className="mt-6 space-y-5">
                <label className="block">
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                    Monthly marketing spend ($)
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={spend}
                    onChange={(e) => setSpend(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg px-4 py-3 text-base text-brand-white placeholder-brand-muted focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    placeholder="2000"
                  />
                </label>

                <label className="block">
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                    New customers per month
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={customers}
                    onChange={(e) => setCustomers(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg px-4 py-3 text-base text-brand-white placeholder-brand-muted focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    placeholder="40"
                  />
                </label>

                <button
                  onClick={handleCopyLink}
                  className="w-full rounded-lg border border-brand-border bg-brand-surface px-4 py-2.5 text-sm font-medium text-brand-text transition-colors hover:border-brand-cyan/40 hover:text-brand-cyan"
                >
                  {copied ? "Link copied!" : "Copy share link"}
                </button>
              </div>
            </div>
          </div>

          {/* Result */}
          <div className="lg:col-span-3">
            <div
              className={`rounded-2xl border ${tone.border} ${tone.bg} p-6`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${tone.dot}`}
                  aria-hidden="true"
                />
                <span
                  className={`font-mono text-[11px] uppercase tracking-[0.15em] ${tone.text}`}
                >
                  {result.label}
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="font-heading text-5xl italic text-brand-white sm:text-6xl">
                  ${cac.toFixed(2)}
                </span>
                <span className="font-mono text-xs uppercase tracking-[0.15em] text-brand-muted">
                  per customer
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-brand-dim">
                {result.description}
              </p>
            </div>

            {/* Benchmarks */}
            <div className="mt-6 rounded-2xl border border-brand-border bg-brand-surface/50 p-6">
              <h3 className="font-heading text-lg italic text-brand-white">
                Industry benchmarks
              </h3>
              <p className="mt-1 text-sm text-brand-dim">
                Typical CAC by category. Yours: ${cac.toFixed(2)}.
              </p>
              <ul className="mt-5 space-y-2.5">
                {BENCHMARKS.map((b) => {
                  const better = cac > 0 && cac <= b.cac;
                  return (
                    <li
                      key={b.industry}
                      className="flex items-center justify-between gap-3 rounded-lg border border-brand-border/60 bg-brand-bg/50 px-4 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-brand-text">
                          {b.industry}
                        </div>
                        <div className="text-xs text-brand-muted">
                          {b.note}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="font-mono text-sm text-brand-white">
                          ${b.cac}
                        </span>
                        {cac > 0 ? (
                          <span
                            className={`font-mono text-[10px] uppercase tracking-[0.12em] ${
                              better
                                ? "text-brand-green"
                                : "text-brand-amber"
                            }`}
                          >
                            {better ? "you win" : "above"}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 via-brand-surface/50 to-brand-green/5 p-8 text-center sm:p-10">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Lower your CAC with Social Perks
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-dim sm:text-base">
            Turn existing customers into your marketing team. Word-of-mouth and
            referrals are the cheapest acquisition channel — Social Perks runs
            it on autopilot.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/ai"
              className="w-full rounded-xl bg-brand-cyan px-7 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20 sm:w-auto"
            >
              Get my AI assistant →
            </Link>
            <Link
              href="/pricing"
              className="w-full rounded-xl border border-brand-border bg-brand-surface/50 px-7 py-3 text-sm font-medium text-brand-text transition-all hover:border-brand-subtle hover:bg-brand-surface sm:w-auto"
            >
              See pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
