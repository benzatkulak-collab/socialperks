/**
 * OG Image generation for public campaign pages.
 * Renders a branded 1200x630 image with campaign name, perk value,
 * and business name for rich social media previews.
 */

import { ImageResponse } from "next/og";
import { campaignManager } from "@/lib/campaign-state-machine";
import { eventStore } from "@/lib/events";

export const runtime = "nodejs";
export const alt = "Social Perks Campaign";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface OGImageProps {
  params: Promise<{ campaignId: string }>;
}

export default async function OGImage({ params }: OGImageProps) {
  const { campaignId } = await params;
  const lifecycle = campaignManager.getState(campaignId);

  // Defaults for missing campaigns
  let campaignName = "Campaign";
  let perkDisplay = "Earn a perk";
  let businessName = "Social Perks";

  if (lifecycle) {
    // Resolve name from event store
    const events = eventStore.query({
      type: "campaign.created",
      entityId: campaignId,
    });
    if (events.length > 0) {
      const d = events[0].data ?? {};
      if (typeof d.name === "string") campaignName = d.name;
      if (typeof d.businessName === "string") businessName = d.businessName;
      if (typeof d.discountValue === "number") {
        const dt = typeof d.discountType === "string" ? d.discountType : "dol";
        perkDisplay =
          dt === "pct"
            ? `${d.discountValue}% off`
            : `$${d.discountValue.toFixed(2)}`;
      }
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0C0F1A 0%, #141825 50%, #1C2036 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Background decorative elements */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            opacity: 0.15,
            background:
              "radial-gradient(circle at 20% 30%, rgba(34, 211, 238, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(167, 139, 250, 0.2) 0%, transparent 50%)",
          }}
        />

        {/* Top border accent */}
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

        {/* Brand */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 60,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              color: "#22D3EE",
              fontSize: 24,
              fontStyle: "italic",
              fontWeight: 400,
            }}
          >
            Social Perks
          </span>
        </div>

        {/* Main Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: 900,
            padding: "0 60px",
            textAlign: "center",
          }}
        >
          {/* Business name */}
          <span
            style={{
              color: "#636B8A",
              fontSize: 18,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 500,
              marginBottom: 16,
            }}
          >
            {businessName}
          </span>

          {/* Campaign name */}
          <span
            style={{
              color: "#FAFBFD",
              fontSize: campaignName.length > 40 ? 40 : 52,
              fontStyle: "italic",
              fontWeight: 400,
              lineHeight: 1.2,
              marginBottom: 32,
            }}
          >
            {campaignName}
          </span>

          {/* Perk value */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 40px",
              borderRadius: 16,
              border: "1px solid rgba(34, 211, 238, 0.3)",
              background: "rgba(34, 211, 238, 0.08)",
            }}
          >
            <span
              style={{
                color: "#636B8A",
                fontSize: 16,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Earn up to
            </span>
            <span
              style={{
                color: "#22D3EE",
                fontSize: 36,
                fontWeight: 700,
                fontFamily: "monospace",
              }}
            >
              {perkDisplay}
            </span>
          </div>
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "#636B8A", fontSize: 16 }}>
            Turn customers into your marketing team
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
