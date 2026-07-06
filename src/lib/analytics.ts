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
 *
 * Activation funnel (the events after signup that actually predict paid
 * conversion + retention — previously the funnel went dark at signup):
 *   - campaign_launched    { actions: number, reward: string }
 *   - submission_created   { }            // a customer submitted proof
 *   - submission_reviewed  { decision: "approved"|"rejected" }
 *   - perk_redeemed        { }            // the aha-moment: real perk redeemed
 *
 * Channel attribution
 * -------------------
 * Every event is automatically stamped with the visitor's first-touch
 * marketing context (utm_source/medium/campaign, gclid/fbclid, referrer_host,
 * landing_path) via `getAttribution()`. That is what makes it possible to
 * break conversion rate down BY CHANNEL — the question you need to answer to
 * decide where acquisition spend actually pays off.
 */

import { captureFirstTouch, getAttribution } from "@/lib/attribution";

type KnownEvent =
  | "pricing_cta_click"
  | "signup_started"
  | "signup_completed"
  | "checkout_started"
  | "checkout_completed"
  | "campaign_launched"
  | "submission_created"
  | "submission_reviewed"
  | "perk_redeemed";

type EventProps = Record<string, string | number | boolean | null | undefined>;

interface PosthogShim {
  capture: (event: string, props?: EventProps) => void;
  identify?: (id: string, props?: EventProps) => void;
  register?: (props: EventProps) => void;
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
let warnedAnalyticsMissing = false;

/**
 * In production, surface ONCE if PostHog never loaded — otherwise the entire
 * funnel/activation pipeline silently drops every event and dashboards read
 * "0 conversions" with no indication the instrumentation is simply unwired
 * (a missing NEXT_PUBLIC_POSTHOG_KEY). Dev intentionally runs without the
 * snippet, so we stay quiet there.
 */
function warnIfAnalyticsMissing(): void {
  if (warnedAnalyticsMissing) return;
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") return;
  warnedAnalyticsMissing = true;
  console.warn(
    "[analytics] PostHog is not loaded — funnel and activation events are being " +
      "dropped. Set NEXT_PUBLIC_POSTHOG_KEY (and host) so conversion data is captured.",
  );
}

export function track(event: KnownEvent, props?: EventProps): void {
  const client = ph();
  if (!client) {
    warnIfAnalyticsMissing();
    return;
  }
  try {
    // Stamp every event with first-touch channel attribution so conversion
    // rate can be sliced by acquisition source. Explicit props win on collision.
    client.capture(event, { ...getAttribution(), ...props });
  } catch {
    // Analytics MUST NOT break the page. Swallow all errors.
  }
}

/**
 * Associate the current visitor with a stable userId.
 * Only call this with a real account id post-signup. Don't pass emails.
 * First-touch attribution is attached as person properties so the acquisition
 * channel travels with the identified person across sessions.
 */
export function identify(userId: string, props?: EventProps): void {
  try {
    ph()?.identify?.(userId, { ...getAttribution(), ...props });
  } catch {
    // see track() rationale
  }
}

/**
 * Capture first-touch attribution and register it as PostHog super-properties
 * so autocaptured events (pageviews, clicks) are also channel-tagged. Called
 * once from the layout-level AttributionCapture component. Safe pre-load: the
 * cookie is always written; register() is best-effort if the snippet is ready.
 */
export function initAttribution(): void {
  captureFirstTouch();
  const attribution = getAttribution();
  if (Object.keys(attribution).length === 0) return;
  try {
    ph()?.register?.(attribution);
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
