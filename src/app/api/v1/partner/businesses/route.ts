/**
 * GET /api/v1/partner/businesses — the businesses granted to the calling partner.
 */
import type { NextRequest } from "next/server";
import { grantedBusinesses } from "@/lib/partners/week";
import { partnerBusinessesResponse } from "@/lib/partners/schemas";
import { internalError, partnerGate, partnerOk } from "@/lib/partners/http";

export async function GET(req: NextRequest) {
  const gate = await partnerGate(req);
  if ("response" in gate) return gate.response;
  try {
    const businesses = await grantedBusinesses(gate.partnerId);
    return partnerOk(partnerBusinessesResponse.parse({ businesses }));
  } catch {
    return internalError();
  }
}
