"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

interface Benchmark {
  label: string;
  netLow: number;
  netHigh: number;
  grossTypical: number;
}

const BENCHMARKS: Benchmark[] = [
  { label: "Restaurants", netLow: 3, netHigh: 5, grossTypical: 67 },
  { label: "Salons & Spas", netLow: 10, netHigh: 15, grossTypical: 80 },
  { label: "Retail", netLow: 5, netHigh: 10, grossTypical: 50 },
  { label: "Professional Services", netLow: 15, netHigh: 25, grossTypical: 70 },
  { label: "Coffee Shops", netLow: 2, netHigh: 7, grossTypical: 70 },
  { label: "Fitness / Yoga", netLow: 10, netHigh: 20, grossTypical: 75 },
];

function fmtCurrency(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export default function ProfitMarginCalculatorPage() {
  const [revenue, setRevenue] = useState("50000");
  const [cogs, setCogs] = useState("18000");
  const [opex, setOpex] = useState("22000");
  const [benchmark, setBenchmark] = useState<string>("Restaurants");

  const r = parseFloat(revenue) || 0;
  const c = parseFloat(cogs) || 0;
  const o = parseFloat(opex) || 0;

  const results = useMemo(() => {
    const gross = r - c;
    const net = r - c - o;
    const grossPct = r > 0 ? (gross / r) * 100 : 0;
    const netPct = r > 0 ? (net / r) * 100 : 0;
    return { gross, net, grossPct, netPct };
  }, [r, c, o]);

  const active = BENCHMARKS.find((b) => b.label === benchmark);
  const verdict = active
    ? results.netPct < active.netLow
      ? "below"
      : results.netPct > active.netHigh
        ? "above"
        : "within"
    : "within";

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
          Profit Margin Calculator
        </h1>
        <p className="mt-4 max-w-2xl text-brand-dim">
          Gross and net margin in seconds — compared to industry benchmarks for
          small businesses. Revenue minus COGS minus opex tells the truth.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <Field label="Revenue" value={revenue} onChange={setRevenue} hint="total sales for the period" />
          <Field label="COGS" value={cogs} onChange={setCogs} hint="cost of goods sold" />
          <Field label="Operating expenses" value={opex} onChange={setOpex} hint="rent, payroll, marketing" />
        </div>

        <div className="mt-8">
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
              Compare to industry
            </span>
            <select
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value)}
              className="mt-2 w-full rounded-xl border border-brand-border bg-brand-surface/50 px-3 py-3 text-base text-brand-white outline-none focus:border-brand-cyan/40"
            >
              {BENCHMARKS.map((b) => (
                <option key={b.label} value={b.label}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Results */}
        <div className="mt-10 rounded-2xl border border-brand-border bg-brand-surface/50 p-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <Metric label="Gross profit" value={fmtCurrency(results.gross)} />
            <Metric label="Net profit" value={fmtCurrency(results.net)} tone={results.net < 0 ? "warning" : "primary"} />
            <Metric label="Gross margin" value={fmtPct(results.grossPct)} />
            <Metric label="Net margin" value={fmtPct(results.netPct)} tone={results.netPct < 0 ? "warning" : "primary"} />
          </div>

          {active && (
            <div className="mt-8 rounded-xl border border-brand-border bg-brand-bg/40 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                Benchmark: {active.label}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-brand-dim">
                Typical net margin: <strong className="text-brand-white">{active.netLow}%–{active.netHigh}%</strong>.
                Typical gross margin: <strong className="text-brand-white">~{active.grossTypical}%</strong>.
              </p>
              <p
                className={`mt-3 text-sm font-medium ${
                  verdict === "above"
                    ? "text-brand-green"
                    : verdict === "below"
                      ? "text-brand-amber"
                      : "text-brand-cyan"
                }`}
              >
                {verdict === "above" &&
                  `Your ${results.netPct.toFixed(1)}% net margin beats the typical ${active.label.toLowerCase()} range. Strong unit economics.`}
                {verdict === "below" &&
                  `Your ${results.netPct.toFixed(1)}% net margin is below the typical ${active.label.toLowerCase()} range. Look at COGS first, then opex.`}
                {verdict === "within" &&
                  `Your ${results.netPct.toFixed(1)}% net margin is within the typical range for ${active.label.toLowerCase()}.`}
              </p>
            </div>
          )}
        </div>

        <div className="mt-12 rounded-2xl border border-brand-border bg-brand-surface/30 p-8 text-center">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Lift margins by lowering CAC.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-dim">
            Social Perks gives small perks for customer-generated marketing —
            cutting paid acquisition costs and improving net margin without
            cutting service.
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
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
        {label}
      </span>
      <div className="mt-2 flex items-center rounded-xl border border-brand-border bg-brand-surface/50 focus-within:border-brand-cyan/40">
        <span className="pl-3 text-sm text-brand-muted">$</span>
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

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "primary" | "warning";
}) {
  const valueColor = tone === "warning" ? "text-brand-amber" : "text-brand-white";
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
        {label}
      </p>
      <p className={`mt-1 font-heading text-2xl italic ${valueColor}`}>{value}</p>
    </div>
  );
}
