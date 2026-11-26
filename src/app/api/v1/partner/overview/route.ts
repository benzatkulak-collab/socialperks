/**
 * GET /api/v1/partner/overview?from&to — one window's numbers for every
 * business granted to the calling partner (latest capped at 10 each).
 */
import type { NextRequest } from "next/server";
import { parseWindow } from "@/lib/partners/window";
import { businessWeeks } from "@/lib/partners/week";
import { partnerOverviewResponse } from "@/lib/partners/schemas";
import { internalError, partnerErr, partnerGate, partnerOk } from "@/lib/partners/http";

export async function GET(req: NextRequest) {
  const gate = await partnerGate(req);
  if ("response" in gate) return gate.response;

  const q = new URL(req.url).searchParams;
  const window = parseWindow(q.get("from"), q.get("to"));
  if (!window.ok) return partnerErr("INVALID_WINDOW", window.message, 400);

  try {
    const businesses = await businessWeeks(gate.partnerId, "all", window, 10);
    return partnerOk(
      partnerOverviewResponse.parse({
        window: { from: window.from.toISOString(), to: window.to.toISOString() },
        businesses,
      }),
    );
  } catch {
    return internalError();
  }
}
