/**
 * POST /api/v1/referrals/click
 *
 * Public endpoint. Bumps the click counter when someone lands on
 * `/?ref=CODE`. Best-effort: we don't block the page on the response.
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit } from "../../_shared";
import { recordClick, findByCode } from "@/lib/referrals/codes";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return err("INVALID_BODY", "JSON body required", 400);
  }
  if (!body.code || typeof body.code !== "string") {
    return err("MISSING_CODE", "code is required", 400);
  }
  // Confirm it's a real code before incrementing — prevents random
  // strings from inflating the counter.
  const found = await findByCode(body.code);
  if (!found) {
    return err("UNKNOWN_CODE", "That code isn't recognized", 404);
  }
  await recordClick(body.code);
  return ok({ counted: true });
}
