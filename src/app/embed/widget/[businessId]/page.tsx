/**
 * /embed/widget/[businessId] — Standalone iframe widget page
 *
 * Rendered inside an iframe on third-party customer sites. Shows a compact
 * card of recent reviews/activity for the business with a small "Powered by
 * Social Perks" footer link that drives backlinks. No nav, no footer, no
 * tracking, no auth required.
 *
 * Search params:
 *   theme — "light" | "dark" (default: "dark")
 *   limit — 1..20 (default: 5)
 *
 * NOTE: This route is intentionally `noindex,nofollow` — search engines
 * should index the marketing /embed page instead.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Social Perks Widget",
  robots: { index: false, follow: false },
};

interface WidgetPageProps {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ theme?: string; limit?: string }>;
}

type Theme = "light" | "dark";

interface DemoReview {
  author: string;
  rating: number;
  text: string;
  date: string;
  source: string;
}

const DEMO_REVIEWS: DemoReview[] = [
  {
    author: "Sarah K.",
    rating: 5,
    text:
      "Honestly one of the best experiences I've had in town. Friendly, fast, and they followed up.",
    date: "2026-04-22",
    source: "Google",
  },
  {
    author: "Marcus T.",
    rating: 5,
    text:
      "Great quality and fair pricing. The perk program is a fun bonus — got a free coffee just for posting!",
    date: "2026-04-18",
    source: "Google",
  },
  {
    author: "Priya R.",
    rating: 4,
    text: "Solid place, good service. A little crowded on weekends but worth the wait.",
    date: "2026-04-11",
    source: "Yelp",
  },
  {
    author: "Jordan L.",
    rating: 5,
    text: "Top notch. They actually care about their customers — rare these days.",
    date: "2026-04-05",
    source: "Google",
  },
  {
    author: "Alex W.",
    rating: 5,
    text:
      "Couldn't recommend more. The team is super friendly and the quality speaks for itself.",
    date: "2026-03-28",
    source: "Facebook",
  },
];

function pickReviews(businessId: string, limit: number): DemoReview[] {
  let seed = 0;
  for (let i = 0; i < businessId.length; i++) {
    seed = (seed + businessId.charCodeAt(i)) % DEMO_REVIEWS.length;
  }
  const ordered = [...DEMO_REVIEWS.slice(seed), ...DEMO_REVIEWS.slice(0, seed)];
  return ordered.slice(0, Math.max(1, Math.min(limit, DEMO_REVIEWS.length)));
}

function colors(theme: Theme) {
  return theme === "dark"
    ? {
        bg: "#0C0F1A",
        surface: "#141828",
        border: "#1E2340",
        text: "#F1F3F9",
        dim: "#636B8A",
        muted: "#4A5272",
        cyan: "#22D3EE",
        amber: "#FBBF24",
      }
    : {
        bg: "#FFFFFF",
        surface: "#F8F9FC",
        border: "#E2E5EF",
        text: "#1A1D2E",
        dim: "#6B7280",
        muted: "#9CA3AF",
        cyan: "#0891B2",
        amber: "#D97706",
      };
}

function Stars({ rating, amber, muted }: { rating: number; amber: string; muted: string }) {
  const full = Math.round(rating);
  return (
    <span style={{ display: "inline-flex", gap: 1 }} aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width={13}
          height={13}
          viewBox="0 0 24 24"
          fill={i < full ? amber : muted}
          aria-hidden="true"
          style={{ display: "inline-block" }}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

export default async function EmbedWidgetPage({ params, searchParams }: WidgetPageProps) {
  const { businessId } = await params;
  const sp = await searchParams;

  const theme: Theme = sp.theme === "light" ? "light" : "dark";
  let limit = parseInt(sp.limit ?? "5", 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 5;
  if (limit > 20) limit = 20;

  const reviews = pickReviews(businessId, limit);
  const avg =
    reviews.length === 0
      ? 0
      : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;

  const c = colors(theme);

  return (
    <div
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        background: c.bg,
        color: c.text,
        minHeight: "100vh",
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Stars rating={avg} amber={c.amber} muted={c.muted} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>{avg.toFixed(1)}</span>
          <span style={{ color: c.dim, fontSize: 13 }}>
            ({reviews.length} review{reviews.length === 1 ? "" : "s"})
          </span>
        </div>
      </div>

      {/* Review cards */}
      <div>
        {reviews.map((r, idx) => {
          const initials = r.author
            .split(" ")
            .map((p) => p[0] || "")
            .join("")
            .slice(0, 2);
          return (
            <div
              key={idx}
              style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: `${c.cyan}22`,
                    color: c.cyan,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>
                    {r.author}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <Stars rating={r.rating} amber={c.amber} muted={c.muted} />
                    <span style={{ color: c.dim, fontSize: 11 }}>
                      {r.source} · {r.date}
                    </span>
                  </div>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{r.text}</p>
            </div>
          );
        })}
      </div>

      {/* Powered-by footer */}
      <div
        style={{
          textAlign: "center",
          padding: "12px 0 4px",
          marginTop: 6,
          borderTop: `1px solid ${c.border}`,
        }}
      >
        <Link
          href="/?utm_source=embed&utm_medium=iframe_widget&utm_campaign=backlink"
          target="_top"
          rel="noopener"
          style={{
            color: c.muted,
            fontSize: 11,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          Powered by{" "}
          <span style={{ color: c.cyan, fontWeight: 600, marginLeft: 2 }}>Social Perks</span>
        </Link>
      </div>
    </div>
  );
}
