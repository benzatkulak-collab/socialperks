"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Stage = "startup" | "established" | "scaling";

interface BusinessType {
  slug: string;
  label: string;
  multiplier: number; // adjusts the recommended % within stage range
}

const TYPES: BusinessType[] = [
  { slug: "restaurant", label: "Restaurant", multiplier: 1.0 },
  { slug: "retail", label: "Retail", multiplier: 1.1 },
  { slug: "salon", label: "Salon / Spa", multiplier: 1.0 },
  { slug: "gym", label: "Gym / Fitness", multiplier: 1.2 },
  { slug: "service", label: "Service Business", multiplier: 0.9 },
  { slug: "ecommerce", label: "E-commerce", multiplier: 1.3 },
  { slug: "saas", label: "SaaS / Tech", multiplier: 1.5 },
  { slug: "other", label: "Other", multiplier: 1.0 },
];

interface StageInfo {
  range: [number, number];
  label: string;
  detail: string;
}

const STAGE_INFO: Record<Stage, StageInfo> = {
  startup: {
    range: [15, 25],
    label: "Startup (0-2 yrs)",
    detail: "Heavy investment in awareness. Most new businesses fail because nobody knows they exist.",
  },
  established: {
    range: [5, 10],
    label: "Established (3+ yrs, steady)",
    detail: "Maintain awareness, defend share. Most cash to operations.",
  },
  scaling: {
    range: [10, 15],
    label: "Scaling (growing 20%+ YoY)",
    detail: "Press the gas — proven product, expand reach.",
  },
};

const CHANNELS = [
  { label: "Paid ads", pct: 30, color: "bg-brand-cyan" },
  { label: "Content (social/blog)", pct: 25, color: "bg-brand-green" },
  { label: "Tools & software", pct: 15, color: "bg-brand-amber" },
  { label: "Events / community", pct: 10, color: "bg-purple-400" },
  { label: "Other (PR, influencer, perks)", pct: 20, color: "bg-pink-400" },
];

function fmtCurrency(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function MarketingBudgetCalculatorPage() {
  const [revenue, setRevenue] = useState("500000");
  const [type, setType] = useState<string>("retail");
  const [stage, setStage] = useState<Stage>("established");

  const rev = parseFloat(revenue) || 0;

  const result = useMemo(() => {
    const info = STAGE_INFO[stage];
    const businessType = TYPES.find((t) => t.slug === type) || TYPES[0];
    const lowPct = info.range[0] * businessType.multiplier;
    const highPct = info.range[1] * businessType.multiplier;
    const midPct = (lowPct + highPct) / 2;
    const lowAmt = rev * (lowPct / 100);
    const highAmt = rev * (highPct / 100);
    const midAmt = rev * (midPct / 100);
    return { lowPct, highPct, midPct, lowAmt, highAmt, midAmt, info, businessType };
  }, [rev, type, stage]);

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
          Marketing Budget Calculator
        </h1>
        <p className="mt-4 max-w-2xl text-brand-dim">
          How much should you spend on marketing? Based on revenue, business type,
          and growth stage. Plus a channel breakdown so you don't waste it on one
          thing.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <Field label="Annual revenue" value={revenue} onChange={setRevenue} prefix="$" />
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
              Business type
            </span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-2 w-full rounded-xl border border-brand-border bg-brand-surface/50 px-3 py-3 text-base text-brand-white outline-none focus:border-brand-cyan/40"
            >
              {TYPES.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
              Growth stage
            </span>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as Stage)}
              className="mt-2 w-full rounded-xl border border-brand-border bg-brand-surface/50 px-3 py-3 text-base text-brand-white outline-none focus:border-brand-cyan/40"
            >
              <option value="startup">Startup (0–2 yrs)</option>
              <option value="established">Established (steady)</option>
              <option value="scaling">Scaling (20%+ YoY)</option>
            </select>
          </label>
        </div>

        <div className="mt-10 rounded-2xl border border-brand-border bg-brand-surface/50 p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
            Recommended marketing budget
          </p>
          <p className="mt-3 font-heading text-5xl italic text-brand-cyan">
            {fmtCurrency(result.midAmt)}
            <span className="ml-2 align-middle text-xl text-brand-muted">/yr</span>
          </p>
          <p className="mt-2 text-sm text-brand-dim">
            Range: {fmtCurrency(result.lowAmt)} – {fmtCurrency(result.highAmt)} (
            {result.lowPct.toFixed(1)}%–{result.highPct.toFixed(1)}% of revenue) ·
            ≈ {fmtCurrency(result.midAmt / 12)}/mo
          </p>
          <p className="mt-4 text-sm leading-relaxed text-brand-dim">
            {result.info.detail}
          </p>
        </div>

        <h2 className="mt-12 font-heading text-2xl italic text-brand-white">
          Channel breakdown
        </h2>
        <p className="mt-2 text-sm text-brand-dim">
          A balanced split based on what's worked for SMBs.
        </p>

        <div className="mt-6 space-y-4">
          {CHANNELS.map((ch) => {
            const amount = (result.midAmt * ch.pct) / 100;
            return (
              <div key={ch.label} className="rounded-xl border border-brand-border bg-brand-surface/30 p-5">
                <div className="flex items-baseline justify-between">
                  <p className="font-medium text-brand-white">{ch.label}</p>
                  <p className="font-mono text-sm text-brand-text">
                    {fmtCurrency(amount)} <span className="text-brand-muted">/yr</span>
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-bg">
                  <div
                    className={`h-full ${ch.color}`}
                    style={{ width: `${ch.pct}%` }}
                  />
                </div>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                  {ch.pct}% of budget · {fmtCurrency(amount / 12)}/mo
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-brand-border bg-brand-surface/30 p-8 text-center">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Stretch your budget further.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-dim">
            Customer perk programs typically return $4-7 per $1 spent — the best
            line on the "Other" allocation. See where it fits.
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
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
    </label>
  );
}
