/**
 * Dynamic OpenGraph image for individual blog posts.
 * Renders the post title, category badge (color-coded), and byline
 * at 1200×630 in the brand dark theme.
 */

import { ImageResponse } from "next/og";
import { getPostBySlug, type BlogCategory } from "@/lib/blog/posts";

export const runtime = "nodejs";
export const alt = "Social Perks Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ slug: string }>;
}

// Category → accent color mapping. Keeps the brand palette consistent
// with the rest of the site (cyan / green / amber / pink / purple).
const CATEGORY_COLOR: Record<BlogCategory, string> = {
  Restaurants: "#F472B6",
  "Coffee Shops": "#FBBF24",
  "Yoga & Fitness": "#34D399",
  "Salons & Beauty": "#A78BFA",
  "Retail & Boutique": "#22D3EE",
  "Small Business": "#22D3EE",
  "Tactics & Strategy": "#34D399",
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default async function OGImage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  const title = post?.title ?? "Social Perks Blog";
  const category = post?.category ?? "Small Business";
  const author = post?.author ?? "Social Perks";
  const accent = CATEGORY_COLOR[category as BlogCategory] ?? "#22D3EE";

  // Scale font size to title length so long titles don't overflow.
  const titleFontSize =
    title.length > 90 ? 52 : title.length > 60 ? 60 : title.length > 40 ? 70 : 80;

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
        {/* Glow tinted to category color */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: `radial-gradient(circle at 80% 20%, ${hexToRgba(accent, 0.18)} 0%, transparent 55%), radial-gradient(circle at 10% 90%, rgba(34, 211, 238, 0.1) 0%, transparent 55%)`,
          }}
        />

        {/* Top accent line in category color */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            display: "flex",
            background: accent,
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
          <span
            style={{
              color: "#22D3EE",
              fontSize: 24,
              fontStyle: "italic",
            }}
          >
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
            Blog
          </span>
        </div>

        {/* Category badge */}
        <div
          style={{
            position: "absolute",
            top: 150,
            left: 72,
            display: "flex",
            alignItems: "center",
            padding: "10px 20px",
            borderRadius: 999,
            border: `1px solid ${hexToRgba(accent, 0.45)}`,
            background: hexToRgba(accent, 0.1),
          }}
        >
          <span
            style={{
              color: accent,
              fontSize: 18,
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
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
            top: 230,
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

        {/* Footer: byline + URL */}
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
          <div
            style={{
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
                borderRadius: 22,
                background: hexToRgba(accent, 0.15),
                border: `1px solid ${hexToRgba(accent, 0.4)}`,
                color: accent,
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              {author.charAt(0).toUpperCase()}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span style={{ color: "#A6ADBB", fontSize: 14, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                By
              </span>
              <span style={{ color: "#FAFBFD", fontSize: 22, marginTop: 4 }}>
                {author}
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
