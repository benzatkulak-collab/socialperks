/**
 * Reliability Metrics Collector
 * =============================
 *
 * In-memory metrics with sliding windows for business and system health.
 * Designed to be queried by the alerting engine and admin dashboard.
 *
 * Categories:
 *   - Business: bookings, payments, jobs, revenue
 *   - System: latency, errors, retries, queue depth
 *   - Cross-system: sync mismatches, orphaned records
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface MetricPoint {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface Counter {
  total: number;
  windowPoints: MetricPoint[];
}

export interface Histogram {
  count: number;
  sum: number;
  min: number;
  max: number;
  windowPoints: MetricPoint[];
}

export interface MetricSnapshot {
  counters: Record<string, { total: number; windowRate: number }>;
  histograms: Record<string, { count: number; avg: number; p50: number; p95: number; p99: number; min: number; max: number }>;
  gauges: Record<string, number>;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_WINDOW_MS = 5 * 60 * 1000; // 5-minute sliding window
const MAX_WINDOW_POINTS = 10_000;

// ── Metrics Collector ──────────────────────────────────────────────────────

class MetricsCollector {
  private counters = new Map<string, Counter>();
  private histograms = new Map<string, Histogram>();
  private gauges = new Map<string, number>();
  private windowMs: number;

  constructor(windowMs = DEFAULT_WINDOW_MS) {
    this.windowMs = windowMs;
  }

  // ── Counter Operations ─────────────────────────────────────────────────

  increment(name: string, value = 1, labels?: Record<string, string>): void {
    let counter = this.counters.get(name);
    if (!counter) {
      counter = { total: 0, windowPoints: [] };
      this.counters.set(name, counter);
    }
    counter.total += value;
    counter.windowPoints.push({ value, timestamp: Date.now(), labels });
    this.prunePoints(counter.windowPoints);
  }

  getCounter(name: string): { total: number; windowRate: number } {
    const counter = this.counters.get(name);
    if (!counter) return { total: 0, windowRate: 0 };
    this.prunePoints(counter.windowPoints);
    const windowSum = counter.windowPoints.reduce((s, p) => s + p.value, 0);
    const windowSeconds = this.windowMs / 1000;
    return { total: counter.total, windowRate: windowSum / windowSeconds };
  }

  // ── Histogram Operations (for latency, durations) ──────────────────────

  observe(name: string, value: number, labels?: Record<string, string>): void {
    let hist = this.histograms.get(name);
    if (!hist) {
      hist = { count: 0, sum: 0, min: Infinity, max: -Infinity, windowPoints: [] };
      this.histograms.set(name, hist);
    }
    hist.count++;
    hist.sum += value;
    hist.min = Math.min(hist.min, value);
    hist.max = Math.max(hist.max, value);
    hist.windowPoints.push({ value, timestamp: Date.now(), labels });
    this.prunePoints(hist.windowPoints);
  }

  getHistogram(name: string): { count: number; avg: number; p50: number; p95: number; p99: number; min: number; max: number } {
    const hist = this.histograms.get(name);
    if (!hist || hist.count === 0) {
      return { count: 0, avg: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0 };
    }
    this.prunePoints(hist.windowPoints);
    const values = hist.windowPoints.map((p) => p.value).sort((a, b) => a - b);
    if (values.length === 0) {
      return { count: hist.count, avg: hist.sum / hist.count, p50: 0, p95: 0, p99: 0, min: hist.min, max: hist.max };
    }
    return {
      count: hist.count,
      avg: hist.sum / hist.count,
      p50: percentile(values, 50),
      p95: percentile(values, 95),
      p99: percentile(values, 99),
      min: hist.min,
      max: hist.max,
    };
  }

  // ── Gauge Operations (for current values) ──────────────────────────────

  setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  getGauge(name: string): number {
    return this.gauges.get(name) ?? 0;
  }

  // ── Snapshot ────────────────────────────────────────────────────────────

  snapshot(): MetricSnapshot {
    const counters: MetricSnapshot["counters"] = {};
    for (const [name] of this.counters) {
      counters[name] = this.getCounter(name);
    }

    const histograms: MetricSnapshot["histograms"] = {};
    for (const [name] of this.histograms) {
      histograms[name] = this.getHistogram(name);
    }

    const gauges: Record<string, number> = {};
    for (const [name, value] of this.gauges) {
      gauges[name] = value;
    }

    return { counters, histograms, gauges };
  }

  // ── Reset (for testing) ────────────────────────────────────────────────

  reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private prunePoints(points: MetricPoint[]): void {
    const cutoff = Date.now() - this.windowMs;
    while (points.length > 0 && points[0].timestamp < cutoff) {
      points.shift();
    }
    // Hard cap to prevent unbounded growth
    if (points.length > MAX_WINDOW_POINTS) {
      points.splice(0, points.length - MAX_WINDOW_POINTS);
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ── Singleton ──────────────────────────────────────────────────────────────

export const metrics = new MetricsCollector();

// ── Convenience: pre-defined metric names ──────────────────────────────────

export const METRIC = {
  // Business metrics
  BOOKING_CREATED: "business.booking.created",
  BOOKING_COMPLETED: "business.booking.completed",
  PAYMENT_SUCCESS: "business.payment.success",
  PAYMENT_FAILED: "business.payment.failed",
  JOB_CREATED: "business.job.created",
  JOB_COMPLETED: "business.job.completed",
  SUBMISSION_CREATED: "business.submission.created",
  SUBMISSION_REVIEWED: "business.submission.reviewed",
  CAMPAIGN_CREATED: "business.campaign.created",

  // System metrics
  API_REQUEST: "system.api.request",
  API_ERROR: "system.api.error",
  API_LATENCY: "system.api.latency",
  AUTH_SUCCESS: "system.auth.success",
  AUTH_FAILURE: "system.auth.failure",
  RATE_LIMIT_HIT: "system.rate_limit.hit",
  QUEUE_RETRY: "system.queue.retry",
  CIRCUIT_OPEN: "system.circuit.open",

  // Cross-system
  SYNC_MISMATCH: "cross.sync.mismatch",
  ORPHAN_DETECTED: "cross.orphan.detected",
  RECONCILIATION_RUN: "cross.reconciliation.run",
  RECONCILIATION_FIX: "cross.reconciliation.fix",
} as const;
