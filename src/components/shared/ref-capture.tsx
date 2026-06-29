"use client";

import { useEffect } from "react";

/**
 * Capture `?ref=CODE` from the URL and persist it in a cookie + localStorage
 * so we can attribute the eventual signup back to the referrer. Also fires
 * a best-effort click bump to /api/v1/referrals/click.
 *
 * Mounts once at the layout level. Pure side-effect component, renders
 * nothing.
 */
export function RefCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;
    // Cap length to guard against an absurdly long injected value, but keep it
    // wide enough for the real code format (e.g. "REF-XXXX-XXXX" is 13 chars —
    // a 12-char slice silently dropped the last char and broke the exact-match
    // lookup at signup).
    const code = ref.toUpperCase().slice(0, 32);

    // Persist for 30 days. Cookie is the canonical attribution
    // mechanism (survives subdomain hops); localStorage is a fallback
    // for clients that block cookies.
    const maxAge = 30 * 24 * 60 * 60;
    document.cookie = `sp-ref=${encodeURIComponent(code)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
    try {
      window.localStorage.setItem("sp-ref", code);
    } catch { /* private mode, etc. */ }

    // Strip the ref param from the URL so the user sees a clean address.
    params.delete("ref");
    const cleanQuery = params.toString();
    const newPath = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : "") + window.location.hash;
    window.history.replaceState(null, "", newPath);

    // Best-effort click counter bump. Don't block, don't surface errors.
    void fetch("/api/v1/referrals/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => { /* silent */ });
  }, []);

  return null;
}
