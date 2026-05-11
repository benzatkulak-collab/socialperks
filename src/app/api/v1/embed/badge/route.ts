/**
 * GET /api/v1/embed/badge — "Powered by Social Perks" SVG badge
 *
 * Returns a small inline SVG that businesses can drop into their footer or
 * sidebar. Used as a link to socialperks.onrender.com to drive backlinks.
 *
 * Query parameters:
 *   size  (optional) — "small" | "medium" | "large" (default: "medium")
 *   theme (optional) — "light" | "dark" (default: "dark")
 *
 * Returns: Content-Type: image/svg+xml
 * Cache: 1 hour (public + s-maxage)
 * Auth: none (public endpoint, fully CORS-open)
 * Rate limit: public tier
 */

import type { NextRequest } from "next/server";
import { rateLimit, getQuery } from "../../_shared";
import { validateEnum } from "@/lib/security/validate";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=3600, s-maxage=3600, immutable",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

type Size = "small" | "medium" | "large";
type Theme = "light" | "dark";

interface Dims {
  width: number;
  height: number;
  fontSize: number;
  smallFont: number;
  logoSize: number;
  padX: number;
  gap: number;
  radius: number;
}

const DIMS: Record<Size, Dims> = {
  small: { width: 150, height: 28, fontSize: 11, smallFont: 8, logoSize: 14, padX: 8, gap: 6, radius: 6 },
  medium: { width: 200, height: 40, fontSize: 13, smallFont: 9, logoSize: 20, padX: 10, gap: 8, radius: 8 },
  large: { width: 260, height: 56, fontSize: 16, smallFont: 11, logoSize: 28, padX: 14, gap: 10, radius: 10 },
};

function themeColors(theme: Theme) {
  return theme === "dark"
    ? {
        bg: "#0C0F1A",
        border: "#1E2340",
        text: "#F1F3F9",
        muted: "#636B8A",
        cyan: "#22D3EE",
      }
    : {
        bg: "#FFFFFF",
        border: "#E2E5EF",
        text: "#1A1D2E",
        muted: "#6B7280",
        cyan: "#0891B2",
      };
}

function renderSvg(size: Size, theme: Theme): string {
  const d = DIMS[size];
  const c = themeColors(theme);

  // Lightning bolt mark inside a cyan rounded square — keeps the social-perks brand mark inline
  const logoX = d.padX;
  const logoY = (d.height - d.logoSize) / 2;
  const logoR = Math.round(d.logoSize / 4);

  const textX = logoX + d.logoSize + d.gap;
  const line1Y = d.height / 2 - 2;
  const line2Y = d.height / 2 + d.smallFont + 1;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${d.width}" height="${d.height}" viewBox="0 0 ${d.width} ${d.height}" role="img" aria-label="Powered by Social Perks">
  <title>Powered by Social Perks</title>
  <rect x="0.5" y="0.5" width="${d.width - 1}" height="${d.height - 1}" rx="${d.radius}" fill="${c.bg}" stroke="${c.border}"/>
  <rect x="${logoX}" y="${logoY}" width="${d.logoSize}" height="${d.logoSize}" rx="${logoR}" fill="${c.cyan}"/>
  <path d="M ${logoX + d.logoSize * 0.5} ${logoY + d.logoSize * 0.2} L ${logoX + d.logoSize * 0.3} ${logoY + d.logoSize * 0.55} L ${logoX + d.logoSize * 0.48} ${logoY + d.logoSize * 0.55} L ${logoX + d.logoSize * 0.42} ${logoY + d.logoSize * 0.8} L ${logoX + d.logoSize * 0.68} ${logoY + d.logoSize * 0.45} L ${logoX + d.logoSize * 0.5} ${logoY + d.logoSize * 0.45} Z" fill="${c.bg}"/>
  <text x="${textX}" y="${line1Y}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${d.smallFont}" font-weight="500" fill="${c.muted}" dominant-baseline="alphabetic" letter-spacing="0.5">POWERED BY</text>
  <text x="${textX}" y="${line2Y}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${d.fontSize}" font-weight="700" fill="${c.text}" dominant-baseline="alphabetic">Social Perks</text>
</svg>`;
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const params = getQuery(req);
  const sizeParam = params.get("size") || "medium";
  const themeParam = params.get("theme") || "dark";

  const sizeRes = validateEnum(sizeParam, "size", ["small", "medium", "large"] as const);
  const size: Size = sizeRes.success ? sizeRes.data : "medium";

  const themeRes = validateEnum(themeParam, "theme", ["light", "dark"] as const);
  const theme: Theme = themeRes.success ? themeRes.data : "dark";

  const svg = renderSvg(size, theme);

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "X-Request-Id": crypto.randomUUID(),
      ...corsHeaders(),
    },
  });
}
