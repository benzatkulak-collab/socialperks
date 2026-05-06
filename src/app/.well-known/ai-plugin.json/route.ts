/**
 * GET /.well-known/ai-plugin.json
 *
 * Plugin discovery manifest. Originally specified by OpenAI for ChatGPT
 * plugins; still indexed by some agent ecosystems for surfacing AI-aware
 * APIs.
 *
 * Cached for 24 hours.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function buildSiteUrl(req: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest): Promise<Response> {
  const siteUrl = buildSiteUrl(req);
  const manifest = {
    schema_version: "v1",
    name_for_human: "Social Perks",
    name_for_model: "social_perks",
    description_for_human:
      "Marketing actions in exchange for perks. Find pricing, list actions, launch campaigns, and discover influencers.",
    description_for_model:
      "Use Social Perks to plan and execute marketing campaigns where customers and influencers complete social media actions in exchange for discounts or rewards. Public reference data (pricing, actions, benchmarks) is available without auth. Campaign and submission operations require an API key (header: x-api-key) or JWT (header: Authorization: Bearer).",
    auth: {
      type: "user_http",
      authorization_type: "bearer",
    },
    api: {
      type: "openapi",
      url: `${siteUrl}/api/v1/openapi`,
    },
    logo_url: `${siteUrl}/icon.png`,
    contact_email: "agents@socialperks.example.com",
    legal_info_url: `${siteUrl}/terms`,
  };

  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Content-Type": "application/json",
    },
  });
}

export const dynamic = "force-static";
export const revalidate = 86400;
