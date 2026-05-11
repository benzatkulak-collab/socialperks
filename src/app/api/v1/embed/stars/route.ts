/**
 * GET /api/v1/embed/stars — Star rating SVG badge
 *
 * Renders a 5-star rating with the business's average score and review count
 * baked into an inline SVG. Common use: "show our 4.8 star rating on customer
 * sites". Designed to be dropped in via <img src="..."> or inline SVG fetch.
 *
 * Query parameters:
 *   rating      (optional) — float 0..5 (default: 5)
 *   reviewCount (optional) — non-negative integer (default: 0; hidden when 0)
 *   color       (optional) — hex like "#FBBF24" or named: "amber" | "cyan" | "green"
 *                            (default: "amber")
 *
 * Returns: Content-Type: image/svg+xml
 * Cache: 1 hour
 * Rate limit: public tier
 */

import type { NextRequest } from "next/server";
import { rateLimit, getQuery } from "../../_shared";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

const NAMED_COLORS: Record<string, string> = {
  amber: "#FBBF24",
  cyan: "#22D3EE",
  green: "#34D399",
  pink: "#F472B6",
  orange: "#FB923C",
  gold: "#F59E0B",
};

const MUTED = "#3F4660";
const TEXT = "#1A1D2E";

function resolveColor(input: string | null): string {
  if (!input) return NAMED_COLORS.amber;
  const trimmed = input.trim();
  if (NAMED_COLORS[trimmed.toLowerCase()]) return NAMED_COLORS[trimmed.toLowerCase()];
  // Allow #rgb, #rrggbb only (sanitized to avoid SVG injection)
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) return trimmed;
  return NAMED_COLORS.amber;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function renderStars(rating: number, reviewCount: number, color: string): string {
  const r = clamp(rating, 0, 5);
  const starSize = 22;
  const starGap = 2;
  const padding = 4;
  const starsWidth = starSize * 5 + starGap * 4;

  // The text segment: "4.8" + optional " (123)"
  const ratingText = r.toFixed(1);
  const countText = reviewCount > 0 ? ` (${reviewCount.toLocaleString("en-US")})` : "";
  const showText = true;
  // Estimate text width (monospace-ish guess; SVG handles layout)
  const ratingTextWidth = ratingText.length * 11 + countText.length * 7 + 10;

  const totalWidth = starsWidth + (showText ? ratingTextWidth : 0) + padding * 2;
  const totalHeight = starSize + padding * 2;

  // Build 5 stars with fractional fill via clipPath
  const fillPct = (r / 5) * 100;

  const stars = Array.from({ length: 5 })
    .map((_, i) => {
      const x = padding + i * (starSize + starGap);
      const y = padding;
      return `
        <g transform="translate(${x},${y})">
          <path d="M ${starSize / 2} 1 L ${starSize * 0.62} ${starSize * 0.38} L ${starSize - 1} ${starSize * 0.4} L ${starSize * 0.7} ${starSize * 0.62} L ${starSize * 0.78} ${starSize - 1} L ${starSize / 2} ${starSize * 0.78} L ${starSize * 0.22} ${starSize - 1} L ${starSize * 0.3} ${starSize * 0.62} L 1 ${starSize * 0.4} L ${starSize * 0.38} ${starSize * 0.38} Z" fill="${MUTED}"/>
        </g>
      `;
    })
    .join("");

  // Foreground overlay clipped to fillPct
  const overlay = `
    <g clip-path="url(#sp-stars-clip)">
      ${Array.from({ length: 5 })
        .map((_, i) => {
          const x = padding + i * (starSize + starGap);
          const y = padding;
          return `
            <g transform="translate(${x},${y})">
              <path d="M ${starSize / 2} 1 L ${starSize * 0.62} ${starSize * 0.38} L ${starSize - 1} ${starSize * 0.4} L ${starSize * 0.7} ${starSize * 0.62} L ${starSize * 0.78} ${starSize - 1} L ${starSize / 2} ${starSize * 0.78} L ${starSize * 0.22} ${starSize - 1} L ${starSize * 0.3} ${starSize * 0.62} L 1 ${starSize * 0.4} L ${starSize * 0.38} ${starSize * 0.38} Z" fill="${color}"/>
            </g>
          `;
        })
        .join("")}
    </g>
  `;

  const clipWidth = (fillPct / 100) * starsWidth;
  const textX = padding + starsWidth + 8;
  const textY = padding + starSize / 2 + 4;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" role="img" aria-label="${ratingText} out of 5 stars${reviewCount > 0 ? ` from ${reviewCount} reviews` : ""}">
  <title>${ratingText} out of 5 stars${reviewCount > 0 ? ` from ${reviewCount} reviews` : ""}</title>
  <defs>
    <clipPath id="sp-stars-clip">
      <rect x="${padding}" y="0" width="${clipWidth}" height="${totalHeight}"/>
    </clipPath>
  </defs>
  ${stars}
  ${overlay}
  <text x="${textX}" y="${textY}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="${TEXT}">${ratingText}<tspan font-weight="400" fill="${MUTED}">${countText}</tspan></text>
</svg>`;
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const params = getQuery(req);
  const ratingParam = params.get("rating");
  const countParam = params.get("reviewCount");
  const colorParam = params.get("color");

  let rating = ratingParam !== null ? parseFloat(ratingParam) : 5;
  if (!Number.isFinite(rating)) rating = 5;
  rating = clamp(rating, 0, 5);

  let reviewCount = countParam !== null ? parseInt(countParam, 10) : 0;
  if (!Number.isFinite(reviewCount) || reviewCount < 0) reviewCount = 0;
  if (reviewCount > 1_000_000) reviewCount = 1_000_000;

  const color = resolveColor(colorParam);

  const svg = renderStars(rating, reviewCount, color);

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "X-Request-Id": crypto.randomUUID(),
      ...corsHeaders(),
    },
  });
}
