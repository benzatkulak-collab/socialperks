"use client";

import { useEffect } from "react";
import { initAttribution } from "@/lib/analytics";

/**
 * Capture first-touch marketing attribution (utm_*, gclid/fbclid, referrer,
 * landing path) once on first visit and register it as PostHog
 * super-properties so every event — funnel and autocaptured alike — is tagged
 * with the acquisition channel. Pure side effect, renders nothing.
 *
 * Mounts alongside RefCapture at the layout level. Unlike RefCapture it runs
 * on every visit (not only when a ?ref code is present), because the goal is
 * to attribute organic/direct/paid traffic, not just referrals.
 */
export function AttributionCapture() {
  useEffect(() => {
    initAttribution();
  }, []);

  return null;
}
