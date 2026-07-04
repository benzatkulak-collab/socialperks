/**
 * GET /api/og/default
 *
 * The site-wide default Open Graph card (PNG). Referenced by the root
 * layout and by buildMetadata() as the fallback image for any page that
 * doesn't supply its own. Replaces the old static /og-image.svg, which —
 * being SVG — rendered blank on every major social/chat scraper.
 */

import { ogCard } from "@/lib/og-card";

export const runtime = "nodejs";

export function GET() {
  return ogCard({
    eyebrow: "Social Perks",
    title: "Turn customers into your marketing team.",
    subtitle: "Offer a perk. They post. You get real word-of-mouth — not ads.",
    footer: "FREE TO START · NO CREDIT CARD · 5-MINUTE SETUP",
    accent: "cyan",
    titleSize: 72,
  });
}
