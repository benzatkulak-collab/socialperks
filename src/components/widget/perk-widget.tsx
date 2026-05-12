"use client";

/**
 * PerkWidget — Compact campaign card list for the embeddable widget.
 *
 * Fetches active campaigns for a business from /api/v1/widget/config
 * and renders them as compact cards with campaign name, platform badge,
 * perk value, and a CTA button.
 *
 * Designed to work inside an iframe embed with minimal footprint.
 */

import { useEffect, useState, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface WidgetCampaign {
  id: string;
  name: string;
  budget: {
    type: string;
    allocated: number;
  };
  platform: string | null;
  action: string | null;
  completions: number;
  maxCompletions: number;
  expiresAt: string | null;
}

interface WidgetConfig {
  businessId: string;
  businessName: string;
  campaigns: WidgetCampaign[];
}

interface PerkWidgetProps {
  businessId: string;
  theme: string;
}

// ─── Platform icons (simple text-based for zero-dependency widget) ──────────

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "\u{1F4F7}",
  tiktok: "\u{1F3B5}",
  youtube: "\u{1F3AC}",
  twitter: "\u{1F426}",
  x: "\u{1F426}",
  facebook: "\u{1F465}",
  linkedin: "\u{1F4BC}",
  pinterest: "\u{1F4CC}",
  snapchat: "\u{1F47B}",
  google: "\u2B50",
  yelp: "\u2B50",
  tripadvisor: "\u2708\uFE0F",
  reddit: "\u{1F4AC}",
  twitch: "\u{1F3AE}",
  telegram: "\u2708\uFE0F",
};

function getPlatformIcon(platform: string | null): string {
  if (!platform) return "\u{1F3AF}";
  const key = platform.toLowerCase().replace(/\s+/g, "");
  return PLATFORM_ICONS[key] || "\u{1F4F1}";
}

// ─── Reward formatter ───────────────────────────────────────────────────────

function formatReward(budget: WidgetCampaign["budget"]): string {
  if (!budget) return "Perk";
  if (budget.type === "pct") return `${budget.allocated}% off`;
  if (budget.type === "dol") return `$${budget.allocated} off`;
  return "Perk";
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PerkWidget({ businessId, theme }: PerkWidgetProps) {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/v1/widget/config?businessId=${encodeURIComponent(businessId)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { success: boolean; data: WidgetConfig; error?: { message: string } };
      if (!json.success) {
        throw new Error(json.error?.message || "Failed to load widget config");
      }
      setConfig(json.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load campaigns";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  return (
    <div className="sp-container">
      {/* Header */}
      <div className="sp-header">
        <h1>{config?.businessName || "Earn a Perk"}</h1>
        {config?.businessName && (
          <p>Complete an action, earn a reward</p>
        )}
      </div>

      {/* Campaign cards */}
      <div className="sp-cards">
        {loading && (
          <div className="sp-loading">
            <div className="sp-spinner" />
            Loading campaigns...
          </div>
        )}

        {error && (
          <div className="sp-empty" style={{ color: theme === "dark" ? "#EF4444" : "#DC2626" }}>
            {error}
          </div>
        )}

        {!loading && !error && config?.campaigns.length === 0 && (
          <div className="sp-empty">
            No active campaigns right now. Check back soon!
          </div>
        )}

        {!loading &&
          !error &&
          config?.campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} theme={theme} />
          ))}
      </div>

      {/* Powered by footer */}
      <div className="sp-footer">
        <a
          href="https://socialperks.app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by Social Perks
        </a>
      </div>
    </div>
  );
}

// ─── Campaign Card ──────────────────────────────────────────────────────────

interface CampaignCardProps {
  campaign: WidgetCampaign;
  theme: string;
}

function CampaignCard({ campaign, theme }: CampaignCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!proofUrl.trim() || !email.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      // Hits the no-auth public submission endpoint — the authenticated
      // /api/v1/submissions endpoint is unreachable from a third-party
      // origin because there is no session or CSRF token here.
      const res = await fetch("/api/v1/submissions/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          actionId: campaign.action ?? "widget_submission",
          proofUrl: proofUrl.trim(),
          proofType: "url",
          email: email.trim(),
          source: "widget",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg = body?.error?.message ?? `Submit failed (${res.status})`;
        setError(msg);
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
      setExpanded(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const icon = getPlatformIcon(campaign.platform);
  const reward = formatReward(campaign.budget);
  const isDark = theme === "dark";

  return (
    <div className="sp-card">
      <p className="sp-card-name">
        {icon} {campaign.name || "Campaign"}
      </p>

      <div className="sp-card-meta">
        <span className="sp-badge--green">{reward}</span>
        {campaign.platform && (
          <span className="sp-badge">{campaign.platform}</span>
        )}
        {campaign.action && (
          <span className="sp-badge">{campaign.action}</span>
        )}
      </div>

      {submitted ? (
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: isDark ? "#34D399" : "#059669",
            padding: "8px 0",
          }}
        >
          Thanks! Your perk is being reviewed.
        </div>
      ) : expanded ? (
        <div style={{ marginTop: 8 }}>
          {(() => {
            const inputStyle = {
              display: "block",
              width: "100%",
              padding: "8px 12px",
              marginBottom: 8,
              background: isDark ? "#0C0F1A" : "#FFFFFF",
              border: `1px solid ${isDark ? "#1E2340" : "#E2E5EF"}`,
              borderRadius: 8,
              color: isDark ? "#F1F3F9" : "#1A1D2E",
              fontSize: 13,
              fontFamily: "inherit" as const,
              outline: "none",
              boxSizing: "border-box" as const,
            };
            return (
              <>
                <input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="url"
                  placeholder="Paste your proof URL..."
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  style={inputStyle}
                />
              </>
            );
          })()}
          {error && (
            <div style={{ color: "#F87171", fontSize: 12, marginBottom: 6 }}>
              {error}
            </div>
          )}
          <button
            className="sp-cta"
            onClick={() => void handleSubmit()}
            disabled={submitting || !proofUrl.trim() || !email.trim()}
            style={{
              opacity:
                submitting || !proofUrl.trim() || !email.trim() ? 0.5 : 1,
              cursor:
                submitting || !proofUrl.trim() || !email.trim()
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {submitting ? "Submitting..." : "Submit Proof"}
          </button>
        </div>
      ) : (
        <button className="sp-cta" onClick={() => setExpanded(true)}>
          Participate
        </button>
      )}
    </div>
  );
}
