/**
 * Default OpenGraph image for the Social Perks site.
 * Used by the homepage and as the fallback for any route that doesn't
 * define its own opengraph-image.tsx.
 *
 * 1200×630, dark-themed, branded. Rendered at build time via next/og.
 */

import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Social Perks — AI marketing manager for small business";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0C0F1A",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Soft radial glows */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(circle at 18% 28%, rgba(34, 211, 238, 0.18) 0%, transparent 55%), radial-gradient(circle at 82% 78%, rgba(167, 139, 250, 0.14) 0%, transparent 55%)",
          }}
        />

        {/* Top gradient accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            display: "flex",
            background: "linear-gradient(90deg, #22D3EE, #A78BFA, #F472B6)",
          }}
        />

        {/* Brand row */}
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 72,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              background: "rgba(34, 211, 238, 0.12)",
              border: "1px solid rgba(34, 211, 238, 0.35)",
            }}
          >
            <span
              style={{
                color: "#22D3EE",
                fontSize: 26,
                fontStyle: "italic",
                fontWeight: 600,
              }}
            >
              S
            </span>
          </div>
          <span
            style={{
              color: "#FAFBFD",
              fontSize: 24,
              fontStyle: "italic",
            }}
          >
            Social Perks
          </span>
        </div>

        {/* Main content */}
        <div
          style={{
            position: "absolute",
            top: 200,
            left: 72,
            right: 72,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Cyan accent line */}
          <div
            style={{
              width: 80,
              height: 4,
              display: "flex",
              background: "#22D3EE",
              marginBottom: 28,
              borderRadius: 2,
            }}
          />

          <div
            style={{
              color: "#FAFBFD",
              fontSize: 96,
              fontStyle: "italic",
              fontWeight: 500,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            Social Perks
          </div>

          <div
            style={{
              color: "#A6ADBB",
              fontSize: 36,
              fontWeight: 400,
              marginTop: 22,
              lineHeight: 1.25,
              display: "flex",
              maxWidth: 980,
            }}
          >
            AI marketing manager for small business
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 56,
            left: 72,
            right: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              color: "#636B8A",
              fontSize: 20,
              fontFamily: "monospace",
              letterSpacing: "0.05em",
            }}
          >
            socialperks.onrender.com
          </span>
          <span
            style={{
              color: "#34D399",
              fontSize: 18,
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            14-day free trial
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
