/**
 * Cost-per-outcome comparison — paid-ad channels vs Social Perks.
 *
 * Every figure here is a *typical local-business* range, not a guarantee.
 * The numbers are the same ones used on the head-to-head /vs/[slug] pages
 * (see `src/lib/vs-data.ts`) so the two surfaces never contradict each
 * other. Keep them defensible: these are marginal cost-per-conversion
 * ranges a small business would actually see, sourced from published ad
 * benchmarks and our own campaign data — cite ranges, never single
 * precise claims.
 *
 * Rendered on /pricing (see `CostComparisonSection`) to anchor a buyer's
 * economics next to the plan table, and emitted as FAQPage structured
 * data for search.
 */

export interface CostChannel {
  /** Channel name as shown in the table. */
  name: string;
  /** What you're actually paying for. */
  model: string;
  /** Typical marginal cost per customer conversion, small business. */
  costPerOutcome: string;
  /** Low end of the range in whole dollars — used to sort + compute multiple. */
  low: number;
  /** High end of the range in whole dollars. */
  high: number;
  /** Internal link to the full head-to-head page, when one exists. */
  vsSlug?: string;
  /** One-line, defensible note on why the number is what it is. */
  note: string;
}

/** Social Perks' own cost-per-completed-action. The anchor row. */
export const SOCIAL_PERKS_COST: CostChannel = {
  name: "Social Perks",
  model: "Per completed customer action",
  costPerOutcome: "$8–15",
  low: 8,
  high: 15,
  note: "You pay a small perk only when a real customer completes and submits an action.",
};

/**
 * Paid channels a small business weighs against us, cheapest-first.
 * Figures mirror the per-conversion ranges on the matching /vs pages.
 */
export const COMPETING_CHANNELS: CostChannel[] = [
  {
    name: "Instagram / Meta ads",
    model: "Per conversion (paid placement)",
    costPerOutcome: "$25–40",
    low: 25,
    high: 40,
    vsSlug: "meta-ads",
    note: "Meta sells placements; a customer Reel at ~$4 replaces a ~$25–40 ad conversion.",
  },
  {
    name: "Google Ads",
    model: "Per conversion (search / display)",
    costPerOutcome: "$30–80",
    low: 30,
    high: 80,
    vsSlug: "google-ads",
    note: "Below ~$5K/mo spend, Google's targeting overhead rarely pays back for local businesses.",
  },
];

/**
 * Rough "how many times cheaper" multiple, comparing midpoints. Returned
 * as a formatted string like "3–4x" for display. Kept deliberately
 * conservative — floors the low multiple, rounds the high.
 */
export function costAdvantage(channel: CostChannel): string {
  const ourMid = (SOCIAL_PERKS_COST.low + SOCIAL_PERKS_COST.high) / 2;
  const lowMult = Math.floor(channel.low / SOCIAL_PERKS_COST.high);
  const highMult = Math.round(channel.high / ourMid);
  if (lowMult >= highMult || lowMult < 2) return `up to ${highMult}x`;
  return `${lowMult}–${highMult}x`;
}

/**
 * FAQ entries backing the comparison — real Q&A a buyer types into search.
 * Emitted as FAQPage JSON-LD and rendered visually so the structured data
 * always matches on-page content (a Google structured-data requirement).
 */
export const COST_FAQ: { question: string; answer: string }[] = [
  {
    question: "How much does Social Perks cost per customer action?",
    answer:
      "A completed customer action typically costs $8–15 in perk value — and you only pay when a real customer completes and submits the action. There's no cost for impressions or clicks that don't convert.",
  },
  {
    question: "How does that compare to Instagram or Meta ads?",
    answer:
      "For a typical local business, a Meta or Instagram ad conversion runs about $25–40. Social Perks turns your own customers into the placement, so a customer's post costs roughly $4 in perk value and the fully completed action lands at $8–15 — commonly 2–4x cheaper per conversion.",
  },
  {
    question: "How does it compare to Google Ads?",
    answer:
      "Google Ads conversions for small local businesses typically run $30–80, and below about $5,000/month of spend the targeting overhead rarely pays back. Social Perks has no minimum spend and starts free.",
  },
  {
    question: "Are these numbers guaranteed?",
    answer:
      "No — they're typical ranges for local businesses, not guarantees. Your actual cost depends on your perk value, category, and how many customers participate. The point is the structural difference: you pay for outcomes from customers you already have, not for ad inventory.",
  },
];
