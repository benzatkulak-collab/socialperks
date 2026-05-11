/**
 * Dynamic OpenGraph image for the city × industry local SEO pages.
 * "{Industry} Marketing in {City}" with city featured prominently.
 */

import { ImageResponse } from "next/og";
import { CITY_MAP, INDUSTRY_MAP } from "@/lib/programmatic-seo/data";

export const runtime = "nodejs";
export const alt = "Social Perks Local Marketing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ city: string; industry: string }>;
}

export default async function OGImage({ params }: Props) {
  const { city: citySlug, industry: industrySlug } = await params;
  const city = CITY_MAP.get(citySlug);
  const industry = INDUSTRY_MAP.get(industrySlug);

  const cityName = city?.name ?? "Your City";
  const stateCode = city?.stateCode ?? "";
  const industryPlural = industry?.plural ?? "Small Business";
  const platforms = industry?.platforms ?? ["Instagram", "Google", "TikTok"];

  // Scale city name to fit
  const cityFontSize =
    cityName.length > 14 ? 110 : cityName.length > 10 ? 130 : 150;

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
              "radial-gradient(circle at 20% 30%, rgba(34, 211, 238, 0.2) 0%, transparent 55%), radial-gradient(circle at 85% 80%, rgba(52, 211, 153, 0.14) 0%, transparent 55%)",
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
            background: "linear-gradient(90deg, #22D3EE, #34D399, #22D3EE)",
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
            Local
          </span>
        </div>

        {/* Industry badge top-right */}
        <div
          style={{
            position: "absolute",
            top: 50,
            right: 72,
            display: "flex",
            alignItems: "center",
            padding: "10px 22px",
            borderRadius: 999,
            background: "rgba(52, 211, 153, 0.12)",
            border: "1px solid rgba(52, 211, 153, 0.4)",
          }}
        >
          <span
            style={{
              color: "#34D399",
              fontSize: 16,
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              fontWeight: 600,
            }}
          >
            {industryPlural}
          </span>
        </div>

        {/* Eyebrow */}
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
              color: "#A6ADBB",
              fontSize: 32,
              fontStyle: "italic",
            }}
          >
            {industryPlural} marketing in
          </span>
        </div>

        {/* Big city name */}
        <div
          style={{
            position: "absolute",
            top: 220,
            left: 72,
            right: 72,
            display: "flex",
            alignItems: "flex-end",
            gap: 24,
          }}
        >
          <span
            style={{
              color: "#FAFBFD",
              fontSize: cityFontSize,
              fontStyle: "italic",
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {cityName}
          </span>
          {stateCode && (
            <span
              style={{
                color: "#22D3EE",
                fontSize: 56,
                fontFamily: "monospace",
                fontWeight: 600,
                marginBottom: 18,
              }}
            >
              {stateCode}
            </span>
          )}
        </div>

        {/* Platform pills */}
        <div
          style={{
            position: "absolute",
            bottom: 110,
            left: 72,
            right: 72,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span
            style={{
              color: "#636B8A",
              fontSize: 16,
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginRight: 8,
            }}
          >
            Channels
          </span>
          {platforms.slice(0, 3).map((p) => (
            <div
              key={p}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 20px",
                borderRadius: 10,
                border: "1px solid rgba(34, 211, 238, 0.3)",
                background: "rgba(34, 211, 238, 0.06)",
              }}
            >
              <span
                style={{
                  color: "#22D3EE",
                  fontSize: 20,
                  fontWeight: 500,
                }}
              >
                {p}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 72,
            right: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ color: "#A6ADBB", fontSize: 18 }}>
            Customers as your marketing team.
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
