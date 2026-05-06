/**
 * GET /api/og/action?id={actionId}
 *
 * Dynamic OG card for a single action's detail page. Renders the
 * action label, platform name, market value, and effort level so
 * shares on Twitter/LinkedIn/Slack show a useful card instead of
 * the default site OG.
 *
 * SVG response — no Edge runtime needed, renders identically across
 * crawlers. Cached aggressively.
 */

import type { NextRequest } from "next/server";
import { PLATFORMS } from "@/lib/platforms";

export const runtime = "nodejs";

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .slice(0, 80);
}

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

  const valueStr = `$${value.toFixed(2)}`;
  const effortStr = `${effort}/5`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0C0F1A"/>
      <stop offset="100%" stop-color="#0F1424"/>
    </linearGradient>
    <linearGradient id="cyan" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#22D3EE"/>
      <stop offset="100%" stop-color="#34D399"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="6" fill="url(#cyan)"/>

  <text x="80" y="120" font-family="-apple-system, 'DM Sans', sans-serif" font-size="22" font-weight="600" fill="#22D3EE" letter-spacing="3">${escape(platformName).toUpperCase()} · MARKETING ACTION</text>

  <text x="80" y="280" font-family="Georgia, 'Instrument Serif', serif" font-style="italic" font-size="84" fill="#E2E8F0" letter-spacing="-2">${escape(actionLabel)}</text>

  <text x="80" y="370" font-family="ui-monospace, 'JetBrains Mono', monospace" font-size="56" fill="#34D399" letter-spacing="-1">${valueStr}</text>
  <text x="80" y="408" font-family="-apple-system, 'DM Sans', sans-serif" font-size="22" fill="#94A3B8">market value · effort ${effortStr}${incentivizable ? "" : " · organic only"}</text>

  <rect x="80" y="525" width="1040" height="1" fill="#2D3348"/>
  <text x="80" y="572" font-family="ui-monospace, monospace" font-size="16" font-weight="600" fill="#22D3EE" letter-spacing="2">SOCIAL PERKS · /actions/${escape(id)}</text>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

// Dynamic per-request (the search param is the cache key). The
// Cache-Control headers above handle CDN-level caching so this still
// serves from edge after the first request per (id) variant.
export const dynamic = "force-dynamic";
