/**
 * GET /api/og/business?name=...&type=...&campaigns=...
 *
 * Dynamic OG card for a business public profile. SVG response so it
 * works without the Edge runtime + Satori dance, and renders identically
 * across crawlers.
 */

import type { NextRequest } from "next/server";

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
  const params = new URL(req.url).searchParams;
  const name = escape(params.get("name") ?? "Local Business");
  const type = escape(params.get("type") ?? "");
  const campaigns = escape(params.get("campaigns") ?? "");

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

  <text x="80" y="120" font-family="-apple-system, 'DM Sans', sans-serif" font-size="22" font-weight="600" fill="#22D3EE" letter-spacing="3">${type ? type.toUpperCase() : "ON SOCIAL PERKS"}</text>

  <text x="80" y="290" font-family="Georgia, 'Instrument Serif', serif" font-style="italic" font-size="92" fill="#E2E8F0" letter-spacing="-2">${name}</text>

  <text x="80" y="380" font-family="-apple-system, 'DM Sans', sans-serif" font-size="32" fill="#94A3B8">is rewarding customers who post about them.</text>

  ${campaigns ? `<text x="80" y="450" font-family="ui-monospace, 'JetBrains Mono', monospace" font-size="20" fill="#34D399" letter-spacing="2">${campaigns} ACTIVE CAMPAIGNS</text>` : ""}

  <rect x="80" y="525" width="1040" height="1" fill="#2D3348"/>
  <text x="80" y="572" font-family="ui-monospace, monospace" font-size="16" font-weight="600" fill="#22D3EE" letter-spacing="2">SOCIAL PERKS · CLAIM YOUR PERK</text>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
