/**
 * Shared Open Graph card renderer.
 *
 * Produces a 1200×630 PNG via next/og (Satori). Every social scraper and
 * chat unfurler (Facebook, LinkedIn, X, Slack, iMessage, Discord, WhatsApp)
 * renders PNG — none reliably render SVG, which is why the previous
 * hand-rolled SVG cards showed as blank previews. All OG routes funnel
 * through this one helper so the brand card stays consistent.
 */

import { ImageResponse } from "next/og";

type Accent = "cyan" | "green";

const ACCENT_BAR: Record<Accent, string> = {
  cyan: "linear-gradient(90deg,#22D3EE,#34D399)",
  green: "linear-gradient(90deg,#34D399,#22D3EE)",
};
const ACCENT_COLOR: Record<Accent, string> = {
  cyan: "#22D3EE",
  green: "#34D399",
};

export interface OgCardOptions {
  /** Small uppercase kicker above the headline. */
  eyebrow: string;
  /** The headline — the largest text on the card. */
  title: string;
  /** Optional supporting line under the headline. */
  subtitle?: string;
  /** Optional mono-ish stat line (e.g. "$42.00 · 12 ACTIONS"). */
  stat?: string;
  /** Bottom strip text. */
  footer: string;
  accent?: Accent;
  /** Headline font size — shrink for long titles, grow for single words. */
  titleSize?: number;
  /** CDN cache TTL in seconds. */
  cacheSeconds?: number;
}

export function ogCard({
  eyebrow,
  title,
  subtitle,
  stat,
  footer,
  accent = "cyan",
  titleSize = 76,
  cacheSeconds = 86400,
}: OgCardOptions): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg,#0C0F1A,#0F1424)",
          padding: "72px 80px",
          position: "relative",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            background: ACCENT_BAR[accent],
          }}
        />

        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            color: ACCENT_COLOR[accent],
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "3px",
          }}
        >
          {eyebrow.toUpperCase()}
        </div>

        {/* Headline block */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              color: "#E2E8F0",
              lineHeight: 1.05,
              letterSpacing: "-2px",
              fontStyle: "italic",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ display: "flex", marginTop: 28, fontSize: 32, color: "#94A3B8" }}>
              {subtitle}
            </div>
          ) : null}
          {stat ? (
            <div
              style={{
                display: "flex",
                marginTop: 20,
                fontSize: 24,
                color: ACCENT_COLOR[accent],
                letterSpacing: "2px",
              }}
            >
              {stat}
            </div>
          ) : null}
        </div>

        {/* Footer strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderTop: "1px solid #2D3348",
            paddingTop: 22,
            fontSize: 16,
            color: "#22D3EE",
            fontWeight: 600,
            letterSpacing: "2px",
          }}
        >
          {footer}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}, stale-while-revalidate=604800`,
      },
    }
  );
}
