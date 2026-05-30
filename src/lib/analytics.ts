/**
 * Lightweight, fail-soft analytics wrapper.
 *
 * Purpose
 * -------
 * We want to track conversion funnel events (pricing CTA clicks, signup
 * completion, checkout completion) so we can measure which acquisition
 * channels and pricing tiers actually convert.
 *
 * Design
 * ------
 * - The implementation is purposely thin. All event firing goes through
 *   `track(event, props)`, which inspects `window.posthog` at call time
 *   and silently no-ops if the snippet hasn't loaded (or the env var
 *   isn't set). That means analytics never break a page load or throw.
 * - Identify is also no-op-safe. We only fire it when we have a real
 *   userId — never with email or anything that ties this to a person
 *   without consent.
 * - This file is SSR-safe; every call guards on `typeof window`.
 *
 * Adding new events
 * -----------------
 * 1. Add a string-literal entry to `KnownEvent`.
 * 2. Document expected `props` in the JSDoc here.
 * 3. Call `track("event_name", { ... })` at the right place.
 *
 * Known events used today:
 *   - pricing_cta_click  { plan: "free"|"starter"|"professional"|"enterprise", period: "monthly"|"annual" }
 *   - signup_started     { role: "business"|"influencer" }
 *   - signup_completed   { role: "business"|"influencer", planIntent?: string }
 *   - checkout_started   { plan: string, period: "monthly"|"annual" }
 *   - checkout_completed { plan: string }
 *   - waitlist_submitted { vertical: "coffee_shops"|"other", alreadyOnList: boolean, hasBusinessName: boolean, hasCity: boolean }
 */

type KnownEvent =
  | "pricing_cta_click"
  | "signup_started"
  | "signup_completed"
  | "checkout_started"
  | "checkout_completed"
  | "waitlist_submitted";

type EventProps = Record<string, string | number | boolean | null | undefined>;

interface PosthogShim {
  capture: (event: string, props?: EventProps) => void;
  identify?: (id: string, props?: EventProps) => void;
  reset?: () => void;
}

function ph(): PosthogShim | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { posthog?: PosthogShim };
  return w.posthog ?? null;
}

/**
 * Capture an event. No-op if PostHog isn't loaded.
 * Safe to call during SSR, during page transitions, or before the
 * snippet has finished initializing — the captured event will be
 * queued by PostHog's own snippet and dispatched once it's ready.
 */
export function track(event: KnownEvent, props?: EventProps): void {
  try {
    ph()?.capture(event, props);
  } catch {
    // Analytics MUST NOT break the page. Swallow all errors.
  }
}

/**
 * Associate the current visitor with a stable userId.
 * Only call this with a real account id post-signup. Don't pass emails.
 */
export function identify(userId: string, props?: EventProps): void {
  try {
    ph()?.identify?.(userId, props);
  } catch {
    // see track() rationale
  }
}

/**
 * Reset the analytics session — call on logout so the next visitor on
 * the same browser is treated as anonymous, not as the prior user.
 */
export function resetAnalytics(): void {
  try {
    ph()?.reset?.();
  } catch {
    // see track() rationale
  }
}
