/**
 * Lead fit scorer.
 *
 * Higher score = better target for Social Perks outreach.
 * Score range: 0-100, capped on both ends.
 */

import type { Lead } from "./types";
import { TARGET_INDUSTRIES } from "./types";

export interface ScoreResult {
  score: number;
  reasons: string[];
}

const BASE_SCORE = 30;

export function scoreLead(lead: Partial<Lead>): ScoreResult {
  let score = BASE_SCORE;
  const reasons: string[] = [];

  const reviewCount = lead.googleReviewCount ?? 0;
  const rating = lead.googleRating ?? 0;
  const industry = (lead.industry ?? "").toLowerCase();

  // ── Positive signals ─────────────────────────────────────────
  if (reviewCount >= 5 && reviewCount <= 50) {
    score += 30;
    reasons.push("Has 5-50 Google reviews — established but room to grow");
  } else if (reviewCount > 50 && reviewCount <= 200) {
    score += 15;
    reasons.push("Has 50-200 reviews — solid base, scaling stage");
  }

  if (rating >= 3.5 && rating <= 4.5) {
    score += 20;
    reasons.push(
      `Rating ${rating.toFixed(1)} — real reviews, has incentive to improve`
    );
  }

  const lastPost = lead.lastInstagramPostDate
    ? new Date(lead.lastInstagramPostDate).getTime()
    : null;
  const daysSinceLastPost =
    lastPost !== null ? (Date.now() - lastPost) / 86_400_000 : null;

  if (lead.hasInstagram === false) {
    score += 15;
    reasons.push("No Instagram presence — major untapped channel");
  } else if (daysSinceLastPost !== null && daysSinceLastPost > 30) {
    score += 15;
    reasons.push(
      `Last Instagram post ${Math.round(daysSinceLastPost)} days ago — underutilizing social`
    );
  }

  if (lead.hasResponseToReviews === false) {
    score += 10;
    reasons.push("Not responding to Google reviews — poor customer engagement");
  }

  if (lead.website) {
    score += 5;
    reasons.push("Has a website — legit established business");
  }

  if (TARGET_INDUSTRIES.some((t) => industry.includes(t))) {
    score += 20;
    reasons.push(`Top-target industry (${industry})`);
  }

  // ── Negative signals ─────────────────────────────────────────
  if (reviewCount > 500) {
    score -= 20;
    reasons.push("Too many reviews (>500) — likely has agency/PR");
  }

  if (rating > 0 && rating < 3.0) {
    score -= 15;
    reasons.push(`Low rating (${rating.toFixed(1)}) — too many operational problems`);
  }

  if (!lead.phone && !lead.website) {
    score -= 30;
    reasons.push("No phone or website — may not be a legit business");
  }

  // Clamp 0-100
  score = Math.max(0, Math.min(100, score));

  return { score, reasons };
}
