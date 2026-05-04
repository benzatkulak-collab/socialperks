/**
 * GET /api/og/influencer?name=...&followers=...&earnings=...
 *
 * Dynamic OG card for an influencer profile. The "I made $X" surface —
 * primary status / share trigger.
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
  const name = escape(params.get("name") ?? "Creator");
  const followers = escape(params.get("followers") ?? "");
  const earnings = escape(params.get("earnings") ?? "");
  const tier = escape(params.get("tier") ?? "");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0C0F1A"/>
      <stop offset="100%" stop-color="#0F1424"/>
    </linearGradient>
    <linearGradient id="green" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#34D399"/>
      <stop offset="100%" stop-color="#22D3EE"/>
    </linearGradient>
    <radialGradient id="glow" cx="80%" cy="20%" r="50%">
      <stop offset="0%" stop-color="#34D399" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#34D399" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="0" y="0" width="1200" height="6" fill="url(#green)"/>

  <text x="80" y="120" font-family="-apple-system, 'DM Sans', sans-serif" font-size="22" font-weight="600" fill="#34D399" letter-spacing="3">${tier ? `${tier.toUpperCase()} CREATOR` : "ON SOCIAL PERKS"}</text>

  <text x="80" y="270" font-family="Georgia, 'Instrument Serif', serif" font-style="italic" font-size="92" fill="#E2E8F0" letter-spacing="-2">${name}</text>

  ${earnings ? `
  <text x="80" y="380" font-family="-apple-system, 'DM Sans', sans-serif" font-size="32" fill="#94A3B8">made</text>
  <text x="220" y="380" font-family="Georgia, serif" font-style="italic" font-size="56" fill="url(#green)" letter-spacing="-1">$${earnings}</text>
  <text x="80" y="430" font-family="-apple-system, 'DM Sans', sans-serif" font-size="26" fill="#94A3B8">posting for local businesses · last 90 days</text>
  ` : `
  <text x="80" y="380" font-family="-apple-system, 'DM Sans', sans-serif" font-size="32" fill="#94A3B8">earns from local businesses through verified posts.</text>
  `}

  ${followers ? `<text x="80" y="490" font-family="ui-monospace, monospace" font-size="20" fill="#22D3EE" letter-spacing="2">${followers} FOLLOWERS</text>` : ""}

  <rect x="80" y="525" width="1040" height="1" fill="#2D3348"/>
  <text x="80" y="572" font-family="ui-monospace, monospace" font-size="16" font-weight="600" fill="#22D3EE" letter-spacing="2">SOCIAL PERKS · GET PAID TO POST</text>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
