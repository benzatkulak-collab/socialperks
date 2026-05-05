"use client";

import { useState } from "react";

/**
 * ROI calculator — phase 116/117/317. Plain math, server-renderable
 * shell. The numbers that drive the visual story:
 *   - perk cost = posts × discount $ value (e.g. 15% off a $7 latte = $1.05)
 *   - estimated reach = posts × avg_followers (heuristic)
 *   - paid-ad equivalent = reach × CPM_ig / 1000
 */

export function CalculatorClient() {
  const [posts, setPosts] = useState(50);
  const [perkDollarValue, setPerkDollarValue] = useState(2);
  const [avgFollowers, setAvgFollowers] = useState(800);

  const cpmInstagram = 8;       // current US average for SMB IG ads
  const reach = posts * avgFollowers;
  const adEquivalentDollars = (reach / 1000) * cpmInstagram;
  const perkCostDollars = posts * perkDollarValue;
  const platformFeeDollars = 49; // Pro plan monthly
  const monthlyTotalDollars = perkCostDollars + platformFeeDollars;
  const savingsDollars = adEquivalentDollars - monthlyTotalDollars;
  const roiPct = monthlyTotalDollars > 0 ? Math.round((savingsDollars / monthlyTotalDollars) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-6 sm:p-8">
        <NumberField
          label="Posts per month from your customers"
          value={posts}
          onChange={setPosts}
          hint="Most coffee shops on Pro plan see 30-80/mo."
          min={1}
          max={1000}
        />
        <NumberField
          label="Avg dollar value of the perk"
          value={perkDollarValue}
          onChange={setPerkDollarValue}
          hint="e.g. 15% off a $7 latte ≈ $1, or a $2 free pastry."
          min={0}
          max={100}
          step={0.5}
          prefix="$"
        />
        <NumberField
          label="Avg followers per posting customer"
          value={avgFollowers}
          onChange={setAvgFollowers}
          hint="Most local-business customers: 500-1500."
          min={50}
          max={50000}
          step={50}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Your monthly cost" value={`$${monthlyTotalDollars.toLocaleString()}`} sub={`$${perkCostDollars} perks + $${platformFeeDollars} Pro plan`} accent="cyan" />
        <Stat label="Reach generated" value={reach.toLocaleString()} sub="impressions on customer feeds" />
        <Stat label="Same reach on Instagram ads" value={`$${Math.round(adEquivalentDollars).toLocaleString()}`} sub={`@ $${cpmInstagram} CPM`} />
        <Stat label="Net savings" value={savingsDollars >= 0 ? `$${Math.round(savingsDollars).toLocaleString()}` : `-$${Math.abs(Math.round(savingsDollars)).toLocaleString()}`} sub={savingsDollars >= 0 ? `${roiPct}% ROI vs paid ads` : "Paid ads cheaper at this size"} accent={savingsDollars >= 0 ? "green" : "amber"} />
      </div>

      <p className="text-xs text-brand-muted">
        These numbers are estimates. Actual reach depends on platform algorithms, time of day, and audience overlap. The
        floor (verified posts × follower count) is real; the ceiling is usually higher because each post stays up
        forever and accumulates reach over time.
      </p>
    </div>
  );
}

function NumberField({ label, value, onChange, hint, min, max, step = 1, prefix }: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-dim">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted">{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className={`w-full rounded-xl border border-brand-border bg-brand-bg/60 px-4 py-2.5 text-sm text-brand-white placeholder-brand-muted focus:border-brand-cyan/50 focus:outline-none focus:ring-2 focus:ring-brand-cyan/20 ${prefix ? "pl-8" : ""}`}
        />
      </div>
      {hint && <p className="mt-1.5 text-xs text-brand-muted">{hint}</p>}
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: "cyan" | "green" | "amber" }) {
  const accentClass =
    accent === "cyan" ? "text-brand-cyan" :
    accent === "green" ? "text-brand-green" :
    accent === "amber" ? "text-brand-amber" : "text-brand-white";
  return (
    <div className="rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-brand-muted">{label}</p>
      <p className={`mt-2 font-heading text-2xl italic ${accentClass}`}>{value}</p>
      <p className="mt-1 text-xs text-brand-dim">{sub}</p>
    </div>
  );
}
