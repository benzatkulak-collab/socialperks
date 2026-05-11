"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

interface IndustryLtv {
  label: string;
  low: number;
  high: number;
}

const INDUSTRY_LTV: IndustryLtv[] = [
  { label: "Coffee shops", low: 300, high: 1200 },
  { label: "Restaurants", low: 400, high: 1800 },
  { label: "Salons & spas", low: 600, high: 2400 },
  { label: "Gyms & fitness", low: 800, high: 3000 },
  { label: "Yoga studios", low: 700, high: 2200 },
  { label: "Retail boutiques", low: 250, high: 1500 },
  { label: "Bakeries", low: 200, high: 900 },
  { label: "Service businesses", low: 1500, high: 8000 },
  { label: "Subscription/SaaS SMB", low: 1200, high: 6000 },
  { label: "Pet services", low: 600, high: 3000 },
];

function fmtCurrency(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CustomerLifetimeValueCalculatorPage() {
  const [aov, setAov] = useState("45");
  const [purchases, setPurchases] = useState("8");
  const [years, setYears] = useState("3");

  const a = parseFloat(aov) || 0;
  const p = parseFloat(purchases) || 0;
  const y = parseFloat(years) || 0;

  const ltv = useMemo(() => a * p * y, [a, p, y]);
  const annualValue = a * p;

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
          Customer Lifetime Value Calculator
        </h1>
        <p className="mt-4 max-w-2xl text-brand-dim">
          The simple formula: average order × purchases per year × years they
          stay. The number you should never spend more than this to acquire.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <Field label="Average order value" value={aov} onChange={setAov} prefix="$" hint="avg ticket size" />
          <Field label="Purchases per year" value={purchases} onChange={setPurchases} hint="how often they come back" />
          <Field label="Retention years" value={years} onChange={setYears} suffix="yrs" hint="typical loyal-customer lifespan" />
        </div>

        <div className="mt-10 rounded-2xl border border-brand-border bg-brand-surface/50 p-8 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
            One customer is worth
          </p>
          <p className="mt-3 font-heading text-6xl italic text-brand-cyan">
            {fmtCurrency(ltv)}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-brand-dim">
            {fmtCurrency(a)} × {p} purchases/yr × {y} yrs ={" "}
            <strong className="text-brand-white">{fmtCurrency(ltv)} lifetime value</strong>.
            Annual: {fmtCurrency(annualValue)}.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-brand-border bg-brand-bg/40 p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
            How this works
          </p>
          <p className="mt-3 text-sm leading-relaxed text-brand-dim">
            Lifetime Value (LTV) is the total revenue a customer brings over the
            entire time they buy from you. It's the most important number in
            small business marketing — because it sets your acquisition ceiling.
            If LTV is $500, spending $100 to acquire a customer is great; $600 is
            bankruptcy.
          </p>
        </div>

        <h2 className="mt-12 font-heading text-2xl italic text-brand-white">
          Industry benchmarks
        </h2>
        <div className="mt-6 overflow-hidden rounded-2xl border border-brand-border">
          <table className="w-full">
            <thead className="bg-brand-surface/40">
              <tr>
                <th className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                  Industry
                </th>
                <th className="px-5 py-3 text-right font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                  Typical LTV
                </th>
                <th className="px-5 py-3 text-right font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                  vs you
                </th>
              </tr>
            </thead>
            <tbody>
              {INDUSTRY_LTV.map((b) => {
                const status =
                  ltv === 0
                    ? ""
                    : ltv < b.low
                      ? "below"
                      : ltv > b.high
                        ? "above"
                        : "in range";
                return (
                  <tr key={b.label} className="border-t border-brand-border">
                    <td className="px-5 py-3 text-sm text-brand-text">{b.label}</td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-brand-dim">
                      {fmtCurrency(b.low)} – {fmtCurrency(b.high)}
                    </td>
                    <td
                      className={`px-5 py-3 text-right text-sm font-medium ${
                        status === "above"
                          ? "text-brand-green"
                          : status === "below"
                            ? "text-brand-amber"
                            : status === "in range"
                              ? "text-brand-cyan"
                              : "text-brand-muted"
                      }`}
                    >
                      {status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-12 rounded-2xl border border-brand-border bg-brand-surface/30 p-8 text-center">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Increase LTV with perks.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-dim">
            Customers in perk programs come back ~3x more often and refer friends.
            Both increase the inputs to this formula.
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
  suffix,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
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
        {suffix && <span className="pr-3 text-sm text-brand-muted">{suffix}</span>}
      </div>
      {hint && <span className="mt-1.5 block text-xs text-brand-muted">{hint}</span>}
    </label>
  );
}
