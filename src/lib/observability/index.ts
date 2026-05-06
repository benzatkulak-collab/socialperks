/**
 * Observability Barrel
 * ====================
 *
 * Importing this module registers the high-stakes route alerts and
 * exposes the error-tracker API. Routes that want to opt-in beyond
 * the default `withTiming` capture path can import `captureException`
 * from here.
 *
 * Architecture:
 *   captureException ──┬─→ ring buffer (admin endpoint reads this)
 *                      ├─→ metrics counter (alert engine reads this)
 *                      ├─→ structured log (stdout)
 *                      ├─→ Sentry Store API (if SENTRY_DSN set)
 *                      └─→ generic webhook (if ERROR_WEBHOOK_URL set)
 */

export {
  captureException,
  listRecentCaptures,
  getCaptureCount,
  getRouteErrorCount,
  _resetErrorTracker,
} from "./error-tracker";
export type { CapturedError, ErrorContext } from "./error-tracker";

export {
  HIGH_STAKES_ROUTES,
  registerHighStakesAlerts,
} from "./route-alerts";
export type { HighStakesRoute } from "./route-alerts";
