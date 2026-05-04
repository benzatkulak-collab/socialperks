/**
 * Map machine-readable API error codes to human-friendly messages.
 *
 * Why: client-rendered toasts and inline errors should never expose
 * codes like `PROHIBITED_ACTION` or `INVALID_PLAN` to end users —
 * those are debugging tokens, not communication.
 *
 * Add to this map as new error codes are introduced. The default
 * (when a code isn't mapped) is to fall through to the API's
 * `error.message`, which the backend should already write in
 * customer-facing language.
 */

const CODE_TO_MESSAGE: Record<string, string> = {
  // Auth
  NO_TOKEN: "Please log in to continue.",
  INVALID_TOKEN: "Your session expired. Please log in again.",
  UNAUTHORIZED: "You need to log in to do that.",

  // Rate limiting
  RATE_LIMIT_EXCEEDED: "You're moving fast — please wait a moment and try again.",

  // CSRF
  CSRF_MISSING: "Your session needs a refresh. Reload the page and try again.",
  CSRF_INVALID: "Your session needs a refresh. Reload the page and try again.",

  // Compliance / campaign launch
  PROHIBITED_ACTION:
    "That platform's terms prohibit incentivized reviews. Pick a content action (Instagram post, TikTok video, etc.) instead.",
  LAUNCH_BLOCKED:
    "Your campaign needs a small fix before launch — see the message above for details.",

  // Plan / billing
  INVALID_PLAN: "That plan isn't available right now. Refresh and try again.",
  PLAN_LIMIT_REACHED:
    "You've hit your plan's limit. Upgrade for more, or end an existing campaign.",
  STRIPE_ERROR: "Couldn't reach Stripe. Try again in a moment.",
  BILLING_UNAVAILABLE:
    "Billing is currently being set up. Email us if you'd like to be one of the first paying customers.",

  // Validation
  INVALID_EMAIL: "That email doesn't look right.",
  INVALID_BODY: "Something's off with what you submitted. Try again.",
  MISSING_FIELDS: "A required field is missing.",

  // Submissions
  FRAUD_DETECTED:
    "That submission was flagged automatically. If you think this is a mistake, contact support.",

  // Server-side
  PRICING_FAILED: "We couldn't load pricing right now. Refresh in a moment.",
  RECOMMENDATIONS_FAILED: "We couldn't load recommendations. Try again shortly.",
};

/**
 * Translate an API error envelope into a user-facing string.
 * Accepts the full error object (with `code` + `message`) or just a code.
 */
export function humanizeApiError(
  error: { code?: string; message?: string } | string | undefined | null,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!error) return fallback;
  const code = typeof error === "string" ? error : error.code;
  const message = typeof error === "string" ? undefined : error.message;
  if (code && CODE_TO_MESSAGE[code]) return CODE_TO_MESSAGE[code];
  return message ?? fallback;
}
