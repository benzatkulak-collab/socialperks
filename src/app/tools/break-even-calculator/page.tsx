"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface Preset {
  label: string;
  fixed: number;
  variable: number;
  price: number;
  hint: string;
}

const PRESETS: Record<string, Preset> = {
  restaurant: {
    label: "Restaurant",
    fixed: 18000,
    variable: 8,
    price: 24,
    hint: "rent + payroll + utilities, avg ticket $24, food cost ~33%",
  },
  salon: {
    label: "Salon",
    fixed: 9500,
    variable: 12,
    price: 65,
    hint: "rent + stylists + supplies, avg service $65",
  },
  retail: {
    label: "Retail",
    fixed: 12000,
    variable: 18,
    price: 45,
    hint: "rent + staff, COGS ~40% of price",
  },
  service: {
    label: "Service",
    fixed: 6000,
    variable: 35,
    price: 150,
    hint: "office + tools + 1099s, avg billable $150",
  },
};

function formatCurrency(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatNumber(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export default function BreakEvenCalculatorPage() {
  const [fixed, setFixed] = useState<string>("12000");
  const [variable, setVariable] = useState<string>("15");
  const [price, setPrice] = useState<string>("45");
  const [ltv, setLtv] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  // Hydrate from URL params
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("f")) setFixed(p.get("f") || "");
    if (p.get("v")) setVariable(p.get("v") || "");
    if (p.get("p")) setPrice(p.get("p") || "");
    if (p.get("l")) setLtv(p.get("l") || "");
  }, []);

  const fixedN = parseFloat(fixed) || 0;
  const variableN = parseFloat(variable) || 0;
  const priceN = parseFloat(price) || 0;
  const ltvN = parseFloat(ltv) || 0;

  const results = useMemo(() => {
    const contribution = priceN - variableN;
    const margin = priceN > 0 ? (contribution / priceN) * 100 : 0;
    const units = contribution > 0 ? Math.ceil(fixedN / contribution) : Infinity;
    const revenue = units === Infinity ? Infinity : units * priceN;
    // months to break even if avg new customer LTV given (rough — fixed costs covered by LTV stream)
    const months =
      ltvN > 0 && contribution > 0
        ? Math.ceil(fixedN / (ltvN * (contribution / priceN)))
        : null;
    return { contribution, margin, units, revenue, months };
  }, [fixedN, variableN, priceN, ltvN]);

  const applyPreset = (key: string) => {
    const preset = PRESETS[key];
    if (!preset) return;
    setFixed(String(preset.fixed));
    setVariable(String(preset.variable));
    setPrice(String(preset.price));
  };

  const copyResult = async () => {
    const text = `Break-even analysis
Fixed costs: ${formatCurrency(fixedN)}/mo
Variable cost/unit: ${formatCurrency(variableN)}
Price/unit: ${formatCurrency(priceN)}
Contribution margin: ${formatCurrency(results.contribution)} (${results.margin.toFixed(1)}%)
Break-even: ${formatNumber(results.units)} units / ${formatCurrency(results.revenue)}
${results.months ? `Time to break even: ${results.months} months` : ""}
— from Social Perks`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const shareLink = async () => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams();
    p.set("f", fixed);
    p.set("v", variable);
    p.set("p", price);
    if (ltv) p.set("l", ltv);
    const url = `${window.location.origin}${window.location.pathname}?${p.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      /* ignore */
    }
  };

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
          Break-Even Calculator
        </h1>
        <p className="mt-4 max-w-2xl text-brand-dim">
          How many units do you need to sell to cover your costs? Pick an
          industry to pre-fill typical numbers, or enter your own. Updates as you
          type.
        </p>

        {/* Presets */}
        <div className="mt-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
            Industry presets
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([key, p]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className="rounded-full border border-brand-border bg-brand-surface/50 px-4 py-1.5 text-sm text-brand-text transition hover:border-brand-cyan/40 hover:bg-brand-surface"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Field
            label="Fixed costs (monthly)"
            hint="rent, salaries, software"
            value={fixed}
            onChange={setFixed}
            prefix="$"
          />
          <Field
            label="Variable cost per unit"
            hint="materials, payment fees, etc."
            value={variable}
            onChange={setVariable}
            prefix="$"
          />
          <Field
            label="Price per unit"
            hint="what you charge"
            value={price}
            onChange={setPrice}
            prefix="$"
          />
          <Field
            label="Avg customer LTV (optional)"
            hint="enable months-to-breakeven"
            value={ltv}
            onChange={setLtv}
            prefix="$"
          />
        </div>

        {/* Results */}
        <div className="mt-10 rounded-2xl border border-brand-border bg-brand-surface/50 p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
            Your break-even point
          </p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <Metric
              label="Units to sell"
              value={
                results.units === Infinity ? "Not profitable" : formatNumber(results.units)
              }
              tone={results.units === Infinity ? "warning" : "primary"}
            />
            <Metric
              label="Revenue needed"
              value={
                results.revenue === Infinity ? "—" : formatCurrency(results.revenue)
              }
            />
            <Metric
              label="Contribution margin"
              value={`${formatCurrency(results.contribution)} (${results.margin.toFixed(1)}%)`}
            />
            <Metric
              label="Months to break even"
              value={results.months ? `${results.months} mo` : "Enter LTV"}
            />
          </div>

          {results.units !== Infinity && (
            <p className="mt-6 text-sm leading-relaxed text-brand-dim">
              At {formatCurrency(priceN)} per unit with {formatCurrency(variableN)} variable
              cost, every sale contributes {formatCurrency(results.contribution)} toward
              your {formatCurrency(fixedN)}/mo fixed costs. You break even at{" "}
              <strong className="text-brand-white">{formatNumber(results.units)} units</strong>
              .
            </p>
          )}
          {results.units === Infinity && (
            <p className="mt-6 text-sm leading-relaxed text-brand-amber">
              Your variable cost per unit is higher than your price. You lose money on
              every sale — raise prices or cut variable costs to break even.
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={copyResult}
              className="rounded-xl border border-brand-border bg-brand-surface px-5 py-2.5 text-sm font-medium text-brand-text transition hover:border-brand-cyan/40"
            >
              {copied ? "Copied ✓" : "Copy result"}
            </button>
            <button
              onClick={shareLink}
              className="rounded-xl border border-brand-border bg-brand-surface px-5 py-2.5 text-sm font-medium text-brand-text transition hover:border-brand-cyan/40"
            >
              {shared ? "Link copied ✓" : "Share link"}
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-brand-border bg-brand-surface/30 p-8 text-center">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Once you break even, grow with Social Perks.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-dim">
            Turn customers into your marketing team. Offer small perks in exchange
            for reviews, posts, and referrals — and watch unit economics improve.
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
  hint,
  value,
  onChange,
  prefix,
}: {
  label: string;
  hint?: string;
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
        {prefix && (
          <span className="pl-3 text-sm text-brand-muted">{prefix}</span>
        )}
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-3 py-3 text-base text-brand-white outline-none placeholder:text-brand-muted"
          placeholder="0"
        />
      </div>
      {hint && (
        <span className="mt-1.5 block text-xs text-brand-muted">{hint}</span>
      )}
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
  const valueColor =
    tone === "warning" ? "text-brand-amber" : "text-brand-white";
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
        {label}
      </p>
      <p className={`mt-1 font-heading text-2xl italic ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}
