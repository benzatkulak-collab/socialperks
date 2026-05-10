"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

// Conservative research-backed multiplier:
// Harvard Business School (Luca, 2016): 1-star rating increase ~5-9% revenue lift
// Womply (2019): 4★+ businesses earn ~25% more than sub-3★
// We use 7% lift per full star — conservative midpoint.
const REVENUE_LIFT_PER_STAR = 0.07;

function clampStar(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(1, Math.min(5, v));
}

export function ReviewRoiCalculator() {
  const [aov, setAov] = useState<string>("45");
  const [orders, setOrders] = useState<string>("400");
  const [current, setCurrent] = useState<string>("3.8");
  const [target, setTarget] = useState<string>("4.5");

  const { monthlyRevenue, lift, extraMonthly, extraYearly, starDelta } =
    useMemo(() => {
      const aovN = Number(aov) || 0;
      const ordersN = Number(orders) || 0;
      const currentN = clampStar(Number(current));
      const targetN = clampStar(Number(target));
      const monthly = aovN * ordersN;
      const delta = Math.max(0, targetN - currentN);
      const liftPct = delta * REVENUE_LIFT_PER_STAR;
      const extra = monthly * liftPct;
      return {
        monthlyRevenue: monthly,
        lift: liftPct,
        extraMonthly: extra,
        extraYearly: extra * 12,
        starDelta: delta,
      };
    }, [aov, orders, current, target]);

  const headline =
    starDelta > 0
      ? `If you go from ${Number(current).toFixed(1)}★ to ${Number(target).toFixed(1)}★ you'd earn an extra $${Math.round(extraMonthly).toLocaleString()}/month`
      : "Set a target rating higher than your current rating to see the lift.";

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
                    Average order value ($)
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={aov}
                    onChange={(e) => setAov(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg px-4 py-3 text-base text-brand-white placeholder-brand-muted focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    placeholder="45"
                  />
                </label>

                <label className="block">
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                    Orders per month
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={orders}
                    onChange={(e) => setOrders(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg px-4 py-3 text-base text-brand-white placeholder-brand-muted focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    placeholder="400"
                  />
                </label>

                <label className="block">
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                    Current Google rating (1–5)
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={1}
                    max={5}
                    step={0.1}
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg px-4 py-3 text-base text-brand-white placeholder-brand-muted focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    placeholder="3.8"
                  />
                </label>

                <label className="block">
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                    Target Google rating (1–5)
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={1}
                    max={5}
                    step={0.1}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg px-4 py-3 text-base text-brand-white placeholder-brand-muted focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    placeholder="4.5"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Result */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-brand-amber/40 bg-brand-amber/10 p-6">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-amber">
                Estimated lift
              </span>
              <p className="mt-3 font-heading text-2xl italic leading-tight text-brand-white sm:text-3xl">
                {headline}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-brand-border bg-brand-bg/50 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                    Current revenue/mo
                  </div>
                  <div className="mt-1 font-mono text-xl text-brand-white">
                    ${Math.round(monthlyRevenue).toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg border border-brand-border bg-brand-bg/50 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                    Lift
                  </div>
                  <div className="mt-1 font-mono text-xl text-brand-green">
                    +{(lift * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-lg border border-brand-border bg-brand-bg/50 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                    Extra per year
                  </div>
                  <div className="mt-1 font-mono text-xl text-brand-amber">
                    ${Math.round(extraYearly).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Methodology */}
            <div className="mt-6 rounded-2xl border border-brand-border bg-brand-surface/50 p-6">
              <h3 className="font-heading text-lg italic text-brand-white">
                The math (conservative)
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-dim">
                We use a <span className="text-brand-white">7% revenue lift
                per full star</span> increase. Harvard Business School research
                (Luca, 2016) found 5–9% per star for restaurants on Yelp;
                Womply found 4★+ businesses earn ~25% more than sub-3★ ones.
                We picked the lower-middle of that range so the number you see
                is conservative.
              </p>
              <p className="mt-3 text-xs text-brand-muted">
                Lift only applies if your target is higher than your current
                rating. Real-world results depend on category, competition, and
                review volume.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-amber/10 via-brand-surface/50 to-brand-cyan/10 p-8 text-center sm:p-10">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Get more reviews automatically with Social Perks
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-dim sm:text-base">
            Reward customers a little something for leaving an honest review.
            Compliant, automated, no awkward asking.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/ai"
              className="w-full rounded-xl bg-brand-cyan px-7 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20 sm:w-auto"
            >
              Start collecting reviews →
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
