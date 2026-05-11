/**
 * Shared OpenGraph image renderer for the /tools/* pages.
 *
 * Each tool has its own folder (no [slug]), so each tool folder owns a
 * tiny opengraph-image.tsx file that delegates here with its own copy.
 * Keeping the JSX in one place means we change branding once.
 */

import { ImageResponse } from "next/og";

export const TOOL_OG_SIZE = { width: 1200, height: 630 } as const;
export const TOOL_OG_CONTENT_TYPE = "image/png" as const;

export interface ToolOGProps {
  /** Headline shown big, italic, serif-style. e.g. "Review ROI Calculator". */
  title: string;
  /** One-line subtitle under the title. */
  subtitle: string;
  /** Short uppercase tag, e.g. "Calculator", "Generator". */
  tag: string;
}

export function renderToolOG({ title, subtitle, tag }: ToolOGProps) {
  const titleFontSize =
    title.length > 38 ? 64 : title.length > 24 ? 82 : 100;
  const subtitleFontSize = subtitle.length > 90 ? 24 : 28;

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
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(circle at 85% 20%, rgba(34, 211, 238, 0.2) 0%, transparent 55%), radial-gradient(circle at 10% 90%, rgba(167, 139, 250, 0.12) 0%, transparent 55%)",
          }}
        />

        {/* Top accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            display: "flex",
            background: "linear-gradient(90deg, #22D3EE, #A78BFA, #34D399)",
          }}
        />

        {/* Brand row */}
        <div
          style={{
            position: "absolute",
            top: 50,
            left: 72,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ color: "#22D3EE", fontSize: 24, fontStyle: "italic" }}>
            Social Perks
          </span>
          <span style={{ color: "#3A4258", fontSize: 22 }}>/</span>
          <span
            style={{
              color: "#A6ADBB",
              fontSize: 20,
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            Tools
          </span>
        </div>

        {/* Free badge top-right */}
        <div
          style={{
            position: "absolute",
            top: 50,
            right: 72,
            display: "flex",
            alignItems: "center",
            padding: "10px 22px",
            borderRadius: 999,
            background: "#34D399",
          }}
        >
          <span
            style={{
              color: "#0C0F1A",
              fontSize: 16,
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontWeight: 700,
            }}
          >
            Free · No signup
          </span>
        </div>

        {/* Tag */}
        <div
          style={{
            position: "absolute",
            top: 170,
            left: 72,
            display: "flex",
          }}
        >
          <span
            style={{
              color: "#22D3EE",
              fontSize: 20,
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              fontWeight: 600,
            }}
          >
            {tag}
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            position: "absolute",
            top: 220,
            left: 72,
            right: 72,
            display: "flex",
            color: "#FAFBFD",
            fontSize: titleFontSize,
            fontStyle: "italic",
            fontWeight: 500,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
          }}
        >
          {title}
        </div>

        {/* Cyan accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 200,
            left: 72,
            width: 100,
            height: 4,
            display: "flex",
            background: "#22D3EE",
            borderRadius: 2,
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            position: "absolute",
            bottom: 130,
            left: 72,
            right: 72,
            display: "flex",
            color: "#A6ADBB",
            fontSize: subtitleFontSize,
            lineHeight: 1.35,
            maxWidth: 1000,
          }}
        >
          {subtitle}
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: 72,
            right: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ color: "#636B8A", fontSize: 16 }}>
            Marketing tools for small business
          </span>
          <span
            style={{
              color: "#636B8A",
              fontSize: 18,
              fontFamily: "monospace",
              letterSpacing: "0.05em",
            }}
          >
            socialperks.onrender.com
          </span>
        </div>
      </div>
    ),
    { ...TOOL_OG_SIZE },
  );
}
