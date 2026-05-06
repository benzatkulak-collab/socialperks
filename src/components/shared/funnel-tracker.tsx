"use client";

import { useEffect } from "react";
import { track, FUNNEL_EVENT } from "@/lib/analytics/client";

/**
 * Mounts once at the layout level. Fires `landing.viewed` for every
 * page navigation and gives the rest of the app access to the
 * client-side track API via /lib/analytics/client.
 *
 * Pure side-effect component — renders nothing.
 */
export function FunnelTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initial pageview. Subsequent client-side route changes are
    // captured by individual surfaces calling `track` themselves —
    // this is the floor.
    void track(FUNNEL_EVENT.LANDING_VIEWED, {
      path: window.location.pathname,
      referrer: document.referrer || null,
    });
  }, []);

  return null;
}
