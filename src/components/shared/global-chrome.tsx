"use client";

/**
 * GlobalChrome
 * ---------------------------------------------------------------------------
 * Renders shared site-wide UI that lives outside any specific page — currently
 * the activity ticker. Mounted in the root layout. Wrapped as a client
 * component so it can use browser-only APIs without forcing the entire layout
 * to be client-side.
 */

import { ActivityTicker } from "@/components/shared/activity-ticker";

export function GlobalChrome() {
  return (
    <>
      <ActivityTicker />
    </>
  );
}

export default GlobalChrome;
