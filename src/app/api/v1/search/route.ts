/**
 * GET /api/v1/search — Full-text search across campaigns, businesses, and influencers.
 *
 * Query params:
 *   q      — search query (required)
 *   type   — filter by document type (campaign, business, influencer, submission)
 *   limit  — max results (default 20, max 100)
 *   offset — pagination offset (default 0)
 *   fuzzy  — enable fuzzy matching (default true)
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, getQuery, withTiming } from "../_shared";
import { searchEngine } from "@/lib/search";
import type { SearchDocument } from "@/lib/search";
import { validateString, validateNumber, validateEnum } from "@/lib/security/validate";
import { campaignManager } from "@/lib/campaign-state-machine";

// ─── Index seeding ──────────────────────────────────────────────────────────

let indexed = false;

/**
 * Lazily index available data on first request.
 * Pulls from in-memory stores (campaigns, seed data).
 */
function ensureIndexed(): void {
  if (indexed) return;
  indexed = true;

  // Index campaigns from the campaign state machine
  try {
    const campaigns = campaignManager.listAll();
    for (const campaign of campaigns) {
      const doc: SearchDocument = {
        id: campaign.id,
        type: "campaign",
        fields: {
          name: (campaign as unknown as Record<string, unknown>).name as string ?? campaign.id,
          businessId: campaign.businessId,
          state: campaign.state,
        },
        metadata: {
          state: campaign.state,
          businessId: campaign.businessId,
        },
      };
      searchEngine.addDocument(doc);
    }
  } catch {
    // Campaign manager may not have data — that's fine
  }
}

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  // Rate limit — relaxed for public search
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const params = getQuery(req);
  const start = performance.now();

  // Validate query param (required)
  const qParam = params.get("q");
  const qv = validateString(qParam, "q", { min: 1, max: 500 });
  if (!qv.success) return err("MISSING_QUERY", "Query parameter 'q' is required", 400);

  // Optional: type filter
  let types: string[] | undefined;
  const typeParam = params.get("type");
  if (typeParam) {
    const typeValues = typeParam.split(",").map((t) => t.trim());
    for (const t of typeValues) {
      const tv = validateEnum(t, "type", [
        "campaign",
        "business",
        "influencer",
        "submission",
      ] as const);
      if (!tv.success) return err("INVALID_TYPE", tv.error, 400);
    }
    types = typeValues;
  }

  // Optional: limit (default 20, max 100)
  let limit = 20;
  const limitParam = params.get("limit");
  if (limitParam) {
    const lv = validateNumber(limitParam, "limit", { min: 1, max: 100 });
    if (!lv.success) return err("INVALID_LIMIT", lv.error, 400);
    limit = lv.data;
  }

  // Optional: offset (default 0)
  let offset = 0;
  const offsetParam = params.get("offset");
  if (offsetParam) {
    const ov = validateNumber(offsetParam, "offset", { min: 0 });
    if (!ov.success) return err("INVALID_OFFSET", ov.error, 400);
    offset = ov.data;
  }

  // Optional: fuzzy matching (default true)
  const fuzzyParam = params.get("fuzzy");
  const fuzzyDistance = fuzzyParam === "false" ? 0 : 1;

  // Ensure data is indexed
  ensureIndexed();

  // Execute search
  const results = searchEngine.search(qv.data, {
    types,
    limit,
    offset,
    fuzzyDistance,
  });

  const took = Math.round((performance.now() - start) * 100) / 100;

  return ok({
    results,
    total: results.length,
    query: qv.data,
    took,
  });
});
