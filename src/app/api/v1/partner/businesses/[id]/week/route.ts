/**
 * GET /api/v1/partner/businesses/{id}/week?from&to — one granted business's
 * numbers (latest capped at 50). A business that is not granted to the caller
 * answers exactly like one that does not exist.
 */
import type { NextRequest } from "next/server";
import { parseWindow } from "@/lib/partners/window";
import { businessWeeks } from "@/lib/partners/week";
import { partnerWeekResponse } from "@/lib/partners/schemas";
import { internalError, partnerErr, partnerGate, partnerOk } from "@/lib/partners/http";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await partnerGate(req, "partner-week");
  if ("response" in gate) return gate.response;

  const q = new URL(req.url).searchParams;
  const window = parseWindow(q.get("from"), q.get("to"));
  if (!window.ok) return partnerErr("INVALID_WINDOW", window.message, 400);

  try {
    const { id } = await ctx.params;
    const [business] = await businessWeeks(gate.partnerId, [id], window, 50);
    if (!business) return partnerErr("NOT_FOUND", "Business not found", 404);
    return partnerOk(
      partnerWeekResponse.parse({
        window: { from: window.from.toISOString(), to: window.to.toISOString() },
        business,
      }),
    );
  } catch {
    return internalError();
  }
}
