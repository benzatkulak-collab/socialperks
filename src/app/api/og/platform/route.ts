/**
 * GET /api/og/platform?id={platformId}
 *
 * Dynamic OG card for a single platform's detail page.
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

  const platform = PLATFORMS.find((p) => p.id === id);
  if (!platform) {
    return new Response("Platform not found", { status: 404 });
  }

  const totalValue = platform.actions.reduce((s, a) => s + a.value, 0);
  const actionCount = platform.actions.length;

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
  <rect x="0" y="0" width="1200" height="6" fill="${escape(platform.color)}"/>

  <text x="80" y="120" font-family="-apple-system, 'DM Sans', sans-serif" font-size="22" font-weight="600" fill="#22D3EE" letter-spacing="3">PLATFORM · MARKETING ACTIONS</text>

  <text x="80" y="290" font-family="Georgia, 'Instrument Serif', serif" font-style="italic" font-size="108" fill="#E2E8F0" letter-spacing="-2">${escape(platform.name)}</text>

  <text x="80" y="380" font-family="-apple-system, 'DM Sans', sans-serif" font-size="32" fill="#94A3B8">${actionCount} marketing actions · $${totalValue.toFixed(0)} combined value per cycle</text>

  <rect x="80" y="525" width="1040" height="1" fill="#2D3348"/>
  <text x="80" y="572" font-family="ui-monospace, monospace" font-size="16" font-weight="600" fill="#22D3EE" letter-spacing="2">SOCIAL PERKS · /platforms/${escape(id)}</text>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

// Dynamic per-request — search param is the cache key. CDN caches via
// the Cache-Control headers.
export const dynamic = "force-dynamic";
