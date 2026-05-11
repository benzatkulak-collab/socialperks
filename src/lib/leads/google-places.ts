/**
 * Google Places API wrapper.
 *
 * Uses the new Places API (places.googleapis.com). Free tier:
 * ~$200/month credit, generous for prospecting at our scale.
 *
 * When GOOGLE_PLACES_API_KEY is unset, returns deterministic mock data
 * so the lead-finder works end-to-end in dev/CI.
 *
 * Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
 */

import type { LeadSearchParams } from "./types";

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone?: string;
  website?: string;
  rating: number;
  reviewCount: number;
  industry: string;
  /** Set true if the place has any owner responses on recent reviews. */
  hasResponseToReviews: boolean;
}

const PLACES_TEXT_SEARCH = "https://places.googleapis.com/v1/places:searchText";
const PLACES_DETAILS_BASE = "https://places.googleapis.com/v1/places";

const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.rating",
  "places.userRatingCount",
  "places.primaryType",
  "places.types",
].join(",");

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "addressComponents",
  "internationalPhoneNumber",
  "nationalPhoneNumber",
  "websiteUri",
  "rating",
  "userRatingCount",
  "reviews",
  "primaryType",
  "types",
].join(",");

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  types?: string[];
  reviews?: Array<{
    authorAttribution?: { displayName?: string };
    text?: { text?: string };
    rating?: number;
  }>;
}

function extractCityState(p: RawPlace): { city: string; state: string } {
  const components = p.addressComponents ?? [];
  const city =
    components.find((c) => c.types?.includes("locality"))?.longText ??
    components.find((c) => c.types?.includes("postal_town"))?.longText ??
    components.find((c) => c.types?.includes("sublocality"))?.longText ??
    "";
  const state =
    components.find((c) => c.types?.includes("administrative_area_level_1"))
      ?.shortText ?? "";
  return { city, state };
}

function inferIndustry(p: RawPlace): string {
  if (p.primaryType) return p.primaryType.replace(/_/g, " ");
  const t = p.types?.[0];
  return t ? t.replace(/_/g, " ") : "business";
}

function toPlaceResult(p: RawPlace): PlaceResult {
  const { city, state } = extractCityState(p);
  return {
    placeId: p.id ?? "",
    name: p.displayName?.text ?? "Unknown business",
    address: p.formattedAddress ?? "",
    city,
    state,
    phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber,
    website: p.websiteUri,
    rating: p.rating ?? 0,
    reviewCount: p.userRatingCount ?? 0,
    industry: inferIndustry(p),
    hasResponseToReviews: false, // text search doesn't include reviews; fill in details call
  };
}

/**
 * Search local businesses matching the given criteria.
 * Returns up to 20 results.
 */
export async function searchPlaces(
  params: LeadSearchParams
): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return mockSearchResults(params);

  const query = `${params.industry} in ${params.city}${
    params.state ? `, ${params.state}` : ""
  }`;

  try {
    const res = await fetch(PLACES_TEXT_SEARCH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": SEARCH_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 20,
        minRating: params.minRating ?? undefined,
      }),
    });

    if (!res.ok) {
      console.error("[google-places] search failed:", res.status, await res.text());
      return [];
    }

    const data = (await res.json()) as { places?: RawPlace[] };
    return (data.places ?? []).map(toPlaceResult);
  } catch (e) {
    console.error("[google-places] search error:", e);
    return [];
  }
}

/**
 * Fetch detailed info for a place — phone, website, recent reviews,
 * and whether the owner has responded to any.
 */
export async function getPlaceDetails(
  placeId: string
): Promise<Partial<PlaceResult> | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return mockDetails(placeId);

  try {
    const res = await fetch(`${PLACES_DETAILS_BASE}/${placeId}`, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": DETAILS_FIELD_MASK,
      },
    });

    if (!res.ok) {
      console.error("[google-places] details failed:", res.status);
      return null;
    }

    const p = (await res.json()) as RawPlace;
    const base = toPlaceResult(p);

    // Google's reviews endpoint surfaces the latest 5 reviews. Owner replies
    // are not directly exposed in the JSON; we approximate by checking
    // whether any review text contains a "Response from the owner" marker
    // (legacy heuristic) — otherwise default to false.
    base.hasResponseToReviews = (p.reviews ?? []).some((r) =>
      (r.text?.text ?? "").toLowerCase().includes("response from the owner")
    );

    return base;
  } catch (e) {
    console.error("[google-places] details error:", e);
    return null;
  }
}

// ─── Mock data ────────────────────────────────────────────────────────────

const MOCK_NAMES = [
  "Bluebird Coffee",
  "Sunrise Yoga Studio",
  "The Velvet Chair Salon",
  "Iron Path Gym",
  "Petal & Stem Florist",
  "North Star Bakery",
  "Wagging Tails Pet Spa",
  "Copper Kettle Cafe",
  "Honest Ink Tattoo",
  "Glow Skincare Boutique",
];

const MOCK_STREETS = [
  "Main St",
  "Oak Ave",
  "Elm St",
  "Maple Rd",
  "Cedar Ln",
  "1st St",
  "Pine St",
  "Walnut Ave",
  "Park Blvd",
  "Lincoln Way",
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function mockSearchResults(params: LeadSearchParams): PlaceResult[] {
  const seed = hashStr(`${params.industry}:${params.city}:${params.state ?? ""}`);
  return Array.from({ length: 10 }, (_, i) => {
    const rng = (seed + i * 2654435761) >>> 0;
    const name = MOCK_NAMES[i % MOCK_NAMES.length];
    const street = MOCK_STREETS[(rng >> 3) % MOCK_STREETS.length];
    const number = 100 + ((rng >> 7) % 900);
    const rating = 3.2 + ((rng >> 11) % 18) / 10; // 3.2 - 4.9
    const reviewCount = 4 + ((rng >> 5) % 240); // 4 - 243
    const hasWebsite = (rng & 0b11) !== 0; // 75%
    const hasPhone = (rng & 0b111) !== 0; // ~87%
    const state = params.state ?? "CA";
    return {
      placeId: `mock_${seed.toString(36)}_${i}`,
      name: `${name} — ${params.city}`,
      address: `${number} ${street}, ${params.city}, ${state}`,
      city: params.city,
      state,
      phone: hasPhone
        ? `(${200 + ((rng >> 9) % 700)}) 555-${String((rng >> 13) % 10000).padStart(4, "0")}`
        : undefined,
      website: hasWebsite
        ? `https://${name.toLowerCase().replace(/[^a-z]+/g, "")}.example.com`
        : undefined,
      rating: Math.round(rating * 10) / 10,
      reviewCount,
      industry: params.industry,
      hasResponseToReviews: (rng & 0b1111) === 0, // ~6%
    };
  });
}

function mockDetails(placeId: string): Partial<PlaceResult> {
  const seed = hashStr(placeId);
  return {
    placeId,
    hasResponseToReviews: (seed & 0b11) === 0,
  };
}
