"use client";

import { useState, useEffect } from "react";

interface EarningsResponse {
  last90Days: { cents: number; dollars: number };
  lifetime: { cents: number; dollars: number };
  recent: Array<{
    submissionId: string;
    amountDollars: number;
    currency: string;
    campaignId: string;
    businessId: string;
    awardedAt: string;
    paidOut: boolean;
  }>;
}

/**
 * "I just earned $X" — Phase 18 viral surface.
 *
 * Shown at the top of the influencer dashboard. Each recent earning
 * gets a one-tap share button that opens a Twitter/IG-story compose
 * with the OG card from /api/og/influencer.
 */
export function ShareableWins() {
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.origin);
    }
    fetch("/api/v1/influencers/me/earnings", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setData(j.data as EarningsResponse);
      })
      .catch(() => { /* silent */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-6 animate-pulse">
        <div className="h-4 w-24 rounded bg-brand-bg" />
        <div className="mt-3 h-8 w-32 rounded bg-brand-bg" />
      </div>
    );
  }

  if (!data) return null;
  if (data.lifetime.cents === 0) return null;

  function tweetUrl(amount: number) {
    const text = encodeURIComponent(
      `Just earned $${amount} posting for a local business on @socialperks 🎤 ${shareUrl}`,
    );
    return `https://twitter.com/intent/tweet?text=${text}`;
  }

  return (
    <section
      aria-labelledby="wins-heading"
      className="rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 via-brand-cyan/5 to-transparent p-6 sm:p-8"
    >
      <div className="flex items-baseline justify-between">
        <p
          id="wins-heading"
          className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan"
        >
          Your earnings
        </p>
        <p className="font-mono text-xs text-brand-muted">last 90 days</p>
      </div>

      <p className="mt-3 font-heading text-4xl italic text-brand-white sm:text-5xl">
        ${data.last90Days.dollars.toFixed(0)}
      </p>
      <p className="mt-1 text-sm text-brand-dim">
        Lifetime: <strong className="text-brand-white">${data.lifetime.dollars.toFixed(0)}</strong>
      </p>

      {data.recent.length > 0 && (
        <div className="mt-5 space-y-2">
          {data.recent.slice(0, 3).map((e) => (
            <div
              key={e.submissionId}
              className="flex items-center justify-between gap-3 rounded-xl border border-brand-border/40 bg-brand-bg/50 px-4 py-3"
            >
              <div>
                <p className="font-mono text-xs text-brand-cyan">
                  +${e.amountDollars.toFixed(2)}
                </p>
                <p className="text-xs text-brand-muted">
                  {new Date(e.awardedAt).toLocaleDateString()}
                  {" · "}
                  {e.paidOut ? "paid out" : "scheduled"}
                </p>
              </div>
              <a
                href={tweetUrl(Math.round(e.amountDollars))}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-brand-border bg-brand-surface px-3 py-1.5 text-xs font-medium text-brand-text transition-colors hover:border-brand-cyan/50 hover:text-brand-cyan"
              >
                Share win →
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
