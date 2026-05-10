/**
 * Affiliate click tracker — /api/v1/affiliate/track
 *
 * GET ?code=XXXXXXXX&redirect=/signup
 *
 * Records the click, sets a 30-day cookie, and 302-redirects to the requested
 * path. No auth — this is a public tracking link the affiliate shares anywhere.
 */

import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, withTiming } from "../../_shared";
import { recordClick, getAffiliateByCode } from "@/lib/affiliate";

const COOKIE_NAME = "sp_affiliate";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Restrict redirects to same-origin paths only.
function safeRedirect(target: string | null): string {
  if (!target) return "/";
  if (!target.startsWith("/") || target.startsWith("//")) return "/";
  return target;
}

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "").toUpperCase().slice(0, 16);
  const redirect = safeRedirect(url.searchParams.get("redirect"));

  // Always 302 even on a bad code — silent failure is better UX than a 400.
  const aff = code ? getAffiliateByCode(code) : null;

  if (aff && aff.status === "active") {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const ua = req.headers.get("user-agent") ?? "unknown";
    recordClick(code, ip, ua);
  }

  const dest = new URL(redirect, url.origin);
  const response = NextResponse.redirect(dest, 302);

  if (aff && aff.status === "active") {
    response.cookies.set(COOKIE_NAME, code, {
      httpOnly: false, // readable from client so the signup form can include it
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }

  return response;
});
