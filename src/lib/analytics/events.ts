/**
 * Funnel event catalog.
 *
 * Naming convention: `<surface>.<action>` in snake_case. Properties are
 * a flat record of strings/numbers/booleans — no nested objects. This
 * keeps the event shape compatible with PostHog, Amplitude, Mixpanel,
 * GA4, and any "send me JSON" sink we plug in later.
 *
 * The Activation Funnel — what we want every business to walk through:
 *   1. landing.viewed        Hit the homepage / a signup-flow surface.
 *   2. auth.signup_started   Opened the signup form.
 *   3. auth.signup_completed Account exists.
 *   4. program.created       First program with a claim code.
 *   5. claim.landing_viewed  A customer hit one of their claim URLs
 *                            (proxy for "shared the sticker").
 *   6. submission.created    First proof submitted by a customer.
 *   7. redemption.completed  Business handed over the perk at checkout.
 *
 * Only steps 1–5 land in this PR; 6 + 7 are documented here as
 * forward references so callers know the canonical names. Their
 * instrumentation is stubbed in the comments of the relevant routes
 * (see /api/v1/claim/[code]/submit and the redeem route in the
 * claim-loop stack #36, #37).
 */

export const FUNNEL_EVENT = {
  LANDING_VIEWED: "landing.viewed",
  AUTH_SIGNUP_STARTED: "auth.signup_started",
  AUTH_SIGNUP_COMPLETED: "auth.signup_completed",
  AUTH_LOGIN_COMPLETED: "auth.login_completed",
  PROGRAM_CREATED: "program.created",
  CLAIM_LANDING_VIEWED: "claim.landing_viewed",
  // Forward references — wired up in the claim-loop stack:
  OTP_REQUESTED: "claim.otp_requested",
  OTP_VERIFIED: "claim.otp_verified",
  SUBMISSION_CREATED: "submission.created",
  REDEMPTION_COMPLETED: "redemption.completed",
} as const;

export type FunnelEvent = (typeof FUNNEL_EVENT)[keyof typeof FUNNEL_EVENT];

/**
 * The minimum property shape for a funnel event. Identification is
 * separate (via `identify`) — events here just need to be tied to a
 * distinct user via `distinctId`.
 */
export interface FunnelEventProps {
  /** Stable per-user identifier. Anonymous: a session-scoped UUID. */
  distinctId: string;
  /** ISO timestamp of when the event happened. Defaults to now if absent. */
  timestamp?: string;
  /** Free-form properties. Flat record only. */
  [key: string]: string | number | boolean | null | undefined;
}
