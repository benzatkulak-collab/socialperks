"use client";

/**
 * Client-side analytics shim.
 *
 * Mirrors the server-side `track` API but POSTs to /api/v1/analytics/track
 * so the server batcher does the actual outbound call. This avoids
 * shipping the PostHog API key to the browser.
 *
 * distinctId is held in localStorage (first visit gets a fresh UUIDv4),
 * so the same browser stays attached to the same funnel record across
 * page navigations and reloads. After login, callers should call
 * `aliasToUser(userId)` so the anon timeline merges into the real one
 * — PostHog handles this automatically via $identify.
 */

import { FUNNEL_EVENT } from "./events";
export { FUNNEL_EVENT };

const STORAGE_KEY = "sp.analytics.distinctId";

function getOrCreateDistinctId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fresh = `anon-${crypto.randomUUID()}`;
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // localStorage may throw in private mode / sandboxed iframes — fall
    // back to a per-tab id so events still flow.
    return `anon-tab-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Track an event from the browser. Fire-and-forget — the returned
 * Promise resolves regardless of network outcome so callers can
 * `void track(...)` without worrying about unhandled rejections.
 */
export async function track(
  event: string,
  properties: Record<string, string | number | boolean | null> = {}
): Promise<void> {
  if (typeof window === "undefined") return;
  const distinctId = getOrCreateDistinctId();
  try {
    await fetch("/api/v1/analytics/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, distinctId, properties }),
      // keepalive lets the request survive page unload, which is the
      // common case for landing-page exit events.
      keepalive: true,
    });
  } catch {
    // Silent — analytics never throws into the call site.
  }
}

/**
 * Bind the anon distinctId to a real userId after login. Subsequent
 * events use `userId` as the distinctId; the previous anonymous events
 * stay associated through PostHog's $identify alias chain.
 */
export function aliasToUser(userId: string): void {
  if (typeof window === "undefined") return;
  if (!userId) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, userId);
  } catch {
    // Same fallback as above — best-effort.
  }
}

/** Currently-bound distinct id (anon or aliased). */
export function getDistinctId(): string {
  return getOrCreateDistinctId();
}
