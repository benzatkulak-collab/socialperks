/**
 * Dynamic OpenGraph image for Social Perks vs Competitor comparison pages.
 * Side-by-side layout with a center "VS" divider.
 */

import { ImageResponse } from "next/og";
import { getCompetitor } from "@/lib/comparison/competitors";

export const runtime = "nodejs";
export const alt = "Social Perks vs Competitor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ competitor: string }>;
}

export default async function OGImage({ params }: Props) {
  const { competitor: slug } = await params;
  const competitor = getCompetitor(slug);
  const competitorName = competitor?.name ?? "Competitor";

  // Sizing for the competitor name — scale down if it's very long.
  const nameFontSize =
    competitorName.length > 14 ? 56 : competitorName.length > 10 ? 68 : 80;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0C0F1A",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Split-color background glows */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(circle at 25% 50%, rgba(34, 211, 238, 0.2) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(167, 139, 250, 0.16) 0%, transparent 50%)",
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
            background: "linear-gradient(90deg, #22D3EE 0%, #22D3EE 50%, #A78BFA 50%, #A78BFA 100%)",
          }}
        />

        {/* Top label */}
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "#A6ADBB",
              fontSize: 20,
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
            }}
          >
            Honest comparison · 2026
          </span>
        </div>

        {/* Left side: Social Perks */}
        <div
          style={{
            position: "absolute",
            top: 160,
            left: 60,
            width: 480,
            height: 380,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 24,
            background: "rgba(34, 211, 238, 0.06)",
            border: "1px solid rgba(34, 211, 238, 0.3)",
            padding: 40,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              background: "rgba(34, 211, 238, 0.18)",
              border: "1px solid rgba(34, 211, 238, 0.5)",
            }}
          >
            <span
              style={{
                color: "#22D3EE",
                fontSize: 36,
                fontStyle: "italic",
                fontWeight: 700,
              }}
            >
              S
            </span>
          </div>
          <span
            style={{
              color: "#FAFBFD",
              fontSize: 56,
              fontStyle: "italic",
              fontWeight: 500,
              marginTop: 22,
              letterSpacing: "-0.02em",
            }}
          >
            Social Perks
          </span>
          <span
            style={{
              color: "#22D3EE",
              fontSize: 16,
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginTop: 16,
            }}
          >
            AI marketing manager
          </span>
        </div>

        {/* Center VS badge */}
        <div
          style={{
            position: "absolute",
            top: 280,
            left: 540,
            width: 120,
            height: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 60,
            background: "#0C0F1A",
            border: "2px solid #3A4258",
            boxShadow: "0 0 0 8px rgba(12, 15, 26, 0.8)",
          }}
        >
          <span
            style={{
              color: "#FAFBFD",
              fontSize: 38,
              fontStyle: "italic",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            vs
          </span>
        </div>

        {/* Right side: Competitor */}
        <div
          style={{
            position: "absolute",
            top: 160,
            left: 660,
            width: 480,
            height: 380,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 24,
            background: "rgba(167, 139, 250, 0.06)",
            border: "1px solid rgba(167, 139, 250, 0.3)",
            padding: 40,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              background: "rgba(167, 139, 250, 0.18)",
              border: "1px solid rgba(167, 139, 250, 0.5)",
            }}
          >
            <span
              style={{
                color: "#A78BFA",
                fontSize: 36,
                fontWeight: 700,
              }}
            >
              {competitorName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span
            style={{
              color: "#FAFBFD",
              fontSize: nameFontSize,
              fontStyle: "italic",
              fontWeight: 500,
              marginTop: 22,
              letterSpacing: "-0.02em",
              textAlign: "center",
              display: "flex",
            }}
          >
            {competitorName}
          </span>
          {competitor?.tagline && (
            <span
              style={{
                color: "#A78BFA",
                fontSize: 16,
                fontFamily: "monospace",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                marginTop: 16,
                textAlign: "center",
                display: "flex",
                maxWidth: 380,
                lineHeight: 1.4,
              }}
            >
              {competitor.tagline.length > 40
                ? competitor.tagline.slice(0, 37) + "..."
                : competitor.tagline}
            </span>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
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
    { ...size },
  );
}
