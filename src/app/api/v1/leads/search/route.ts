/**
 * POST /api/v1/leads/search
 *
 * Body: { industry, city, state?, limit? }
 *
 * Searches Google Places for matching businesses, scores each one
 * against the Social Perks fit model, persists leads with score >= 50,
 * and returns the top 20 sorted by fit score.
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  requireCsrf,
  rateLimit,
  parseBody,
  withTiming,
} from "../../_shared";
import { searchPlaces } from "@/lib/leads/google-places";
import { scoreLead } from "@/lib/leads/scorer";
import { addLead } from "@/lib/leads/store";
import type { Lead } from "@/lib/leads/types";

interface SearchBody {
  industry?: string;
  city?: string;
  state?: string;
  limit?: number;
  minRating?: number;
  maxRating?: number;
}

export const POST = withTiming(async (req: NextRequest) => {
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const csrfError = requireCsrf(req, user);
  if (csrfError) return csrfError;

  const rl = rateLimit(req, "standard");
  if (rl) return rl;

  const body = await parseBody<SearchBody>(req);
  if (body instanceof Response) return body;

  if (!body.industry || typeof body.industry !== "string") {
    return err("MISSING_FIELD", "industry is required", 400);
  }
  if (!body.city || typeof body.city !== "string") {
    return err("MISSING_FIELD", "city is required", 400);
  }

  const limit = Math.min(50, Math.max(1, body.limit ?? 20));

  const places = await searchPlaces({
    industry: body.industry,
    city: body.city,
    state: body.state,
    minRating: body.minRating,
    maxRating: body.maxRating,
  });

  const collectedAt = new Date().toISOString();
  const enriched: Lead[] = [];

  for (const place of places) {
    const partial: Partial<Lead> = {
      businessName: place.name,
      industry: place.industry,
      city: place.city || body.city,
      state: place.state || body.state || "",
      address: place.address,
      phone: place.phone,
      website: place.website,
      googleReviewCount: place.reviewCount,
      googleRating: place.rating,
      hasInstagram: false,
      hasResponseToReviews: place.hasResponseToReviews,
    };

    const { score, reasons } = scoreLead(partial);

    const lead: Lead = {
      id: `lead_${place.placeId || crypto.randomUUID()}`,
      businessName: partial.businessName!,
      industry: partial.industry!,
      city: partial.city!,
      state: partial.state!,
      address: partial.address!,
      phone: partial.phone,
      website: partial.website,
      googleReviewCount: partial.googleReviewCount!,
      googleRating: partial.googleRating!,
      hasInstagram: partial.hasInstagram!,
      instagramHandle: undefined,
      lastInstagramPostDate: undefined,
      hasResponseToReviews: partial.hasResponseToReviews!,
      fitScore: score,
      fitReasons: reasons,
      outreachStatus: "new",
      notes: "",
      collectedAt,
      ownerId: (user as { id: string }).id,
    };

    enriched.push(lead);

    if (score >= 50) {
      await addLead(lead);
    }
  }

  enriched.sort((a, b) => b.fitScore - a.fitScore);
  const top = enriched.slice(0, limit);

  return ok({
    leads: top,
    total: enriched.length,
    qualified: enriched.filter((l) => l.fitScore >= 50).length,
    mockMode: !process.env.GOOGLE_PLACES_API_KEY,
  });
});
