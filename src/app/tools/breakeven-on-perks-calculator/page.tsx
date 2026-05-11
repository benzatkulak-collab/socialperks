"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

function fmtCurrency(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtNumber(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export default function BreakevenOnPerksCalculatorPage() {
  const [perkValue, setPerkValue] = useState("10");
  const [perkCost, setPerkCost] = useState("5");
  const [ltv, setLtv] = useState("250");

  const pv = parseFloat(perkValue) || 0;
  const pc = parseFloat(perkCost) || 0;
  const ltvN = parseFloat(ltv) || 0;

  const result = useMemo(() => {
    // perks-to-breakeven on a single customer:
    // total perk cost must equal LTV → perks = LTV / perkCost
    const perksToBreakeven = pc > 0 ? Math.ceil(ltvN / pc) : Infinity;
    const cost100 = pc * 100; // total cost of perks for 100 new customers (1 perk each)
    const revenue100 = ltvN * 100;
    const netProfit100 = revenue100 - cost100;
    const roi = cost100 > 0 ? ((revenue100 - cost100) / cost100) * 100 : 0;
    const cacEquivalent = pc; // perk cost ≈ CAC per customer
    const ltvCacRatio = pc > 0 ? ltvN / pc : Infinity;
    return {
      perksToBreakeven,
      cost100,
      revenue100,
      netProfit100,
      roi,
      cacEquivalent,
      ltvCacRatio,
    };
  }, [pv, pc, ltvN]);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-20 sm:px-6">
        <Link
          href="/tools"
          className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted hover:text-brand-cyan"
        >
          ← All tools
        </Link>

        <h1 className="mt-6 font-heading text-4xl italic leading-tight text-brand-white sm:text-5xl">
          Break-Even on Perks Calculator
        </h1>
        <p className="mt-4 max-w-2xl text-brand-dim">
          If you give customers $10 off to refer a friend, how many perks before
          you break even on their lifetime value? Built for Social Perks
          programs, but works for any rewards or loyalty offer.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <Field
            label="Perk value (to customer)"
            value={perkValue}
            onChange={setPerkValue}
            prefix="$"
            hint="what the customer sees (e.g. $10 off)"
          />
          <Field
            label="Perk cost (to you)"
            value={perkCost}
            onChange={setPerkCost}
            prefix="$"
            hint="real cost — discount minus margin"
          />
          <Field
            label="Avg new customer LTV"
            value={ltv}
            onChange={setLtv}
            prefix="$"
            hint="lifetime revenue from one new customer"
          />
        </div>

        <div className="mt-10 rounded-2xl border border-brand-border bg-brand-surface/50 p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
            Per-customer break-even
          </p>
          <p className="mt-3 font-heading text-5xl italic text-brand-cyan">
            {result.perksToBreakeven === Infinity
              ? "∞"
              : fmtNumber(result.perksToBreakeven)}{" "}
            <span className="text-2xl text-brand-muted">perks</span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-brand-dim">
            You can give out{" "}
            <strong className="text-brand-white">
              {result.perksToBreakeven === Infinity
                ? "unlimited"
                : fmtNumber(result.perksToBreakeven)}
            </strong>{" "}
            perks of {fmtCurrency(pc)} each before total cost equals one
            customer's {fmtCurrency(ltvN)} lifetime value. Each perk costs you{" "}
            {fmtCurrency(pc)} — way less than a paid ad CAC.
          </p>
        </div>

        <h2 className="mt-12 font-heading text-2xl italic text-brand-white">
          For the first 100 customers
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Stat
            label="Total perk cost"
            value={fmtCurrency(result.cost100)}
            sub="100 customers × perk cost"
          />
          <Stat
            label="Projected revenue"
            value={fmtCurrency(result.revenue100)}
            sub="100 × avg LTV"
            tone="success"
          />
          <Stat
            label="Net profit"
            value={fmtCurrency(result.netProfit100)}
            sub="revenue − perk cost"
            tone={result.netProfit100 > 0 ? "success" : "warning"}
          />
          <Stat
            label="LTV:CAC ratio"
            value={
              result.ltvCacRatio === Infinity
                ? "∞"
                : `${result.ltvCacRatio.toFixed(1)}:1`
            }
            sub="3:1 is healthy, 5:1+ is great"
            tone={result.ltvCacRatio >= 3 ? "success" : "warning"}
          />
        </div>

        <div className="mt-8 rounded-2xl border border-brand-border bg-brand-bg/40 p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
            How to read this
          </p>
          <p className="mt-3 text-sm leading-relaxed text-brand-dim">
            A perk program works when LTV:CAC is at least 3:1. Yours is{" "}
            <strong
              className={
                result.ltvCacRatio >= 3 ? "text-brand-green" : "text-brand-amber"
              }
            >
              {result.ltvCacRatio === Infinity
                ? "∞"
                : `${result.ltvCacRatio.toFixed(1)}:1`}
            </strong>
            . {result.ltvCacRatio >= 5
              ? "Excellent — scale aggressively."
              : result.ltvCacRatio >= 3
                ? "Healthy. Worth running."
                : "Tight — lower perk cost or grow LTV before scaling."}
          </p>
        </div>

        <div className="mt-12 rounded-2xl border border-brand-border bg-brand-surface/30 p-8 text-center">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Run this program live with Social Perks.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-dim">
            Set the perk, set the action (review, post, referral) — we track
            redemptions and ROI in real time. No spreadsheet required.
          </p>
          <Link
            href="/ai"
            className="mt-6 inline-block rounded-xl bg-brand-cyan px-7 py-3 text-sm font-semibold text-brand-bg transition hover:bg-cyan-300"
          >
            See how it works →
          </Link>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  prefix,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
        {label}
      </span>
      <div className="mt-2 flex items-center rounded-xl border border-brand-border bg-brand-surface/50 focus-within:border-brand-cyan/40">
        {prefix && <span className="pl-3 text-sm text-brand-muted">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-3 py-3 text-base text-brand-white outline-none"
          placeholder="0"
        />
      </div>
      {hint && <span className="mt-1.5 block text-xs text-brand-muted">{hint}</span>}
    </label>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "success" | "warning";
}) {
  const colorClass =
    tone === "success"
      ? "text-brand-green"
      : tone === "warning"
        ? "text-brand-amber"
        : "text-brand-white";
  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface/30 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
        {label}
      </p>
      <p className={`mt-2 font-heading text-2xl italic ${colorClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-brand-muted">{sub}</p>}
    </div>
  );
}
