/**
 * Lead-finder types — public business data scraped from Google Places
 * for outreach prospecting. No PII beyond what businesses publish publicly.
 */

export interface Lead {
  id: string;
  businessName: string;
  industry: string;
  city: string;
  state: string;
  address: string;
  phone?: string;
  website?: string;
  googleReviewCount: number;
  googleRating: number;
  hasInstagram: boolean;
  instagramHandle?: string;
  lastInstagramPostDate?: string;
  hasResponseToReviews: boolean;
  fitScore: number; // 0-100
  fitReasons: string[];
  outreachStatus: OutreachStatus;
  notes: string;
  collectedAt: string;
  /** Owner (user id) — for multi-tenant scoping. */
  ownerId?: string;
}

export type OutreachStatus =
  | "new"
  | "contacted"
  | "replied"
  | "qualified"
  | "converted"
  | "dead";

export const OUTREACH_STATUSES: OutreachStatus[] = [
  "new",
  "contacted",
  "replied",
  "qualified",
  "converted",
  "dead",
];

export interface LeadSearchParams {
  industry: string;
  city: string;
  state?: string;
  radius?: number; // miles
  minRating?: number;
  maxRating?: number;
}

/** Industries Social Perks targets — used by scorer and outreach copy. */
export const TARGET_INDUSTRIES = [
  "coffee",
  "cafe",
  "salon",
  "spa",
  "barber",
  "yoga",
  "fitness",
  "gym",
  "restaurant",
  "bakery",
  "retail",
  "boutique",
  "florist",
  "pet",
  "tattoo",
] as const;
