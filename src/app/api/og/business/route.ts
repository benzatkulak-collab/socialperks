/**
 * GET /api/og/business?name=...&type=...&campaigns=...
 *
 * Dynamic OG card (PNG) for a business public profile.
 */

import type { NextRequest } from "next/server";
import { ogCard } from "@/lib/og-card";

export const runtime = "nodejs";

const cap = (s: string) => s.slice(0, 80);

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const name = cap(params.get("name") ?? "Local Business");
  const type = cap(params.get("type") ?? "");
  const campaigns = cap(params.get("campaigns") ?? "");

  return ogCard({
    eyebrow: type ? type : "On Social Perks",
    title: name,
    subtitle: "is rewarding customers who post about them.",
    stat: campaigns ? `${campaigns} ACTIVE CAMPAIGNS` : undefined,
    footer: "SOCIAL PERKS · CLAIM YOUR PERK",
    accent: "cyan",
    titleSize: 90,
    cacheSeconds: 3600,
  });
}
