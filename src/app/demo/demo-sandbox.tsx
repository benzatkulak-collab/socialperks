"use client";

/**
 * Interactive sandbox at /demo. Lets a visitor walk through the
 * full Social Perks loop — pick a business type, pick a perk, see
 * the QR poster, see the post-purchase SMS — without ever signing up.
 *
 * No external API calls. The poster URL points at the real
 * /api/v1/businesses/poster route (which generates a real QR code via
 * the qrcode library), but the campaign id is a stable demo string.
 * Everything else is computed locally so the page works offline-ish
 * and never costs us anything to serve.
 */

import { useState, useMemo } from "react";

type BusinessType = "coffee_shop" | "salon" | "gym" | "restaurant";

interface BusinessPreset {
  id: BusinessType;
  emoji: string;
  label: string;
  exampleName: string;
  perks: { value: string; type: "pct" | "dol" | "free"; label: string }[];
  reachEstimate: string;
}

const BUSINESSES: BusinessPreset[] = [
  {
    id: "coffee_shop",
    emoji: "☕",
    label: "Coffee shop",
    exampleName: "Maria's Coffee",
    perks: [
      { value: "15", type: "pct", label: "15% off next visit" },
      { value: "1", type: "dol", label: "$1 off any drink" },
      { value: "free", type: "free", label: "Free pastry with any drink" },
    ],
    reachEstimate: "Most posts reach 800+ people, mostly walking-distance local.",
  },
  {
    id: "salon",
    emoji: "💇",
    label: "Salon",
    exampleName: "Bloom Salon",
    perks: [
      { value: "20", type: "pct", label: "20% off next service" },
      { value: "10", type: "dol", label: "$10 off any cut" },
      { value: "free", type: "free", label: "Free deep-conditioning treatment" },
    ],
    reachEstimate: "Salon posts skew higher-engagement — typical 1,200+ reach.",
  },
  {
    id: "gym",
    emoji: "🏋️",
    label: "Gym",
    exampleName: "Iron Forge",
    perks: [
      { value: "free", type: "free", label: "Free week pass for posting" },
      { value: "30", type: "pct", label: "30% off first month" },
      { value: "25", type: "dol", label: "$25 off membership" },
    ],
    reachEstimate: "Workout posts typically reach 600-1,500 fitness-curious followers.",
  },
  {
    id: "restaurant",
    emoji: "🍽️",
    label: "Restaurant",
    exampleName: "Stone Hearth",
    perks: [
      { value: "free", type: "free", label: "Free appetizer with entrée" },
      { value: "15", type: "pct", label: "15% off next dinner" },
      { value: "10", type: "dol", label: "$10 off bill of $40+" },
    ],
    reachEstimate: "Food posts have the highest engagement on IG — 1,000-2,000 reach.",
  },
];

export function DemoSandbox() {
  const [bizId, setBizId] = useState<BusinessType>("coffee_shop");
  const [perkIdx, setPerkIdx] = useState(0);

  const biz = useMemo(() => BUSINESSES.find((b) => b.id === bizId)!, [bizId]);
  const perk = biz.perks[perkIdx] ?? biz.perks[0]!;

  // Stable demo campaign id so refreshes don't break the poster URL cache.
  const campaignId = `demo_${bizId}_${perkIdx}`;
  const posterUrl = `/api/v1/businesses/poster?campaignId=${encodeURIComponent(
    campaignId,
  )}&businessName=${encodeURIComponent(biz.exampleName)}&perk=${encodeURIComponent(
    perk.label,
  )}`;

  const smsBody = `Hey from ${biz.exampleName}! Thanks for stopping by. Post about us on IG/TikTok and we'll cover your next visit with ${perk.label.toLowerCase()}: socialperks.io/c/${campaignId}?ref=sms\n\nReply STOP to opt out.`;

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-2">
      {/* ─── Left column: pickers ─────────────────────────────────────── */}
      <div>
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
          Step 1 — pick a business type
        </p>
        <div className="grid grid-cols-2 gap-2">
          {BUSINESSES.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setBizId(b.id);
                setPerkIdx(0);
              }}
              className={`rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                bizId === b.id
                  ? "border-brand-cyan bg-brand-cyan/[0.07]"
                  : "border-brand-border bg-brand-surface/30 hover:border-brand-cyan/40"
              }`}
            >
              <span className="text-2xl" aria-hidden>
                {b.emoji}
              </span>
              <p className="mt-2 text-sm font-semibold text-brand-white">{b.label}</p>
              <p className="mt-0.5 text-xs text-brand-muted">{b.exampleName}</p>
            </button>
          ))}
        </div>

        <p className="mt-8 mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
          Step 2 — pick a perk
        </p>
        <div className="space-y-2">
          {biz.perks.map((p, idx) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setPerkIdx(idx)}
              className={`block w-full rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                idx === perkIdx
                  ? "border-brand-cyan bg-brand-cyan/[0.07]"
                  : "border-brand-border bg-brand-surface/30 hover:border-brand-cyan/40"
              }`}
            >
              <p className="text-sm font-semibold text-brand-white">{p.label}</p>
              <p className="mt-0.5 text-xs text-brand-muted">
                {p.type === "pct"
                  ? "Discount %"
                  : p.type === "dol"
                  ? "Discount $"
                  : "Free item"}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-brand-border/50 bg-brand-elevated/30 px-4 py-3 text-xs text-brand-dim">
          {biz.reachEstimate}
        </div>
      </div>

      {/* ─── Right column: outputs ─────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Poster preview */}
        <div className="rounded-2xl border border-brand-cyan/20 bg-brand-cyan/[0.04] p-5">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
            Step 3 — your printable poster
          </p>
          <a
            href={posterUrl}
            target="_blank"
            rel="noopener"
            className="block rounded-lg overflow-hidden border border-brand-border bg-white shadow-lg transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50"
            aria-label="Open full-size poster in a new tab"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterUrl}
              alt={`Demo QR poster for ${biz.exampleName}`}
              className="w-full h-auto"
            />
          </a>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={posterUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90"
            >
              Open & print
            </a>
            <a
              href={posterUrl}
              download={`socialperks-demo-${campaignId}.svg`}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-surface/50 px-4 py-2 text-sm font-semibold text-brand-text transition-all hover:bg-brand-surface"
            >
              Download SVG
            </a>
          </div>
          <p className="mt-3 text-xs text-brand-muted">
            That QR is real. Scan it with your phone — it'll land on a demo
            redemption page so you can see the customer flow end-to-end.
          </p>
        </div>

        {/* SMS preview */}
        <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/30 p-5">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
            Step 4 — the post-purchase SMS we'd send
          </p>
          <div className="rounded-lg bg-brand-bg/60 p-4 font-mono text-xs leading-relaxed text-brand-text/90 whitespace-pre-wrap">
            {smsBody}
          </div>
          <p className="mt-3 text-xs text-brand-muted">
            Sent 2 hours after a customer pays via your POS (Square, Toast, or
            Clover). Opt-out is one-tap. Disabled per-customer if they reply STOP.
          </p>
        </div>

        {/* What happens next */}
        <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/30 p-5">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
            Step 5 — what happens after a post
          </p>
          <ol className="space-y-2 text-xs text-brand-dim">
            <li className="flex gap-2">
              <span className="font-mono text-brand-cyan shrink-0">1.</span>
              <span>Customer posts on IG/TikTok with FTC-compliant disclosure (auto-injected).</span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-brand-cyan shrink-0">2.</span>
              <span>We verify the post via the platform's API (or platform webhook).</span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-brand-cyan shrink-0">3.</span>
              <span>Customer's perk wallet shows the redemption code.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-brand-cyan shrink-0">4.</span>
              <span>Customer shows it at the counter, you tap "Mark redeemed", done.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-brand-cyan shrink-0">5.</span>
              <span>The post lives forever as social proof — friends scan, become customers.</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
