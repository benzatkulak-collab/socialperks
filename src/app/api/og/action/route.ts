/**
 * GET /api/og/action?id={actionId}
 *
 * Dynamic OG card (PNG) for a single action's detail page. Renders the
 * action label, platform name, market value, and effort so shares on
 * X/LinkedIn/Slack show a useful card instead of the default site OG.
 */

import type { NextRequest } from "next/server";
import { PLATFORMS } from "@/lib/platforms";
import { ogCard } from "@/lib/og-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cap = (s: string) => s.slice(0, 80);

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return new Response("Missing id parameter", { status: 400 });
  }

  // Lookup action across all platforms.
  let actionLabel = "Unknown";
  let platformName = "";
  let value = 0;
  let effort = 0;
  let incentivizable = true;

  for (const p of PLATFORMS) {
    const action = p.actions.find((a) => a.id === id);
    if (action) {
      actionLabel = action.label;
      platformName = p.name;
      value = action.value;
      effort = action.effort;
      incentivizable = action.incentivizable;
      break;
    }
  }

  return ogCard({
    eyebrow: `${platformName} · Marketing action`,
    title: cap(actionLabel),
    subtitle: `$${value.toFixed(2)} market value · effort ${effort}/5${incentivizable ? "" : " · organic only"}`,
    footer: `SOCIAL PERKS · /actions/${cap(id)}`,
    accent: "cyan",
    titleSize: 84,
  });
}
