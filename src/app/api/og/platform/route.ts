/**
 * GET /api/og/platform?id={platformId}
 *
 * Dynamic OG card (PNG) for a single platform's detail page.
 */

import type { NextRequest } from "next/server";
import { PLATFORMS } from "@/lib/platforms";
import { ogCard } from "@/lib/og-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return new Response("Missing id parameter", { status: 400 });
  }

  const platform = PLATFORMS.find((p) => p.id === id);
  if (!platform) {
    return new Response("Platform not found", { status: 404 });
  }

  const totalValue = platform.actions.reduce((s, a) => s + a.value, 0);
  const actionCount = platform.actions.length;

  return ogCard({
    eyebrow: "Platform · Marketing actions",
    title: platform.name.slice(0, 80),
    subtitle: `${actionCount} marketing actions · $${totalValue.toFixed(0)} combined value per cycle`,
    footer: `SOCIAL PERKS · /platforms/${id.slice(0, 80)}`,
    accent: "cyan",
    titleSize: 104,
  });
}
