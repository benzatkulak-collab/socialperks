// Plausible-style event tracking. The runtime detects window.plausible.
// If you switch to Cloudflare Analytics (which doesn't support custom events on the free tier),
// these calls will simply no-op. To get custom events, install PostHog instead.

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

// ─── User Journey Events ────────────────────────────────────────────────────
//
// One call site per event so renames stay consistent across the app.
// Naming matches the convention used in the Plausible dashboard.

/** User opened the signup form / chose a role. */
export function trackSignupStarted(role: string): void {
  trackEvent("signup_started", { role });
}

/** Account creation request returned success. */
export function trackSignupCompleted(role: string): void {
  trackEvent("signup_completed", { role });
}

/** Fired when a user successfully creates an account.
 *  Retained for back-compat; also fires `signup_completed`. */
export function trackSignup(plan: string): void {
  trackEvent("Signup", { plan });
  trackEvent("signup_completed", { plan });
}

/** User clicked any "upgrade" CTA. */
export function trackUpgradeClicked(plan: string, source: string): void {
  trackEvent("upgrade_clicked", { plan, source });
}

/** Checkout session creation request was issued. */
export function trackCheckoutStarted(plan: string, interval: string): void {
  trackEvent("checkout_started", { plan, interval });
}

/** User landed on the post-checkout success page. */
export function trackCheckoutCompleted(
  plan: string | null,
  mock: boolean,
): void {
  trackEvent("checkout_completed", {
    plan: plan ?? "unknown",
    mock: mock ? "true" : "false",
  });
}

/** Trial activated (first-run or post-signup). */
export function trackTrialStarted(plan: string = "free"): void {
  trackEvent("trial_started", { plan });
}

/** Subscription is confirmed active (Stripe webhook fired or success page reached). */
export function trackSubscriptionActive(plan: string): void {
  trackEvent("subscription_active", { plan });
}

/** Lead finder search executed. */
export function trackLeadSearchUsed(query?: string): void {
  trackEvent("lead_search_used", query ? { query: query.slice(0, 64) } : undefined);
}

/** Fired when a campaign is created/launched. */
export function trackCampaignCreated(platform: string): void {
  trackEvent("Campaign Created", { platform });
}

/** Fired when an internal tool is opened/used (e.g. AI generator, wizard). */
export function trackToolUsed(tool: string): void {
  trackEvent("Tool Used", { tool });
  trackEvent("tool_used", { tool });
}
