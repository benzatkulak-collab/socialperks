/**
 * GET /api/og/influencer?name=...&followers=...&earnings=...
 *
 * Dynamic OG card (PNG) for an influencer profile. The "I made $X" surface —
 * the primary status / share trigger for creators.
 */

import type { NextRequest } from "next/server";
import { ogCard } from "@/lib/og-card";

export const runtime = "nodejs";

const cap = (s: string) => s.slice(0, 80);

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const name = cap(params.get("name") ?? "Creator");
  const followers = cap(params.get("followers") ?? "");
  const earnings = cap(params.get("earnings") ?? "");
  const tier = cap(params.get("tier") ?? "");

  return ogCard({
    eyebrow: tier ? `${tier} Creator` : "On Social Perks",
    title: name,
    subtitle: earnings
      ? `made $${earnings} posting for local businesses · last 90 days`
      : "earns from local businesses through verified posts.",
    stat: followers ? `${followers} FOLLOWERS` : undefined,
    footer: "SOCIAL PERKS · GET PAID TO POST",
    accent: "green",
    titleSize: 90,
    cacheSeconds: 3600,
  });
}
