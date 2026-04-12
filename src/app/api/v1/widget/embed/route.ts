/**
 * GET /api/v1/widget/embed — Embeddable JavaScript snippet
 *
 * Returns a JavaScript snippet that businesses can paste into their website.
 * The snippet creates an iframe pointing to /widget/[businessId] with the
 * specified theme and position.
 *
 * Query parameters:
 *   businessId (required) — The business ID to load campaigns for
 *   theme      (optional) — "light" or "dark" (default: "dark")
 *   position   (optional) — "bottom-right" or "bottom-left" (default: "bottom-right")
 *
 * Returns: Content-Type: application/javascript
 * Rate limit: public tier
 * Auth: none (public endpoint)
 */

import type { NextRequest } from "next/server";
import { rateLimit, getQuery } from "../../_shared";
import { validateId, validateEnum } from "@/lib/security/validate";

// ─── CORS helper for cross-origin embed requests ─────────────────────────────

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=300, s-maxage=300",
  };
}

// ─── OPTIONS (CORS preflight) ────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Rate limit — public tier
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const params = getQuery(req);
  const businessIdParam = params.get("businessId");
  const themeParam = params.get("theme") || "dark";
  const positionParam = params.get("position") || "bottom-right";

  // Validate businessId
  if (!businessIdParam) {
    return new Response(
      "/* Error: businessId query parameter is required */",
      {
        status: 400,
        headers: { "Content-Type": "application/javascript", ...corsHeaders() },
      }
    );
  }

  const v = validateId(businessIdParam);
  if (!v.success) {
    return new Response(
      "/* Error: invalid businessId */",
      {
        status: 400,
        headers: { "Content-Type": "application/javascript", ...corsHeaders() },
      }
    );
  }

  // Validate theme
  const themeResult = validateEnum(themeParam, "theme", ["light", "dark"] as const);
  const theme = themeResult.success ? themeResult.data : "dark";

  // Validate position
  const positionResult = validateEnum(positionParam, "position", ["bottom-right", "bottom-left"] as const);
  const position = positionResult.success ? positionResult.data : "bottom-right";

  // Derive the app origin from the request
  const origin = req.nextUrl.origin;
  const businessId = v.data;

  // Build the embed JavaScript snippet
  const script = generateEmbedScript(origin, businessId, theme, position);

  return new Response(script, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "X-Request-Id": crypto.randomUUID(),
      ...corsHeaders(),
    },
  });
}

// ─── Script generator ────────────────────────────────────────────────────────

function generateEmbedScript(
  origin: string,
  businessId: string,
  theme: string,
  position: string
): string {
  const iframeSrc = `${origin}/widget/${encodeURIComponent(businessId)}?theme=${encodeURIComponent(theme)}`;
  const posRight = position === "bottom-right";

  return `(function(){
  "use strict";
  if(window.__SP_EMBED_LOADED)return;
  window.__SP_EMBED_LOADED=true;

  var IFRAME_SRC=${JSON.stringify(iframeSrc)};
  var POSITION=${JSON.stringify(position)};

  // ─── Styles ──────────────────────────────────────────────
  var style=document.createElement("style");
  style.textContent=[
    ".sp-embed-fab{",
      "position:fixed;bottom:24px;${posRight ? "right:24px" : "left:24px"};z-index:99998;",
      "display:inline-flex;align-items:center;gap:8px;",
      "padding:12px 20px;border:none;border-radius:999px;",
      "background:#22D3EE;color:#0C0F1A;",
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;",
      "font-size:14px;font-weight:600;line-height:1;",
      "cursor:pointer;box-shadow:0 4px 24px rgba(34,211,238,0.3);",
      "transition:transform 0.2s ease,box-shadow 0.2s ease;",
    "}",
    ".sp-embed-fab:hover{transform:translateY(-2px);box-shadow:0 6px 32px rgba(34,211,238,0.45)}",
    ".sp-embed-iframe-wrap{",
      "position:fixed;bottom:80px;${posRight ? "right:24px" : "left:24px"};z-index:99999;",
      "width:400px;height:520px;max-width:calc(100vw - 48px);max-height:calc(100vh - 120px);",
      "border-radius:16px;overflow:hidden;",
      "box-shadow:0 8px 40px rgba(0,0,0,0.3);",
      "transition:opacity 0.2s ease,transform 0.2s ease;",
    "}",
    ".sp-embed-iframe-wrap.sp-hidden{opacity:0;transform:translateY(16px);pointer-events:none}",
    ".sp-embed-iframe{width:100%;height:100%;border:none;border-radius:16px;}",
    "@media(max-width:480px){",
      ".sp-embed-iframe-wrap{width:calc(100vw - 24px);${posRight ? "right:12px" : "left:12px"};bottom:72px;height:70vh}",
      ".sp-embed-fab{${posRight ? "right:12px" : "left:12px"};bottom:12px;padding:10px 16px;font-size:13px}",
    "}",
  ].join("");
  document.head.appendChild(style);

  // ─── FAB button ──────────────────────────────────────────
  var fab=document.createElement("button");
  fab.className="sp-embed-fab";
  fab.setAttribute("aria-label","Open Social Perks - Earn a perk");
  fab.textContent="Earn a Perk";
  document.body.appendChild(fab);

  // ─── Iframe wrapper ──────────────────────────────────────
  var wrap=document.createElement("div");
  wrap.className="sp-embed-iframe-wrap sp-hidden";
  var iframe=document.createElement("iframe");
  iframe.className="sp-embed-iframe";
  iframe.src=IFRAME_SRC;
  iframe.title="Social Perks - Earn rewards";
  iframe.setAttribute("loading","lazy");
  iframe.setAttribute("allow","clipboard-write");
  wrap.appendChild(iframe);
  document.body.appendChild(wrap);

  // ─── Toggle ──────────────────────────────────────────────
  var open=false;
  fab.addEventListener("click",function(){
    open=!open;
    if(open){
      wrap.classList.remove("sp-hidden");
      fab.textContent="Close";
    }else{
      wrap.classList.add("sp-hidden");
      fab.textContent="Earn a Perk";
    }
  });

  // Close on Escape
  document.addEventListener("keydown",function(e){
    if(e.key==="Escape"&&open){
      open=false;
      wrap.classList.add("sp-hidden");
      fab.textContent="Earn a Perk";
    }
  });
})();`;
}
