/**
 * GET /api/v1/embed/reviews — Embeddable review widget
 *
 * Returns either a JavaScript snippet (format=js) that injects review HTML
 * into a target element, or static HTML (format=html) intended to be loaded
 * inside an iframe. Every render includes a "Reviews powered by Social Perks"
 * backlink that drives SEO juice back to the marketing site.
 *
 * Query parameters:
 *   businessId (required) — The business ID whose reviews to load
 *   theme      (optional) — "light" or "dark" (default: "dark")
 *   limit      (optional) — max reviews to show, 1-20 (default: 5)
 *   format     (optional) — "js" or "html" (default: "js")
 *
 * Returns:
 *   format=js   → Content-Type: application/javascript
 *   format=html → Content-Type: text/html
 *
 * Cache: 5 minutes (public + s-maxage)
 * Auth: none (public endpoint, fully CORS-open)
 * Rate limit: public tier
 */

import type { NextRequest } from "next/server";
import { rateLimit, getQuery } from "../../_shared";
import { validateId, validateEnum } from "@/lib/security/validate";

// ─── CORS / cache headers ────────────────────────────────────────────────────

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=300, s-maxage=300",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

// ─── Demo review data ────────────────────────────────────────────────────────
//
// In production these would be loaded from the submissions/reviews engine via
// `getReviewsByBusinessId(...)`. For the public embed we ship a deterministic
// placeholder set so the widget always renders even when the demo backend has
// no data — the call site for real review fetching can be swapped in below.

interface EmbedReview {
  author: string;
  rating: number; // 0..5
  text: string;
  date: string; // ISO yyyy-mm-dd
  source: string; // "Google" | "Yelp" | ...
}

function getDemoReviews(businessId: string, limit: number): EmbedReview[] {
  // Seeded by businessId so the same widget consistently shows the same set
  const reviews: EmbedReview[] = [
    {
      author: "Sarah K.",
      rating: 5,
      text:
        "Honestly one of the best experiences I've had in town. Friendly, fast, and they followed up. Will be back.",
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
      text:
        "Solid place, good service. A little crowded on weekends but worth the wait.",
      date: "2026-04-11",
      source: "Yelp",
    },
    {
      author: "Jordan L.",
      rating: 5,
      text:
        "Top notch. They actually care about their customers — rare these days.",
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
    {
      author: "Riley M.",
      rating: 4,
      text: "Consistently good. My new go-to spot in the neighborhood.",
      date: "2026-03-21",
      source: "Google",
    },
  ];

  // Deterministic offset so different businessIds get a different first review
  let seed = 0;
  for (let i = 0; i < businessId.length; i++) seed = (seed + businessId.charCodeAt(i)) % reviews.length;
  const ordered = [...reviews.slice(seed), ...reviews.slice(0, seed)];
  return ordered.slice(0, limit);
}

// ─── HTML escape ─────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeJs(s: string): string {
  // Safe to drop into a JS string literal (used inside JSON.stringify mostly)
  return s.replace(/<\/script>/gi, "<\\/script>");
}

// ─── Renderers ───────────────────────────────────────────────────────────────

function themeColors(theme: "light" | "dark") {
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

function renderStars(rating: number, amber: string, muted: string): string {
  const full = Math.round(rating);
  let out = "";
  for (let i = 0; i < 5; i++) {
    const fill = i < full ? amber : muted;
    out += `<svg width="14" height="14" viewBox="0 0 24 24" fill="${fill}" aria-hidden="true" style="display:inline-block;vertical-align:middle;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
  }
  return `<span style="display:inline-flex;gap:1px;" aria-label="${rating} out of 5 stars">${out}</span>`;
}

function renderReviewsInner(
  reviews: EmbedReview[],
  theme: "light" | "dark",
  poweredByUrl: string
): string {
  const c = themeColors(theme);
  const avg =
    reviews.length === 0
      ? 0
      : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;

  const header = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:12px;flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:10px;">
        ${renderStars(avg, c.amber, c.muted)}
        <span style="font-weight:600;color:${c.text};font-size:14px;">${avg.toFixed(1)}</span>
        <span style="color:${c.dim};font-size:13px;">(${reviews.length} review${reviews.length === 1 ? "" : "s"})</span>
      </div>
    </div>
  `;

  const cards = reviews
    .map((r) => {
      const initials = escapeHtml(r.author.split(" ").map((p) => p[0] || "").join("").slice(0, 2));
      return `
        <div style="background:${c.surface};border:1px solid ${c.border};border-radius:12px;padding:14px 16px;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="width:32px;height:32px;border-radius:50%;background:${c.cyan}22;color:${c.cyan};display:inline-flex;align-items:center;justify-content:center;font-weight:600;font-size:12px;">${initials}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;color:${c.text};font-size:13px;line-height:1.2;">${escapeHtml(r.author)}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
                ${renderStars(r.rating, c.amber, c.muted)}
                <span style="color:${c.dim};font-size:11px;">${escapeHtml(r.source)} · ${escapeHtml(r.date)}</span>
              </div>
            </div>
          </div>
          <p style="margin:0;color:${c.text};font-size:13px;line-height:1.5;">${escapeHtml(r.text)}</p>
        </div>
      `;
    })
    .join("");

  const footer = `
    <div style="text-align:center;padding-top:10px;border-top:1px solid ${c.border};margin-top:6px;">
      <a href="${escapeHtml(poweredByUrl)}" target="_blank" rel="noopener" style="color:${c.muted};font-size:11px;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
        Reviews powered by
        <span style="color:${c.cyan};font-weight:600;">Social Perks</span>
      </a>
    </div>
  `;

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${c.text};background:${c.bg};border-radius:14px;padding:18px;box-sizing:border-box;">
      ${header}
      <div>${cards}</div>
      ${footer}
    </div>
  `;
}

function renderHtmlPage(html: string, theme: "light" | "dark"): string {
  const c = themeColors(theme);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Social Perks Reviews</title>
<style>
  html,body{margin:0;padding:0;background:${c.bg};color:${c.text};}
  *{box-sizing:border-box;}
  body{padding:8px;}
</style>
</head>
<body>${html}</body>
</html>`;
}

function renderJsLoader(html: string, businessId: string): string {
  // The snippet looks for either `data-sp-reviews="{businessId}"` containers
  // or a default `#sp-reviews-{businessId}` element. Injects the HTML once.
  const safeHtml = escapeJs(html);
  return `(function(){
  "use strict";
  var BID=${JSON.stringify(businessId)};
  var HTML=${JSON.stringify(safeHtml)};
  function mount(el){
    if(!el||el.getAttribute("data-sp-mounted")==="1")return;
    el.setAttribute("data-sp-mounted","1");
    el.innerHTML=HTML;
  }
  function init(){
    var byId=document.getElementById("sp-reviews-"+BID);
    if(byId)mount(byId);
    var nodes=document.querySelectorAll('[data-sp-reviews="'+BID+'"]');
    for(var i=0;i<nodes.length;i++)mount(nodes[i]);
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  }else{
    init();
  }
})();`;
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const params = getQuery(req);
  const businessIdParam = params.get("businessId");
  const themeParam = params.get("theme") || "dark";
  const limitParam = params.get("limit") || "5";
  const formatParam = params.get("format") || "js";

  if (!businessIdParam) {
    return new Response("/* Error: businessId query parameter is required */", {
      status: 400,
      headers: { "Content-Type": "application/javascript", ...corsHeaders() },
    });
  }

  const idRes = validateId(businessIdParam);
  if (!idRes.success) {
    return new Response("/* Error: invalid businessId */", {
      status: 400,
      headers: { "Content-Type": "application/javascript", ...corsHeaders() },
    });
  }
  const businessId = idRes.data;

  const themeRes = validateEnum(themeParam, "theme", ["light", "dark"] as const);
  const theme: "light" | "dark" = themeRes.success ? themeRes.data : "dark";

  const formatRes = validateEnum(formatParam, "format", ["js", "html"] as const);
  const format: "js" | "html" = formatRes.success ? formatRes.data : "js";

  let limit = parseInt(limitParam, 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 5;
  if (limit > 20) limit = 20;

  const origin = req.nextUrl.origin;
  const poweredByUrl = `${origin}/?utm_source=embed&utm_medium=reviews_widget&utm_campaign=backlink`;

  const reviews = getDemoReviews(businessId, limit);
  const innerHtml = renderReviewsInner(reviews, theme, poweredByUrl);

  if (format === "html") {
    const page = renderHtmlPage(innerHtml, theme);
    return new Response(page, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Request-Id": crypto.randomUUID(),
        ...corsHeaders(),
      },
    });
  }

  const js = renderJsLoader(innerHtml, businessId);
  return new Response(js, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "X-Request-Id": crypto.randomUUID(),
      ...corsHeaders(),
    },
  });
}
