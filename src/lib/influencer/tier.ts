/**
 * Influencer status tiers (Phase 28).
 *
 * Tier is computed deterministically from total earnings + verified
 * handles + lifetime submissions. Public on /i/[slug], used by the
 * matching engine to gate access to high-budget campaigns, surfaced
 * via API so bots can see + optimize for tier_progress.
 */

export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum";

export interface TierStatus {
  tier: Tier;
  earnedCents: number;
  /** Cents required to reach the NEXT tier; null if already at top. */
  nextTierAtCents: number | null;
  /** 0..1 progress through the current tier. */
  tierProgress: number;
}

const THRESHOLDS: Array<{ tier: Tier; min: number }> = [
  { tier: "Bronze",   min: 0 },
  { tier: "Silver",   min: 50_000 },     // $500
  { tier: "Gold",     min: 250_000 },    // $2,500
  { tier: "Platinum", min: 1_000_000 },  // $10,000
];

export function computeTier(earnedCents: number): TierStatus {
  let i = THRESHOLDS.length - 1;
  while (i > 0 && earnedCents < THRESHOLDS[i].min) i--;
  const current = THRESHOLDS[i];
  const next = THRESHOLDS[i + 1] ?? null;

  const tierProgress = next
    ? Math.min(1, (earnedCents - current.min) / (next.min - current.min))
    : 1;

  return {
    tier: current.tier,
    earnedCents,
    nextTierAtCents: next?.min ?? null,
    tierProgress,
  };
}

/** Match-score multiplier per tier — Gold/Platinum see better campaigns first. */
export function tierMatchMultiplier(tier: Tier): number {
  switch (tier) {
    case "Platinum": return 1.5;
    case "Gold": return 1.3;
    case "Silver": return 1.1;
    case "Bronze": return 1.0;
  }
}
