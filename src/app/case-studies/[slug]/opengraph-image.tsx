/**
 * Dynamic OpenGraph image for case study pages.
 * Features the headline numerical result prominently with the case
 * study title and industry tag.
 */

import { ImageResponse } from "next/og";
import { getCaseStudyBySlug } from "@/lib/case-studies/data";

export const runtime = "nodejs";
export const alt = "Social Perks Case Study";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Pull a numeric stat from the case study's hero block to feature as the
 * big result. We prefer the first hero stat (typically the most striking
 * number), falling back to a derived label if missing.
 */
function extractBigStat(study: ReturnType<typeof getCaseStudyBySlug>): {
  stat: string;
  label: string;
} {
  if (!study) return { stat: "10x", label: "more reviews" };
  const first = study.hero[0];
  if (first) return { stat: first.stat, label: `${first.label} ${first.detail}` };
  return { stat: study.headlineResult, label: "" };
}

export default async function OGImage({ params }: Props) {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug);

  const title = study?.title ?? "Customer Case Study";
  const industry = study?.businessType ?? "Small Business";
  const location = study?.location ?? "";
  const timePeriod = study?.timePeriod ?? "";
  const { stat, label } = extractBigStat(study);

  // Scale stat font size if very long (e.g. "#3 → #1")
  const statFontSize = stat.length > 8 ? 140 : stat.length > 5 ? 180 : 220;
  const titleFontSize =
    title.length > 70 ? 36 : title.length > 50 ? 42 : 48;

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
        {/* Green-tinted success glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(circle at 30% 50%, rgba(52, 211, 153, 0.18) 0%, transparent 55%), radial-gradient(circle at 90% 90%, rgba(34, 211, 238, 0.1) 0%, transparent 55%)",
          }}
        />

        {/* Top accent — green for "results/wins" */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            display: "flex",
            background: "linear-gradient(90deg, #34D399, #22D3EE)",
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
            Case Study
          </span>
        </div>

        {/* Left: Big stat */}
        <div
          style={{
            position: "absolute",
            top: 160,
            left: 72,
            width: 520,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span
            style={{
              color: "#34D399",
              fontSize: 16,
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontWeight: 600,
            }}
          >
            Result
          </span>
          <span
            style={{
              color: "#34D399",
              fontSize: statFontSize,
              fontWeight: 700,
              lineHeight: 1,
              marginTop: 12,
              letterSpacing: "-0.04em",
              fontFamily: "monospace",
            }}
          >
            {stat}
          </span>
          {label && (
            <span
              style={{
                color: "#A6ADBB",
                fontSize: 22,
                marginTop: 16,
                lineHeight: 1.3,
              }}
            >
              {label}
            </span>
          )}
        </div>

        {/* Right: Title + meta */}
        <div
          style={{
            position: "absolute",
            top: 160,
            left: 640,
            right: 72,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid rgba(34, 211, 238, 0.4)",
              background: "rgba(34, 211, 238, 0.08)",
              alignSelf: "flex-start",
            }}
          >
            <span
              style={{
                color: "#22D3EE",
                fontSize: 14,
                fontFamily: "monospace",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                fontWeight: 600,
              }}
            >
              {industry}
            </span>
          </div>

          <div
            style={{
              color: "#FAFBFD",
              fontSize: titleFontSize,
              fontStyle: "italic",
              fontWeight: 500,
              lineHeight: 1.15,
              marginTop: 24,
              display: "flex",
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </div>

          {(location || timePeriod) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginTop: 28,
                color: "#636B8A",
                fontSize: 18,
                fontFamily: "monospace",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {location && <span>{location}</span>}
              {location && timePeriod && <span>·</span>}
              {timePeriod && <span>{timePeriod}</span>}
            </div>
          )}
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
          <span style={{ color: "#A6ADBB", fontSize: 18 }}>
            Real campaign patterns. Real numbers.
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
    { ...size },
  );
}
