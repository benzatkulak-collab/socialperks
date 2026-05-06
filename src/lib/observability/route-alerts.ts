/**
 * Per-route alert definitions for the five highest-stakes endpoints.
 *
 * Stakes ranked by blast radius — what happens if this route is broken
 * for 5 minutes:
 *   1. /api/v1/billing/webhook   — Stripe events drop on the floor →
 *      revenue lost, subscription state out of sync.
 *   2. /api/v1/auth              — login broken → every user locked out.
 *   3. /api/v1/campaigns POST    — businesses can't create campaigns,
 *      activation funnel dies.
 *   4. /api/v1/submissions POST  — proof can't be filed → influencer
 *      / customer side breaks (and revenue downstream).
 *   5. /api/v1/api-keys POST     — agent integrations can't bootstrap.
 *
 * Each route gets a "any error" alert (status >= 500 captured by the
 * timing wrapper) plus a rate-of-error-vs-traffic alert that fires when
 * the error fraction exceeds a threshold. Both are gated on a minimum
 * traffic floor so a quiet route with one error doesn't page.
 */

import { alertEngine, type AlertDefinition } from "@/lib/reliability/alerts";
import { metrics, METRIC } from "@/lib/reliability/metrics";

// ─── High-stakes route registry ─────────────────────────────────────────────

export interface HighStakesRoute {
  /** Path as it appears on the request (no method). */
  path: string;
  /** Methods to monitor — most are POST-only. */
  methods: string[];
  /** Human-readable label for the alert. */
  label: string;
  /** What's at risk if this route fails. */
  blastRadius: string;
  /** Where to look first when this fires. */
  runbook: string;
  /** Severity for the alerts on this route. */
  severity: "critical" | "high";
  /** Min request count in the metric window before the rate alert can fire. */
  minTraffic: number;
  /** Error fraction threshold (0-1). */
  errorRateThreshold: number;
}

export const HIGH_STAKES_ROUTES: HighStakesRoute[] = [
  {
    path: "/api/v1/billing/webhook",
    methods: ["POST"],
    label: "Stripe webhook handler",
    blastRadius:
      "Subscription events drop. Customers stay on stale plans. Revenue stops flowing into the ledger.",
    runbook:
      "Check Stripe dashboard for webhook delivery failures. Inspect recent X-Capture-Id values. Verify STRIPE_WEBHOOK_SECRET hasn't rotated.",
    severity: "critical",
    minTraffic: 1, // any error is bad
    errorRateThreshold: 0.01,
  },
  {
    path: "/api/v1/auth",
    methods: ["POST"],
    label: "Authentication",
    blastRadius:
      "Every business and influencer is locked out. New signups fail. Existing tokens stop refreshing.",
    runbook:
      "Confirm AUTH_SECRET set in env. Check session-store hydration logs. Verify Postgres reachable.",
    severity: "critical",
    minTraffic: 5,
    errorRateThreshold: 0.05,
  },
  {
    path: "/api/v1/campaigns",
    methods: ["POST"],
    label: "Campaign create",
    blastRadius:
      "Businesses can't launch campaigns. Activation funnel halts.",
    runbook:
      "Check campaign-state-machine event store. Verify business ownership checks aren't false-positive.",
    severity: "high",
    minTraffic: 3,
    errorRateThreshold: 0.10,
  },
  {
    path: "/api/v1/submissions",
    methods: ["POST"],
    label: "Submission create",
    blastRadius:
      "Customers / influencers can't submit proof. Perks aren't earned. Submission engine downstream breaks.",
    runbook:
      "Check fraud-detection pipeline. Verify proof URL checker. Inspect platform/action validators.",
    severity: "high",
    minTraffic: 5,
    errorRateThreshold: 0.10,
  },
  {
    path: "/api/v1/api-keys",
    methods: ["POST"],
    label: "API key minting",
    blastRadius:
      "Agent / partner integrations can't bootstrap or rotate keys.",
    runbook:
      "Check audit log for the failing business. Verify scrypt-based hashing path and DB connectivity.",
    severity: "high",
    minTraffic: 1,
    errorRateThreshold: 0.05,
  },
];

// ─── Alert builders ─────────────────────────────────────────────────────────

/**
 * Sum the captured-error counter restricted to a route. The metrics
 * collector keeps point labels on each window entry so we can filter
 * by `route` after the fact.
 */
function captureCountInWindow(route: string): number {
  const captureCounter = metrics.getCounterPoints("system.api.error.captured");
  return captureCounter
    .filter((p) => p.labels?.route === route)
    .reduce((sum, p) => sum + p.value, 0);
}

function requestCountInWindow(route: string): number {
  const points = metrics.getCounterPoints(METRIC.API_REQUEST);
  return points
    .filter((p) => p.labels?.path === route)
    .reduce((sum, p) => sum + p.value, 0);
}

function errorCountInWindow(route: string): number {
  const points = metrics.getCounterPoints(METRIC.API_ERROR);
  return points
    .filter((p) => p.labels?.path === route)
    .reduce((sum, p) => sum + p.value, 0);
}

function buildAlertsForRoute(route: HighStakesRoute): AlertDefinition[] {
  // Slug usable as part of an alert id.
  const slug = route.path.replace(/^\/api\/v1\//, "").replace(/[^a-z0-9]+/gi, "_");

  return [
    {
      id: `route_capture_${slug}`,
      name: `${route.label} — captured error`,
      severity: route.severity,
      description: `Any 5xx or unhandled exception on ${route.path}. Blast radius: ${route.blastRadius}`,
      evaluate: () => {
        const captures = captureCountInWindow(route.path);
        if (captures >= 1) {
          return `${captures} captured error(s) in the last 5 minutes`;
        }
        return null;
      },
      suggestedAction: route.runbook,
    },
    {
      id: `route_error_rate_${slug}`,
      name: `${route.label} — error rate above ${(route.errorRateThreshold * 100).toFixed(0)}%`,
      severity: route.severity,
      description: `4xx+5xx fraction of traffic on ${route.path} exceeds ${(route.errorRateThreshold * 100).toFixed(0)}% over the last 5 minutes.`,
      evaluate: () => {
        const total = requestCountInWindow(route.path);
        if (total < route.minTraffic) return null;
        const errors = errorCountInWindow(route.path);
        const rate = errors / total;
        if (rate > route.errorRateThreshold) {
          return `${errors}/${total} requests failed (${(rate * 100).toFixed(1)}%)`;
        }
        return null;
      },
      suggestedAction: route.runbook,
    },
  ];
}

let _registered = false;

/**
 * Register the per-route alerts with the alertEngine. Idempotent — a
 * second call is a no-op so module re-imports during dev hot-reload
 * don't duplicate alerts.
 */
export function registerHighStakesAlerts(): void {
  if (_registered) return;
  _registered = true;
  for (const route of HIGH_STAKES_ROUTES) {
    for (const alert of buildAlertsForRoute(route)) {
      alertEngine.register(alert);
    }
  }
}

// Eager registration when the module loads — observability is not
// useful if you have to remember to opt in.
registerHighStakesAlerts();

export const _testHelpers = {
  buildAlertsForRoute,
  reset() {
    _registered = false;
  },
};
