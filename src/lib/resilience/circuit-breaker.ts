/**
 * Circuit Breaker Pattern for External Service Calls
 * ====================================================
 *
 * State machine:
 *   Closed (normal) -> Open (after failureThreshold consecutive failures)
 *   Open (broken)   -> Half-Open (after timeout expires)
 *   Half-Open       -> Closed (after successThreshold successes)
 *   Half-Open       -> Open (on any failure)
 *
 * When the circuit is open, requests fail immediately (or use a fallback).
 * This prevents cascading failures and gives external services time to recover.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerOptions {
  /** Human-readable name (e.g. "stripe", "email", "verification") */
  name: string;
  /** Consecutive failures before opening the circuit (default 5) */
  failureThreshold?: number;
  /** Successes in half_open before closing the circuit (default 2) */
  successThreshold?: number;
  /** Ms to wait before transitioning open -> half_open (default 30000) */
  timeout?: number;
  /** Optional fallback when circuit is open */
  fallback?: () => unknown;
  /** Callback when circuit state changes */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: string | null;
  lastSuccess: string | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  stateChanges: { from: CircuitState; to: CircuitState; at: string }[];
}

export class CircuitBreakerError extends Error {
  constructor(
    public readonly circuitName: string,
    message?: string
  ) {
    super(message ?? `Circuit breaker "${circuitName}" is open`);
    this.name = "CircuitBreakerError";
  }
}

// ── Circuit Breaker ────────────────────────────────────────────────────────

export class CircuitBreaker {
  readonly name: string;

  private state: CircuitState = "closed";
  private failureThreshold: number;
  private successThreshold: number;
  private timeout: number;
  private fallback?: () => unknown;
  private onStateChange?: (from: CircuitState, to: CircuitState) => void;

  // Counters for current window
  private consecutiveFailures = 0;
  private halfOpenSuccesses = 0;

  // Timestamps
  private lastFailureAt: Date | null = null;
  private lastSuccessAt: Date | null = null;
  private openedAt: Date | null = null;

  // Lifetime stats
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private stateChangeLog: { from: CircuitState; to: CircuitState; at: string }[] = [];

  // Half-open concurrency: only allow limited requests through
  private halfOpenInFlight = 0;
  private static readonly HALF_OPEN_MAX_CONCURRENT = 1;

  // For testability: injectable clock
  private now: () => number;

  constructor(options: CircuitBreakerOptions, clock?: () => number) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.timeout = options.timeout ?? 30_000;
    this.fallback = options.fallback;
    this.onStateChange = options.onStateChange;
    this.now = clock ?? (() => Date.now());
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Execute a function through the circuit breaker.
   * In closed state: pass through normally.
   * In open state: reject immediately (use fallback if available).
   * In half_open state: allow limited requests to test recovery.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if open circuit should transition to half_open
    if (this.state === "open") {
      this.maybeTransitionToHalfOpen();
    }

    switch (this.state) {
      case "closed":
        return this.executeInClosed(fn);

      case "open":
        return this.handleOpen<T>();

      case "half_open":
        return this.executeInHalfOpen(fn);
    }
  }

  /** Get the current circuit state */
  getState(): CircuitState {
    // Check for time-based transition before returning state
    if (this.state === "open") {
      this.maybeTransitionToHalfOpen();
    }
    return this.state;
  }

  /** Get comprehensive stats */
  getStats(): CircuitStats {
    // Check for time-based transition before returning stats
    if (this.state === "open") {
      this.maybeTransitionToHalfOpen();
    }
    return {
      state: this.state,
      failures: this.consecutiveFailures,
      successes: this.halfOpenSuccesses,
      lastFailure: this.lastFailureAt?.toISOString() ?? null,
      lastSuccess: this.lastSuccessAt?.toISOString() ?? null,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      stateChanges: [...this.stateChangeLog],
    };
  }

  /** Force reset to closed state */
  reset(): void {
    const prev = this.state;
    this.state = "closed";
    this.consecutiveFailures = 0;
    this.halfOpenSuccesses = 0;
    this.halfOpenInFlight = 0;
    this.openedAt = null;
    if (prev !== "closed") {
      this.recordStateChange(prev, "closed");
    }
  }

  // ── State Execution ────────────────────────────────────────────────────

  private async executeInClosed<T>(fn: () => Promise<T>): Promise<T> {
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private handleOpen<T>(): T | Promise<T> {
    if (this.fallback) {
      return this.fallback() as T;
    }
    throw new CircuitBreakerError(this.name);
  }

  private async executeInHalfOpen<T>(fn: () => Promise<T>): Promise<T> {
    // Limit concurrent requests in half_open to avoid overwhelming the service
    if (this.halfOpenInFlight >= CircuitBreaker.HALF_OPEN_MAX_CONCURRENT) {
      // Extra requests while a probe is in-flight get rejected/fallback
      if (this.fallback) {
        return this.fallback() as T;
      }
      throw new CircuitBreakerError(
        this.name,
        `Circuit breaker "${this.name}" is half-open — probe in progress`
      );
    }

    this.halfOpenInFlight++;
    try {
      const result = await fn();
      this.halfOpenInFlight--;
      this.onHalfOpenSuccess();
      return result;
    } catch (error) {
      this.halfOpenInFlight--;
      this.onHalfOpenFailure();
      throw error;
    }
  }

  // ── State Transitions ──────────────────────────────────────────────────

  private onSuccess(): void {
    this.totalSuccesses++;
    this.lastSuccessAt = new Date(this.now());
    // Success in closed state resets the failure counter
    this.consecutiveFailures = 0;
  }

  private onFailure(): void {
    this.totalFailures++;
    this.consecutiveFailures++;
    this.lastFailureAt = new Date(this.now());

    if (this.consecutiveFailures >= this.failureThreshold) {
      this.transitionTo("open");
      this.openedAt = new Date(this.now());
    }
  }

  private onHalfOpenSuccess(): void {
    this.totalSuccesses++;
    this.lastSuccessAt = new Date(this.now());
    this.halfOpenSuccesses++;

    if (this.halfOpenSuccesses >= this.successThreshold) {
      this.transitionTo("closed");
      this.consecutiveFailures = 0;
      this.halfOpenSuccesses = 0;
      this.openedAt = null;
    }
  }

  private onHalfOpenFailure(): void {
    this.totalFailures++;
    this.lastFailureAt = new Date(this.now());
    this.halfOpenSuccesses = 0;
    this.transitionTo("open");
    this.openedAt = new Date(this.now());
  }

  private maybeTransitionToHalfOpen(): void {
    if (this.state !== "open" || !this.openedAt) return;

    const elapsed = this.now() - this.openedAt.getTime();
    if (elapsed >= this.timeout) {
      this.transitionTo("half_open");
      this.halfOpenSuccesses = 0;
      this.halfOpenInFlight = 0;
    }
  }

  private transitionTo(newState: CircuitState): void {
    const prev = this.state;
    if (prev === newState) return;
    this.state = newState;
    this.recordStateChange(prev, newState);
  }

  private recordStateChange(from: CircuitState, to: CircuitState): void {
    const entry = { from, to, at: new Date(this.now()).toISOString() };
    this.stateChangeLog.push(entry);
    // Keep log bounded
    if (this.stateChangeLog.length > 100) {
      this.stateChangeLog = this.stateChangeLog.slice(-50);
    }
    this.onStateChange?.(from, to);
    console.warn(`[circuit-breaker:${this.name}] ${from} -> ${to}`);
  }
}
