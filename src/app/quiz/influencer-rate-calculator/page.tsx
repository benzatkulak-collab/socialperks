"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

type Platform = "instagram" | "tiktok" | "youtube" | "twitter" | "linkedin" | "facebook";

const PLATFORM_BASE_CPM: Record<Platform, number> = {
  // dollars per 1,000 followers (industry midpoint per-post)
  instagram: 12,
  tiktok: 10,
  youtube: 25,
  twitter: 7,
  linkedin: 18,
  facebook: 8,
};

const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  facebook: "Facebook",
};

const NICHE_MULTIPLIERS: Record<string, number> = {
  "Fashion / Beauty": 1.0,
  "Fitness / Wellness": 1.1,
  "Food / Restaurant": 0.9,
  "Travel": 1.05,
  "Tech / SaaS": 1.4,
  "Finance": 1.5,
  "B2B / Professional": 1.3,
  "Parenting / Family": 0.95,
  "Gaming": 0.85,
  "Home / DIY": 0.95,
  "Pets": 0.9,
  "Education": 1.0,
  "Other": 1.0,
};

function formatUSD(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function InfluencerRateCalculatorPage() {
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [followers, setFollowers] = useState<string>("25000");
  const [engagementRate, setEngagementRate] = useState<string>("3.5");
  const [niche, setNiche] = useState<string>("Fashion / Beauty");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const f = Math.max(0, Number(followers) || 0);
    const er = Math.max(0, Number(engagementRate) || 0);
    if (f < 100) {
      return null;
    }
    const baseCpm = PLATFORM_BASE_CPM[platform];
    const nicheMult = NICHE_MULTIPLIERS[niche] ?? 1.0;

    // engagement multiplier: 3% is industry baseline. Higher engagement = more value.
    // er < 1% => 0.7x. 1-2% => 0.85x. 2-3.5% => 1.0x. 3.5-6% => 1.25x. 6%+ => 1.6x.
    let engagementMult: number;
    if (er < 1) engagementMult = 0.7;
    else if (er < 2) engagementMult = 0.85;
    else if (er < 3.5) engagementMult = 1.0;
    else if (er < 6) engagementMult = 1.25;
    else engagementMult = 1.6;

    // Follower tier diminishing returns curve.
    // Nano (<10k): 1.0x   Micro (10-100k): 0.95x   Mid (100k-500k): 0.9x   Macro (500k-1M): 0.85x   Mega (1M+): 0.8x
    let tier: string;
    let tierMult: number;
    if (f < 10000) { tier = "Nano"; tierMult = 1.0; }
    else if (f < 100000) { tier = "Micro"; tierMult = 0.95; }
    else if (f < 500000) { tier = "Mid-tier"; tierMult = 0.9; }
    else if (f < 1000000) { tier = "Macro"; tierMult = 0.85; }
    else { tier = "Mega"; tierMult = 0.8; }

    const baseRate = (f / 1000) * baseCpm * engagementMult * nicheMult * tierMult;
    const low = Math.round(baseRate * 0.75);
    const mid = Math.round(baseRate);
    const high = Math.round(baseRate * 1.4);

    return {
      tier,
      baseCpm,
      engagementMult,
      nicheMult,
      tierMult,
      low,
      mid,
      high,
    };
  }, [platform, followers, engagementRate, niche]);

  async function handleCopy() {
    if (!result) return;
    const text = `Influencer rate estimate (${PLATFORM_LABEL[platform]}, ${Number(followers).toLocaleString()} followers, ${engagementRate}% ER, ${niche}):
Low: ${formatUSD(result.low)} / post
Mid: ${formatUSD(result.mid)} / post
High: ${formatUSD(result.high)} / post
— calculated with the Social Perks rate calculator`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  function handleShare() {
    if (typeof window === "undefined" || !result) return;
    const text = `Estimated rate for a ${Number(followers).toLocaleString()}-follower ${PLATFORM_LABEL[platform]} creator: ${formatUSD(result.low)}–${formatUSD(result.high)} per post. Calculate yours →`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <Nav />
      <main id="main-content">
        <section className="relative pt-32 pb-12 sm:pt-40">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.05),transparent_60%)]"
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <Link
              href="/quiz"
              className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted transition-colors hover:text-brand-cyan"
            >
              ← All quizzes & calculators
            </Link>
            <h1 className="mt-5 font-heading text-[clamp(2rem,4.5vw,3.5rem)] italic leading-[1.05] tracking-tight text-brand-white">
              Influencer{" "}
              <span className="bg-gradient-to-r from-brand-cyan to-brand-green bg-clip-text text-transparent">
                Rate Calculator
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
              What should you charge — or pay — per sponsored post? Based on industry CPM rates, adjusted for engagement, niche, and follower tier.
            </p>
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-brand-border bg-brand-surface/50 p-6">
                <label className="block">
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                    Platform
                  </span>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as Platform)}
                    className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-white focus:border-brand-cyan focus:outline-none"
                  >
                    {(Object.keys(PLATFORM_LABEL) as Platform[]).map((p) => (
                      <option key={p} value={p}>
                        {PLATFORM_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-5 block">
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                    Followers
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={followers}
                    onChange={(e) => setFollowers(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-white focus:border-brand-cyan focus:outline-none"
                  />
                </label>

                <label className="mt-5 block">
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                    Engagement rate (%)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={engagementRate}
                    onChange={(e) => setEngagementRate(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-white focus:border-brand-cyan focus:outline-none"
                  />
                  <span className="mt-1 block text-[11px] text-brand-muted">
                    (likes + comments) / followers · ×100. Industry avg: 1–3%.
                  </span>
                </label>

                <label className="mt-5 block">
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                    Niche
                  </span>
                  <select
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-white focus:border-brand-cyan focus:outline-none"
                  >
                    {Object.keys(NICHE_MULTIPLIERS).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-2xl border border-brand-border bg-brand-surface/50 p-6">
                {!result ? (
                  <div className="flex h-full items-center justify-center text-center text-sm text-brand-muted">
                    Enter at least 100 followers to see a rate.
                  </div>
                ) : (
                  <>
                    <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                      Fair rate per post
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                          Low
                        </div>
                        <div className="mt-1 font-heading text-2xl italic text-brand-white">
                          {formatUSD(result.low)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
                          Mid
                        </div>
                        <div className="mt-1 font-heading text-3xl italic text-brand-cyan">
                          {formatUSD(result.mid)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                          High
                        </div>
                        <div className="mt-1 font-heading text-2xl italic text-brand-white">
                          {formatUSD(result.high)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 inline-flex items-center rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
                      {result.tier} creator
                    </div>

                    <div className="mt-6 space-y-2 border-t border-brand-border pt-5 text-xs text-brand-dim">
                      <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                        How we got there
                      </div>
                      <div>Base CPM: {formatUSD(result.baseCpm)} / 1k on {PLATFORM_LABEL[platform]}</div>
                      <div>× Engagement multiplier: {result.engagementMult.toFixed(2)}x</div>
                      <div>× Niche multiplier ({niche}): {result.nicheMult.toFixed(2)}x</div>
                      <div>× Follower tier ({result.tier}): {result.tierMult.toFixed(2)}x</div>
                      <div>Range = mid × 0.75 to mid × 1.4 for negotiation room</div>
                    </div>

                    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex-1 rounded-xl border border-brand-border bg-brand-surface/30 px-4 py-2 text-sm font-medium text-brand-text hover:border-brand-cyan/40"
                      >
                        {copied ? "Copied!" : "Copy result"}
                      </button>
                      <button
                        type="button"
                        onClick={handleShare}
                        className="flex-1 rounded-xl border border-brand-border bg-brand-surface/30 px-4 py-2 text-sm font-medium text-brand-text hover:border-brand-cyan/40"
                      >
                        Share
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-10 rounded-2xl border border-brand-border bg-brand-surface/30 p-6 text-sm leading-relaxed text-brand-dim sm:p-8">
              <h2 className="font-heading text-xl italic text-brand-white">
                How this works
              </h2>
              <p className="mt-3">
                Industry-standard formula: <span className="font-mono text-brand-text">followers / 1,000 × base CPM × engagement × niche × tier</span>. Base rates are sourced from public influencer-marketing reports (Influencer Marketing Hub 2024, HypeAuditor, IZEA). Engagement rate is the strongest predictor — a 25k-follower account with 6%+ ER is often worth more than a 100k account at 1%.
              </p>
              <p className="mt-3">
                Treat the mid number as a fair starting point. Brands with bigger budgets push toward high; creators just starting often accept low. Negotiate.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-brand-green/5 p-8 text-center sm:p-10">
              <h3 className="font-heading text-2xl italic leading-snug text-brand-white sm:text-3xl">
                Find influencers in your niche — without DMing 200 people.
              </h3>
              <Link
                href="/pricing"
                className="mt-6 inline-block rounded-xl bg-brand-cyan px-7 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20"
              >
                Find influencers in your niche with Social Perks →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
