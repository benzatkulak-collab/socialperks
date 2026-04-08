/**
 * GET  /api/v1/digest?businessId=xxx — Preview digest HTML for a specific business
 * POST /api/v1/digest                — Trigger weekly digest for all active businesses (cron)
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ok,
  err,
  rateLimit,
  getQuery,
  requireAuth,
  withTiming,
} from "../_shared";
import { validateId } from "@/lib/security/validate";
import { campaignManager } from "@/lib/campaign-state-machine";
import { buildDigestData, generateDigestHtml } from "@/lib/email/digest";
import { emailProvider } from "@/lib/email";

// ─── GET — Preview digest for a specific business ──────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const params = getQuery(req);
  const businessId = params.get("businessId");

  if (!businessId) {
    return err("MISSING_BUSINESS_ID", "businessId query parameter is required", 400);
  }

  const bv = validateId(businessId);
  if (!bv.success) return err("INVALID_BUSINESS_ID", bv.error, 400);

  // Build digest data (use businessId as placeholder name for preview)
  const businessName = params.get("businessName") ?? bv.data;
  const data = buildDigestData(bv.data, businessName, "preview@socialperks.app");
  const { subject, html } = generateDigestHtml(data);

  // Return the HTML directly for preview
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Request-Id": crypto.randomUUID(),
      "X-Digest-Subject": subject,
    },
  });
});

// ─── POST — Send weekly digests to all businesses with active campaigns ─────

export const POST = withTiming(async (req: NextRequest) => {
  // Auth required — only admins or cron should trigger mass sends
  const user = requireAuth(req);
  if (user instanceof NextResponse) return user;

  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  // Gather all active campaigns and deduplicate by businessId
  const activeCampaigns = campaignManager.listByState("active");
  const businessIds = new Set<string>();
  for (const campaign of activeCampaigns) {
    businessIds.add(campaign.businessId);
  }

  if (businessIds.size === 0) {
    return ok({ sent: 0, errors: 0, message: "No businesses with active campaigns" });
  }

  // Parse optional business metadata from body (businessId → { name, email })
  let businessMeta: Map<string, { name: string; email: string }> = new Map();
  try {
    const body = await req.json() as {
      businesses?: Array<{ id: string; name: string; email: string }>;
    };
    if (body?.businesses && Array.isArray(body.businesses)) {
      for (const b of body.businesses) {
        if (b.id && b.name && b.email) {
          businessMeta.set(b.id, { name: b.name, email: b.email });
        }
      }
    }
  } catch {
    // Body is optional — no metadata means we use fallback values
    businessMeta = new Map();
  }

  let sent = 0;
  let errors = 0;
  const results: Array<{
    businessId: string;
    success: boolean;
    error?: string;
  }> = [];

  for (const businessId of Array.from(businessIds)) {
    const meta = businessMeta.get(businessId);
    const name = meta?.name ?? businessId;
    const email = meta?.email ?? `${businessId}@socialperks.app`;

    try {
      const data = buildDigestData(businessId, name, email);
      const { subject, html, text } = generateDigestHtml(data);

      const sendResult = await emailProvider.send({
        to: email,
        subject,
        html,
        text,
      });

      if (sendResult.success) {
        sent++;
        results.push({ businessId, success: true });
      } else {
        errors++;
        results.push({
          businessId,
          success: false,
          error: sendResult.error,
        });
      }
    } catch (e) {
      errors++;
      results.push({
        businessId,
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return ok({
    sent,
    errors,
    total: businessIds.size,
    results,
  });
});
