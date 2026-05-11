"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const TIPS = [
  {
    title: "Batch content creation",
    body: "Block 2 hours weekly to shoot 10 pieces of content. Beats posting daily by 3x.",
  },
  {
    title: "Repurpose, don't recreate",
    body: "One blog post = 4 IG posts + 8 stories + 1 video + 1 newsletter. Multiply hours.",
  },
  {
    title: "Pay customers for content",
    body: "A $10 perk for a real customer photo beats $200 in ads — and feels authentic.",
  },
  {
    title: "Use scheduling tools",
    body: "Buffer, Later, or built-in tools save ~3 hours/week. Free tier usually enough.",
  },
  {
    title: "Track only what matters",
    body: "Followers don't pay bills. Track DMs, link clicks, in-store mentions, redemptions.",
  },
  {
    title: "Stop posting to platforms that don't convert",
    body: "Audit each platform monthly. Kill the bottom one. Concentrate effort on winners.",
  },
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
  return `${n.toFixed(0)}%`;
}

export default function SocialMediaRoiCalculatorPage() {
  const [hours, setHours] = useState("8");
  const [hourlyCost, setHourlyCost] = useState("35");
  const [newCustomers, setNewCustomers] = useState("4");
  const [ltv, setLtv] = useState("250");

  const hrs = parseFloat(hours) || 0;
  const cost = parseFloat(hourlyCost) || 0;
  const cust = parseFloat(newCustomers) || 0;
  const ltvN = parseFloat(ltv) || 0;

  const results = useMemo(() => {
    const weeklyCost = hrs * cost;
    const monthlyCost = weeklyCost * 4.33;
    const monthlyValue = cust * ltvN;
    const roi = monthlyCost > 0 ? ((monthlyValue - monthlyCost) / monthlyCost) * 100 : 0;
    const breakevenHours = cost > 0 ? monthlyValue / cost / 4.33 : 0;
    return { weeklyCost, monthlyCost, monthlyValue, roi, breakevenHours };
  }, [hrs, cost, cust, ltvN]);

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
          Social Media ROI Calculator
        </h1>
        <p className="mt-4 max-w-2xl text-brand-dim">
          Most small businesses don't know if Instagram is paying off. Plug in
          hours and customers — find out in 10 seconds.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Field label="Hours/week on social" value={hours} onChange={setHours} suffix="hrs" hint="be honest — include planning + posting" />
          <Field label="Your hourly value" value={hourlyCost} onChange={setHourlyCost} prefix="$" hint="what your time is worth" />
          <Field label="New customers/mo from social" value={newCustomers} onChange={setNewCustomers} hint="how you'd answer 'how'd you hear about us'" />
          <Field label="Avg customer LTV" value={ltv} onChange={setLtv} prefix="$" hint="lifetime revenue per customer" />
        </div>

        <div className="mt-10 rounded-2xl border border-brand-border bg-brand-surface/50 p-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <Metric label="Monthly time cost" value={fmtCurrency(results.monthlyCost)} />
            <Metric label="Monthly value generated" value={fmtCurrency(results.monthlyValue)} />
            <Metric
              label="ROI"
              value={fmtPct(results.roi)}
              tone={results.roi > 0 ? "primary" : "warning"}
            />
            <Metric
              label="Breakeven hours/wk"
              value={`${results.breakevenHours.toFixed(1)} hrs`}
              hint="hours before you'd lose money"
            />
          </div>
          <p className="mt-6 text-sm leading-relaxed text-brand-dim">
            You spend{" "}
            <strong className="text-brand-white">{fmtCurrency(results.monthlyCost)}</strong>{" "}
            in time per month and generate{" "}
            <strong className="text-brand-white">{fmtCurrency(results.monthlyValue)}</strong>{" "}
            in customer value. ROI:{" "}
            <strong className={results.roi > 0 ? "text-brand-green" : "text-brand-amber"}>
              {fmtPct(results.roi)}
            </strong>
            .
          </p>
        </div>

        <h2 className="mt-12 font-heading text-2xl italic text-brand-white">
          How to improve ROI
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {TIPS.map((tip) => (
            <div key={tip.title} className="rounded-xl border border-brand-border bg-brand-surface/30 p-5">
              <p className="font-medium text-brand-white">{tip.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-brand-dim">{tip.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-brand-border bg-brand-surface/30 p-8 text-center">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Get back your hours.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-dim">
            Social Perks pays your customers to post for you. Less time on your
            phone, more authentic content, real ROI.
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

function Metric({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "primary" | "warning";
  hint?: string;
}) {
  const valueColor = tone === "warning" ? "text-brand-amber" : "text-brand-white";
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
        {label}
      </p>
      <p className={`mt-1 font-heading text-2xl italic ${valueColor}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-brand-muted">{hint}</p>}
    </div>
  );
}
