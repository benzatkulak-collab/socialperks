/**
 * POST /api/v1/sms/test
 *
 * Admin-only test endpoint. Sends a post-purchase SMS *immediately*
 * (delayMinutes=0) so operators can verify end-to-end SMS works
 * before wiring real POS webhooks.
 *
 * Auth: Bearer token must equal WAITLIST_ADMIN_TOKEN env var.
 * Rate limit: standard (admin endpoint).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ok, err, rateLimit, parseBody } from "../../_shared";
import { enqueuePostPurchaseSms } from "@/lib/sms/post-purchase";

export const runtime = "nodejs";

interface TestBody {
  to?: unknown;
  businessName?: unknown;
  perkText?: unknown;
  campaignId?: unknown;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // Admin auth: Bearer <WAITLIST_ADMIN_TOKEN>
  const adminToken = process.env.WAITLIST_ADMIN_TOKEN;
  const authHeader = req.headers.get("authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!adminToken || provided !== adminToken) {
    return err("UNAUTHORIZED", "Admin token required", 401);
  }

  const body = await parseBody<TestBody>(req);
  if (body instanceof NextResponse) return body;

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const businessName =
    typeof body.businessName === "string" ? body.businessName.slice(0, 200) : "";
  const perkText =
    typeof body.perkText === "string" ? body.perkText.slice(0, 100) : "next one";
  const campaignId =
    typeof body.campaignId === "string" ? body.campaignId.slice(0, 100) : "";

  if (!to || !businessName || !campaignId) {
    return err(
      "INVALID_BODY",
      "to, businessName, and campaignId are required",
      400,
    );
  }

  const queued = enqueuePostPurchaseSms({
    businessId: "test",
    businessName,
    campaignId,
    customerPhone: to,
    purchaseAmount: 0,
    delayMinutes: 0,
    perkText,
  });

  return ok({ queued: { id: queued.id, status: queued.status, body: queued.body } });
}
