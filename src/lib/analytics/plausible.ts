/**
 * Plausible Analytics — privacy-friendly, lightweight event tracking.
 *
 * The Plausible script (loaded in src/app/layout.tsx) attaches a global
 * `plausible()` function to `window`. These helpers are SSR-safe and become
 * no-ops when the script is absent (e.g. during local dev without
 * NEXT_PUBLIC_PLAUSIBLE_DOMAIN, or before the script has finished loading).
 */

declare global {
  interface Window {
    plausible?: (...args: unknown[]) => void;
  }
}

/**
 * Track a custom event. Safe to call from anywhere — does nothing on the
 * server or when Plausible isn't loaded.
 */
export function trackEvent(
  name: string,
  props?: Record<string, string | number>,
): void {
  if (typeof window === "undefined") return;
  if (typeof window.plausible !== "function") return;

  try {
    if (props) {
      window.plausible(name, { props });
    } else {
      window.plausible(name);
    }
  } catch {
    // Never let analytics break the app.
  }
}

/** Fired when a user successfully creates an account. */
export function trackSignup(plan: string): void {
  trackEvent("Signup", { plan });
}

/** Fired when a campaign is created/launched. */
export function trackCampaignCreated(platform: string): void {
  trackEvent("Campaign Created", { platform });
}

/** Fired when an internal tool is opened/used (e.g. AI generator, wizard). */
export function trackToolUsed(tool: string): void {
  trackEvent("Tool Used", { tool });
}
