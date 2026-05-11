/**
 * Dynamic OpenGraph image for how-to guides.
 * Shows the guide title, time estimate, difficulty, and a "Free guide" badge.
 */

import { ImageResponse } from "next/og";
import { getGuide } from "@/lib/howto/guides";

export const runtime = "nodejs";
export const alt = "Social Perks How-to Guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ slug: string }>;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Beginner: "#34D399",
  Intermediate: "#FBBF24",
};

export default async function OGImage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);

  const title = guide?.title ?? "How-to Guide";
  const timeMinutes = guide?.timeMinutes ?? 10;
  const difficulty = guide?.difficulty ?? "Beginner";
  const category = guide?.category ?? "Small Business";
  const difficultyColor = DIFFICULTY_COLOR[difficulty] ?? "#34D399";

  const titleFontSize =
    title.length > 80 ? 52 : title.length > 55 ? 62 : title.length > 35 ? 72 : 82;

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
        {/* Amber + cyan glow — "tutorial" mood */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(circle at 85% 25%, rgba(251, 191, 36, 0.15) 0%, transparent 55%), radial-gradient(circle at 15% 85%, rgba(34, 211, 238, 0.12) 0%, transparent 55%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            display: "flex",
            background: "linear-gradient(90deg, #FBBF24, #22D3EE)",
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
            How-to
          </span>
        </div>

        {/* Top-right "Free guide" badge */}
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
              letterSpacing: "0.15em",
              fontWeight: 700,
            }}
          >
            Free guide
          </span>
        </div>

        {/* Category */}
        <div
          style={{
            position: "absolute",
            top: 160,
            left: 72,
            display: "flex",
          }}
        >
          <span
            style={{
              color: "#22D3EE",
              fontSize: 18,
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontWeight: 600,
            }}
          >
            {category}
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            position: "absolute",
            top: 210,
            left: 72,
            right: 72,
            display: "flex",
            color: "#FAFBFD",
            fontSize: titleFontSize,
            fontStyle: "italic",
            fontWeight: 500,
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>

        {/* Meta strip: time + difficulty */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Time pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 22px",
                borderRadius: 12,
                background: "rgba(34, 211, 238, 0.08)",
                border: "1px solid rgba(34, 211, 238, 0.35)",
                gap: 10,
              }}
            >
              <span
                style={{
                  color: "#636B8A",
                  fontSize: 13,
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                }}
              >
                Time
              </span>
              <span
                style={{
                  color: "#22D3EE",
                  fontSize: 22,
                  fontWeight: 600,
                  fontFamily: "monospace",
                }}
              >
                {timeMinutes} min
              </span>
            </div>

            {/* Difficulty pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 22px",
                borderRadius: 12,
                background: `${difficultyColor}1A`,
                border: `1px solid ${difficultyColor}5A`,
                gap: 10,
              }}
            >
              <span
                style={{
                  color: "#636B8A",
                  fontSize: 13,
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                }}
              >
                Level
              </span>
              <span
                style={{
                  color: difficultyColor,
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                {difficulty}
              </span>
            </div>
          </div>

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
