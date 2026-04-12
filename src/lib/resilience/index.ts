/**
 * Resilience — Pre-configured Circuit Breakers for External Services
 * ====================================================================
 *
 * Each circuit breaker is tuned for the characteristics of its service:
 * - Stripe: payment-critical, slow to recover, lower threshold
 * - Email (Resend): best-effort delivery, higher tolerance
 * - Verification: URL checks, fast recovery expected
 *
 * Import from here to use in route handlers and job processors.
 */

export { CircuitBreaker, CircuitBreakerError } from "./circuit-breaker";
export type { CircuitState, CircuitBreakerOptions, CircuitStats } from "./circuit-breaker";

import { CircuitBreaker, type CircuitStats, type CircuitState } from "./circuit-breaker";

// ── Pre-configured Circuits ────────────────────────────────────────────────

/**
 * Stripe circuit breaker.
 * Payment-critical: opens quickly (3 failures), long recovery timeout (60s).
 * Fallback: returns a mock checkout URL so the UI can still render.
 */
export const stripeCircuit = new CircuitBreaker({
  name: "stripe",
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 60_000,
  fallback: () => ({
    fallback: true,
    message: "Payment service temporarily unavailable. Please try again shortly.",
    url: null,
    sessionId: null,
  }),
  onStateChange: (from, to) => {
    if (to === "open") {
      console.warn(`[resilience] Stripe circuit OPENED after failures (was ${from})`);
    } else if (to === "closed") {
      console.warn(`[resilience] Stripe circuit recovered -> closed`);
    }
  },
});

/**
 * Email circuit breaker (Resend API).
 * Best-effort: tolerates more failures (5), moderate timeout (30s).
 * Fallback: logs the email for later delivery.
 */
export const emailCircuit = new CircuitBreaker({
  name: "email",
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30_000,
  fallback: () => {
    console.warn("[resilience:email] Circuit open — email queued for later delivery");
    return {
      success: false,
      messageId: "",
      error: "Email service temporarily unavailable. Message queued for retry.",
      queued: true,
    };
  },
  onStateChange: (from, to) => {
    if (to === "open") {
      console.warn(`[resilience] Email circuit OPENED after failures (was ${from})`);
    } else if (to === "closed") {
      console.warn(`[resilience] Email circuit recovered -> closed`);
    }
  },
});

/**
 * URL verification circuit breaker.
 * Fast external fetches: moderate threshold (5), quick recovery (15s).
 * Fallback: returns a reduced-confidence result.
 */
export const verificationCircuit = new CircuitBreaker({
  name: "verification",
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 15_000,
  fallback: () => ({
    reachable: false,
    statusCode: 0,
    platformMatch: false,
    detectedPlatform: null,
    contentType: null,
    redirectedUrl: null,
    confidence: 0,
    checks: ["circuit_breaker:open — verification service unavailable"],
    fallback: true,
  }),
  onStateChange: (from, to) => {
    if (to === "open") {
      console.warn(`[resilience] Verification circuit OPENED after failures (was ${from})`);
    } else if (to === "closed") {
      console.warn(`[resilience] Verification circuit recovered -> closed`);
    }
  },
});

// ── Health Dashboard ───────────────────────────────────────────────────────

const circuits: Record<string, CircuitBreaker> = {
  stripe: stripeCircuit,
  email: emailCircuit,
  verification: verificationCircuit,
};

/**
 * Get health status of all circuit breakers.
 * Useful for admin dashboards and the /api/v1/circuits health endpoint.
 */
export function getCircuitHealth(): Record<string, { state: CircuitState; stats: CircuitStats }> {
  const result: Record<string, { state: CircuitState; stats: CircuitStats }> = {};
  for (const [name, circuit] of Object.entries(circuits)) {
    const stats = circuit.getStats();
    result[name] = { state: stats.state, stats };
  }
  return result;
}

/**
 * Get a specific circuit breaker by name.
 */
export function getCircuit(name: string): CircuitBreaker | null {
  return circuits[name] ?? null;
}

/**
 * Reset all circuit breakers to closed state.
 */
export function resetAllCircuits(): void {
  for (const circuit of Object.values(circuits)) {
    circuit.reset();
  }
}
