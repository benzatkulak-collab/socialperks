/**
 * Shared token for server-to-server calls inside the app, e.g. the
 * onboarding-drip cron POSTing to /api/v1/drip.
 *
 * Both sides must resolve the key the same way. They didn't: the cron fell
 * back to CRON_SECRET while /drip only accepted DRIP_API_KEY or
 * INTERNAL_API_KEY, so with neither set (production) every run got a 401.
 *
 * Precedence: DRIP_API_KEY, then INTERNAL_API_KEY, then CRON_SECRET, so a
 * deploy that only sets CRON_SECRET works. Read on every call so a rotated
 * env var (or a test) takes effect without reloading the module.
 */

import { constantTimeEqual } from "./order-by";

export function getInternalApiKey(): string | undefined {
  return (
    process.env.DRIP_API_KEY ||
    process.env.INTERNAL_API_KEY ||
    process.env.CRON_SECRET ||
    undefined
  );
}

/** True when `candidate` matches the internal key. False when no key is configured. */
export function isInternalApiKey(candidate: string | null | undefined): boolean {
  const key = getInternalApiKey();
  if (!key || !candidate) return false;
  return constantTimeEqual(candidate, key);
}
