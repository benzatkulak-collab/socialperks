import type { Listicle } from "./types";
import { REVIEWS_LISTICLE } from "./list-1-reviews";
import { INSTAGRAM_LISTICLE } from "./list-2-instagram";
import { LOYALTY_LISTICLE } from "./list-3-loyalty";
import { TIKTOK_LISTICLE } from "./list-4-tiktok";
import { RETENTION_LISTICLE } from "./list-5-retention";
import { REFERRAL_LISTICLE } from "./list-6-referral";
import { INFLUENCER_LISTICLE } from "./list-7-influencer";
import { REVIEW_TOOLS_LISTICLE } from "./list-8-review-tools";
import { SOCIAL_TOOLS_LISTICLE } from "./list-9-social-tools";
import { AUTOMATION_LISTICLE } from "./list-10-automation";
import { HASHTAGS_LISTICLE } from "./list-11-hashtags";
import { CONTENT_LISTICLE } from "./list-12-content";

export const LISTICLES: Listicle[] = [
  REVIEWS_LISTICLE,
  INSTAGRAM_LISTICLE,
  LOYALTY_LISTICLE,
  TIKTOK_LISTICLE,
  RETENTION_LISTICLE,
  REFERRAL_LISTICLE,
  INFLUENCER_LISTICLE,
  REVIEW_TOOLS_LISTICLE,
  SOCIAL_TOOLS_LISTICLE,
  AUTOMATION_LISTICLE,
  HASHTAGS_LISTICLE,
  CONTENT_LISTICLE,
];

export function getListicleBySlug(slug: string): Listicle | undefined {
  return LISTICLES.find((l) => l.slug === slug);
}

export function getAllListicleSlugs(): string[] {
  return LISTICLES.map((l) => l.slug);
}

export type { Listicle } from "./types";
