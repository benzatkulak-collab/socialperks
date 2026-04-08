// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Distributed Tracing & Observability
//
// OpenTelemetry-compatible tracing, Prometheus-style metrics, SLO/SLI
// monitoring, and anomaly detection. In-memory stores now, ready for
// Jaeger / Prometheus / Datadog migration.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Trace Types ──────────────────────────────────────────────────────────────

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes: Record<string, string | number | boolean>;
}

export interface SpanLink {
  traceId: string;
  spanId: string;
  attributes: Record<string, string | number | boolean>;
}

export type SpanStatus = "ok" | "error" | "unset";

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime: number | null;
  duration: number | null;
  status: SpanStatus;
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
  links: SpanLink[];
}

export interface StartSpanOptions {
  traceId?: string;
  parentSpanId?: string | null;
  serviceName?: string;
  attributes?: Record<string, string | number | boolean>;
  links?: SpanLink[];
}

export interface TraceView {
  traceId: string;
  rootSpan: Span | null;
  spans: Span[];
  duration: number | null;
  services: string[];
  spanCount: number;
}

// ─── Metric Types ─────────────────────────────────────────────────────────────

export type MetricType = "counter" | "gauge" | "histogram" | "summary";

export interface MetricDefinition {
  name: string;
  type: MetricType;
  description: string;
  unit: string;
  labels: string[];
}

export interface MetricSample {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

interface HistogramBuckets {
  boundaries: number[];
  counts: number[];
  sum: number;
  count: number;
}

interface MetricStorage {
  definition: MetricDefinition;
  samples: Map<string, MetricSample[]>;
  histogramBuckets?: Map<string, HistogramBuckets>;
}

// ─── SLO/SLI Types ────────────────────────────────────────────────────────────

export interface SLI {
  type: "availability" | "latency" | "error_rate" | "throughput";
  goodMetric: string;
  totalMetric: string;
  threshold?: number;
}

export interface SLO {
  name: string;
  target: number;
  window: number;
  indicator: SLI;
}

export interface SLOEvent {
  sloName: string;
  good: boolean;
  timestamp: number;
  value?: number;
}

export interface SLOStatus {
  name: string;
  target: number;
  current: number;
  totalEvents: number;
  goodEvents: number;
  badEvents: number;
  errorBudgetTotal: number;
  errorBudgetRemaining: number;
  errorBudgetConsumedPct: number;
  burnRate: number;
  isCompliant: boolean;
  windowStart: number;
  windowEnd: number;
}

export interface SLOReport {
  generatedAt: string;
  slos: SLOStatus[];
  overallCompliance: number;
  alerting: SLOAlert[];
}

export interface SLOAlert {
  sloName: string;
  severity: "warning" | "critical";
  message: string;
  burnRate: number;
  timestamp: number;
}

// ─── Anomaly Types ────────────────────────────────────────────────────────────

export interface AnomalyConfig {
  alpha: number;
  sigmaThreshold: number;
}

export interface AnomalyResult {
  metricName: string;
  value: number;
  mean: number;
  stddev: number;
  deviations: number;
  isAnomaly: boolean;
  timestamp: number;
  direction: "above" | "below";
}

interface EWMAState {
  mean: number;
  variance: number;
  count: number;
  alpha: number;
  sigmaThreshold: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateHexId(length: number): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, length);
}

function labelsToKey(labels: Record<string, string>): string {
  const sorted = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  return sorted.map(([k, v]) => `${k}="${v}"`).join(",");
}

// ══════════════════════════════════════════════════════════════════════════════
// Tracer — OpenTelemetry-compatible Distributed Tracing
// ══════════════════════════════════════════════════════════════════════════════

export class Tracer {
  private spans: Map<string, Span> = new Map();
  private traceIndex: Map<string, Set<string>> = new Map();
  private readonly defaultServiceName: string;
  private readonly maxSpans: number;

  constructor(serviceName: string = "social-perks", maxSpans: number = 10000) {
    this.defaultServiceName = serviceName;
    this.maxSpans = maxSpans;
  }

  /** Create a new span. Auto-generates trace/span IDs and links to parent. */
  startSpan(name: string, options?: StartSpanOptions): Span {
    const traceId = options?.traceId ?? generateHexId(32);
    const spanId = generateHexId(16);
    const parentSpanId = options?.parentSpanId ?? null;
    const serviceName = options?.serviceName ?? this.defaultServiceName;

    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      operationName: name,
      serviceName,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      status: "unset",
      attributes: options?.attributes ? { ...options.attributes } : {},
      events: [],
      links: options?.links ? [...options.links] : [],
    };

    this.spans.set(spanId, span);

    // Index by trace ID
    if (!this.traceIndex.has(traceId)) {
      this.traceIndex.set(traceId, new Set());
    }
    this.traceIndex.get(traceId)!.add(spanId);

    // Evict old spans if over limit
    this.evictIfNeeded();

    return span;
  }

  /** Close a span and compute its duration. */
  endSpan(spanId: string): Span | null {
    const span = this.spans.get(spanId);
    if (!span) return null;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;

    if (span.status === "unset") {
      span.status = "ok";
    }

    return span;
  }

  /** Add a timestamped event to a span. */
  addEvent(
    spanId: string,
    name: string,
    attrs?: Record<string, string | number | boolean>
  ): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.events.push({
      name,
      timestamp: Date.now(),
      attributes: attrs ? { ...attrs } : {},
    });
  }

  /** Set the status of a span. */
  setStatus(spanId: string, status: SpanStatus): void {
    const span = this.spans.get(spanId);
    if (!span) return;
    span.status = status;
  }

  /** Add attributes to a span. */
  setAttributes(
    spanId: string,
    attrs: Record<string, string | number | boolean>
  ): void {
    const span = this.spans.get(spanId);
    if (!span) return;
    Object.assign(span.attributes, attrs);
  }

  /** Get a full trace view with all its spans. */
  getTrace(traceId: string): TraceView | null {
    const spanIds = this.traceIndex.get(traceId);
    if (!spanIds || spanIds.size === 0) return null;

    const spans: Span[] = [];
    const services = new Set<string>();

    for (const id of Array.from(spanIds)) {
      const span = this.spans.get(id);
      if (span) {
        spans.push(span);
        services.add(span.serviceName);
      }
    }

    const rootSpan = spans.find((s) => s.parentSpanId === null) ?? null;

    // Sort by start time
    spans.sort((a, b) => a.startTime - b.startTime);

    // Calculate total trace duration
    let duration: number | null = null;
    if (rootSpan?.endTime) {
      duration = rootSpan.endTime - rootSpan.startTime;
    } else if (spans.length > 0) {
      const earliest = spans[0].startTime;
      const latestEnd = Math.max(
        ...spans.filter((s) => s.endTime !== null).map((s) => s.endTime!)
      );
      if (latestEnd > 0) {
        duration = latestEnd - earliest;
      }
    }

    return {
      traceId,
      rootSpan,
      spans,
      duration,
      services: Array.from(services),
      spanCount: spans.length,
    };
  }

  /** Get a span by its ID. */
  getSpan(spanId: string): Span | null {
    return this.spans.get(spanId) ?? null;
  }

  /** Get all active (unfinished) spans. */
  getActiveSpans(): Span[] {
    const active: Span[] = [];
    Array.from(this.spans.values()).forEach((span) => {
      if (span.endTime === null) {
        active.push(span);
      }
    });
    return active;
  }

  /** Get total span count. */
  get spanCount(): number {
    return this.spans.size;
  }

  /** Create a child span inheriting the parent's trace context. */
  startChildSpan(parentSpanId: string, name: string, options?: Omit<StartSpanOptions, "traceId" | "parentSpanId">): Span | null {
    const parent = this.spans.get(parentSpanId);
    if (!parent) return null;

    return this.startSpan(name, {
      ...options,
      traceId: parent.traceId,
      parentSpanId: parent.spanId,
      serviceName: options?.serviceName ?? parent.serviceName,
    });
  }

  /** Evict oldest completed traces when span limit is exceeded. */
  private evictIfNeeded(): void {
    if (this.spans.size <= this.maxSpans) return;

    // Collect completed traces sorted by oldest first
    const completedTraces: { traceId: string; maxEnd: number }[] = [];
    Array.from(this.traceIndex.entries()).forEach(([traceId, spanIds]) => {
      let allCompleted = true;
      let maxEnd = 0;
      const ids = Array.from(spanIds);
      for (let i = 0; i < ids.length; i++) {
        const span = this.spans.get(ids[i]);
        if (span) {
          if (span.endTime === null) {
            allCompleted = false;
            break;
          }
          maxEnd = Math.max(maxEnd, span.endTime);
        }
      }
      if (allCompleted && spanIds.size > 0) {
        completedTraces.push({ traceId, maxEnd });
      }
    });

    completedTraces.sort((a, b) => a.maxEnd - b.maxEnd);

    // Remove oldest traces until under limit
    for (let t = 0; t < completedTraces.length; t++) {
      if (this.spans.size <= this.maxSpans * 0.8) break;
      const traceId = completedTraces[t].traceId;
      const spanIds = this.traceIndex.get(traceId);
      if (spanIds) {
        Array.from(spanIds).forEach((id) => {
          this.spans.delete(id);
        });
        this.traceIndex.delete(traceId);
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MetricsCollector — Prometheus-Compatible Metrics
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_HISTOGRAM_BUCKETS = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];

export class MetricsCollector {
  private metrics: Map<string, MetricStorage> = new Map();
  private readonly defaultBuckets: number[];

  constructor(buckets?: number[]) {
    this.defaultBuckets = buckets ?? DEFAULT_HISTOGRAM_BUCKETS;
    this.registerBuiltInMetrics();
  }

  /** Register built-in metrics for the Social Perks platform. */
  private registerBuiltInMetrics(): void {
    this.register({
      name: "http_requests_total",
      type: "counter",
      description: "Total number of HTTP requests",
      unit: "requests",
      labels: ["method", "path", "status"],
    });
    this.register({
      name: "http_request_duration_seconds",
      type: "histogram",
      description: "HTTP request duration in seconds",
      unit: "seconds",
      labels: ["method", "path"],
    });
    this.register({
      name: "api_errors_total",
      type: "counter",
      description: "Total number of API errors",
      unit: "errors",
      labels: ["path", "error_type"],
    });
    this.register({
      name: "verification_duration_seconds",
      type: "histogram",
      description: "Duration of social media verification checks",
      unit: "seconds",
      labels: ["platform", "result"],
    });
    this.register({
      name: "fraud_score_histogram",
      type: "histogram",
      description: "Distribution of fraud detection scores",
      unit: "score",
      labels: ["action"],
    });
    this.register({
      name: "active_sse_connections",
      type: "gauge",
      description: "Number of active SSE connections",
      unit: "connections",
      labels: ["channel"],
    });
  }

  /** Register a new metric definition. */
  register(definition: MetricDefinition): void {
    if (this.metrics.has(definition.name)) return;

    const storage: MetricStorage = {
      definition,
      samples: new Map(),
    };

    if (definition.type === "histogram") {
      storage.histogramBuckets = new Map();
    }

    this.metrics.set(definition.name, storage);
  }

  /** Increment a counter by 1 (or by a specified amount). */
  counter(name: string, labels?: Record<string, string>, amount?: number): void {
    const storage = this.ensureMetric(name, "counter");
    const key = labelsToKey(labels ?? {});
    const existing = storage.samples.get(key);
    const increment = amount ?? 1;

    if (existing && existing.length > 0) {
      const last = existing[existing.length - 1];
      existing.push({
        name,
        value: last.value + increment,
        labels: labels ?? {},
        timestamp: Date.now(),
      });
    } else {
      storage.samples.set(key, [
        { name, value: increment, labels: labels ?? {}, timestamp: Date.now() },
      ]);
    }
  }

  /** Set a gauge to a specific value. */
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    const storage = this.ensureMetric(name, "gauge");
    const key = labelsToKey(labels ?? {});
    const samples = storage.samples.get(key) ?? [];
    samples.push({
      name,
      value,
      labels: labels ?? {},
      timestamp: Date.now(),
    });
    storage.samples.set(key, samples);
  }

  /** Record a histogram observation. */
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    const storage = this.ensureMetric(name, "histogram");
    const key = labelsToKey(labels ?? {});

    // Record the sample
    const samples = storage.samples.get(key) ?? [];
    samples.push({
      name,
      value,
      labels: labels ?? {},
      timestamp: Date.now(),
    });
    storage.samples.set(key, samples);

    // Update bucket counts
    if (!storage.histogramBuckets) {
      storage.histogramBuckets = new Map();
    }
    let buckets = storage.histogramBuckets.get(key);
    if (!buckets) {
      buckets = {
        boundaries: [...this.defaultBuckets],
        counts: new Array(this.defaultBuckets.length + 1).fill(0),
        sum: 0,
        count: 0,
      };
      storage.histogramBuckets.set(key, buckets);
    }

    buckets.sum += value;
    buckets.count += 1;

    // Increment the appropriate bucket
    let placed = false;
    for (let i = 0; i < buckets.boundaries.length; i++) {
      if (value <= buckets.boundaries[i]) {
        buckets.counts[i] += 1;
        placed = true;
        break;
      }
    }
    if (!placed) {
      // +Inf bucket
      buckets.counts[buckets.counts.length - 1] += 1;
    }
  }

  /** Start a timer that records duration when the returned function is called. */
  startTimer(
    name: string,
    labels?: Record<string, string>
  ): () => number {
    const start = Date.now();
    return () => {
      const durationSec = (Date.now() - start) / 1000;
      this.histogram(name, durationSec, labels);
      return durationSec;
    };
  }

  /** Get the current value of a specific metric. */
  getMetric(name: string): {
    definition: MetricDefinition;
    values: MetricSample[];
    histogramBuckets?: Map<string, HistogramBuckets>;
  } | null {
    const storage = this.metrics.get(name);
    if (!storage) return null;

    // Collect latest sample per label combination
    const values: MetricSample[] = [];
    Array.from(storage.samples.values()).forEach((samples) => {
      if (samples.length > 0) {
        values.push(samples[samples.length - 1]);
      }
    });

    return {
      definition: storage.definition,
      values,
      histogramBuckets: storage.histogramBuckets,
    };
  }

  /** Export all metrics in Prometheus exposition format. */
  getMetrics(): string {
    const lines: string[] = [];

    Array.from(this.metrics.entries()).forEach(([name, storage]) => {
      const def = storage.definition;
      lines.push(`# HELP ${name} ${def.description}`);
      lines.push(`# TYPE ${name} ${def.type}`);

      if (def.type === "histogram" && storage.histogramBuckets) {
        Array.from(storage.histogramBuckets.entries()).forEach(([key, buckets]) => {
          const labelStr = key ? `{${key}}` : "";
          let cumulative = 0;
          for (let i = 0; i < buckets.boundaries.length; i++) {
            cumulative += buckets.counts[i];
            const le = buckets.boundaries[i];
            const bucketLabels = key
              ? `{${key},le="${le}"}`
              : `{le="${le}"}`;
            lines.push(`${name}_bucket${bucketLabels} ${cumulative}`);
          }
          // +Inf bucket
          cumulative += buckets.counts[buckets.counts.length - 1];
          const infLabels = key
            ? `{${key},le="+Inf"}`
            : `{le="+Inf"}`;
          lines.push(`${name}_bucket${infLabels} ${cumulative}`);
          lines.push(`${name}_sum${labelStr} ${buckets.sum}`);
          lines.push(`${name}_count${labelStr} ${buckets.count}`);
        });
      } else {
        Array.from(storage.samples.entries()).forEach(([key, samples]) => {
          if (samples.length > 0) {
            const latest = samples[samples.length - 1];
            const labelStr = key ? `{${key}}` : "";
            lines.push(`${name}${labelStr} ${latest.value}`);
          }
        });
      }

      lines.push("");
    });

    return lines.join("\n");
  }

  /** Get all registered metric definitions. */
  getDefinitions(): MetricDefinition[] {
    return Array.from(this.metrics.values()).map((s) => s.definition);
  }

  /** Reset all metric values (useful for testing). */
  reset(): void {
    Array.from(this.metrics.values()).forEach((storage) => {
      storage.samples.clear();
      if (storage.histogramBuckets) {
        storage.histogramBuckets.clear();
      }
    });
  }

  /** Ensure a metric exists (auto-register if needed). */
  private ensureMetric(name: string, type: MetricType): MetricStorage {
    let storage = this.metrics.get(name);
    if (!storage) {
      this.register({
        name,
        type,
        description: `Auto-registered ${type}: ${name}`,
        unit: "",
        labels: [],
      });
      storage = this.metrics.get(name)!;
    }
    return storage;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SLOMonitor — Service Level Objective Monitoring
// ══════════════════════════════════════════════════════════════════════════════

export class SLOMonitor {
  private slos: Map<string, SLO> = new Map();
  private events: Map<string, SLOEvent[]> = new Map();
  private alerts: SLOAlert[] = [];
  private readonly burnRateAlertThreshold: number;

  constructor(burnRateAlertThreshold: number = 2.0) {
    this.burnRateAlertThreshold = burnRateAlertThreshold;
  }

  /** Register a new SLO. */
  defineSLO(slo: SLO): void {
    this.slos.set(slo.name, slo);
    if (!this.events.has(slo.name)) {
      this.events.set(slo.name, []);
    }
  }

  /** Record a good or bad event for an SLI. */
  recordEvent(sloName: string, good: boolean, value?: number): void {
    const slo = this.slos.get(sloName);
    if (!slo) return;

    const event: SLOEvent = {
      sloName,
      good,
      timestamp: Date.now(),
      value,
    };

    const eventList = this.events.get(sloName) ?? [];
    eventList.push(event);
    this.events.set(sloName, eventList);

    // Check burn rate after recording
    const status = this.getCurrentSLO(sloName);
    if (status && status.burnRate > this.burnRateAlertThreshold) {
      const severity: "warning" | "critical" =
        status.burnRate > this.burnRateAlertThreshold * 2
          ? "critical"
          : "warning";

      this.alerts.push({
        sloName,
        severity,
        message: `SLO "${sloName}" burn rate is ${status.burnRate.toFixed(2)}x — error budget will be exhausted ${severity === "critical" ? "imminently" : "ahead of schedule"}`,
        burnRate: status.burnRate,
        timestamp: Date.now(),
      });
    }
  }

  /** Get current SLO status for a given SLO. */
  getCurrentSLO(sloName: string): SLOStatus | null {
    const slo = this.slos.get(sloName);
    if (!slo) return null;

    const now = Date.now();
    const windowStart = now - slo.window * 1000;
    const windowEnd = now;

    // Filter events within the window
    const allEvents = this.events.get(sloName) ?? [];
    const windowEvents = allEvents.filter((e) => e.timestamp >= windowStart);

    const totalEvents = windowEvents.length;
    const goodEvents = windowEvents.filter((e) => e.good).length;
    const badEvents = totalEvents - goodEvents;

    const current = totalEvents > 0 ? (goodEvents / totalEvents) * 100 : 100;

    // Error budget calculation
    const errorBudgetTotal = 100 - slo.target; // e.g., 0.1 for 99.9% SLO
    const errorBudgetConsumed =
      totalEvents > 0 ? (badEvents / totalEvents) * 100 : 0;
    const errorBudgetRemaining = Math.max(
      0,
      errorBudgetTotal - errorBudgetConsumed
    );
    const errorBudgetConsumedPct =
      errorBudgetTotal > 0
        ? (errorBudgetConsumed / errorBudgetTotal) * 100
        : 0;

    // Burn rate: how fast the error budget is being consumed
    // burn rate = 1 means consuming at exactly the rate that uses all budget over the window
    // burn rate > 1 means consuming faster than sustainable
    const burnRate = this.calculateBurnRate(slo, windowEvents);

    return {
      name: slo.name,
      target: slo.target,
      current,
      totalEvents,
      goodEvents,
      badEvents,
      errorBudgetTotal,
      errorBudgetRemaining,
      errorBudgetConsumedPct: Math.min(errorBudgetConsumedPct, 100),
      burnRate,
      isCompliant: current >= slo.target,
      windowStart,
      windowEnd,
    };
  }

  /** Calculate how fast the error budget is being consumed. */
  getBurnRate(sloName: string): number {
    const slo = this.slos.get(sloName);
    if (!slo) return 0;

    const now = Date.now();
    const windowStart = now - slo.window * 1000;
    const allEvents = this.events.get(sloName) ?? [];
    const windowEvents = allEvents.filter((e) => e.timestamp >= windowStart);

    return this.calculateBurnRate(slo, windowEvents);
  }

  /** Generate a comprehensive SLO compliance report. */
  getReport(): SLOReport {
    const sloStatuses: SLOStatus[] = [];

    Array.from(this.slos.keys()).forEach((name) => {
      const status = this.getCurrentSLO(name);
      if (status) {
        sloStatuses.push(status);
      }
    });

    const compliantCount = sloStatuses.filter((s) => s.isCompliant).length;
    const overallCompliance =
      sloStatuses.length > 0
        ? (compliantCount / sloStatuses.length) * 100
        : 100;

    return {
      generatedAt: new Date().toISOString(),
      slos: sloStatuses,
      overallCompliance,
      alerting: [...this.alerts],
    };
  }

  /** Get recent alerts. */
  getAlerts(since?: number): SLOAlert[] {
    if (since) {
      return this.alerts.filter((a) => a.timestamp >= since);
    }
    return [...this.alerts];
  }

  /** Clear old events outside the window to save memory. */
  pruneEvents(): void {
    const now = Date.now();
    Array.from(this.slos.entries()).forEach(([sloName, slo]) => {
      const windowStart = now - slo.window * 1000;
      const events = this.events.get(sloName);
      if (events) {
        const pruned = events.filter((e) => e.timestamp >= windowStart);
        this.events.set(sloName, pruned);
      }
    });
  }

  /** Calculate burn rate for a set of events within a window. */
  private calculateBurnRate(slo: SLO, windowEvents: SLOEvent[]): number {
    const total = windowEvents.length;
    if (total === 0) return 0;

    const bad = windowEvents.filter((e) => !e.good).length;
    const observedErrorRate = bad / total;
    const allowedErrorRate = (100 - slo.target) / 100;

    if (allowedErrorRate <= 0) return observedErrorRate > 0 ? Infinity : 0;

    return observedErrorRate / allowedErrorRate;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// AnomalyDetector — EWMA-based Anomaly Detection
// ══════════════════════════════════════════════════════════════════════════════

export class AnomalyDetector {
  private states: Map<string, EWMAState> = new Map();
  private anomalies: AnomalyResult[] = [];
  private readonly defaultAlpha: number;
  private readonly defaultSigmaThreshold: number;
  private readonly maxAnomalyHistory: number;

  constructor(
    defaultAlpha: number = 0.3,
    defaultSigmaThreshold: number = 3,
    maxAnomalyHistory: number = 1000
  ) {
    this.defaultAlpha = defaultAlpha;
    this.defaultSigmaThreshold = defaultSigmaThreshold;
    this.maxAnomalyHistory = maxAnomalyHistory;
  }

  /** Configure sensitivity for a specific metric. */
  configure(
    metricName: string,
    config: Partial<AnomalyConfig>
  ): void {
    const existing = this.states.get(metricName);
    if (existing) {
      if (config.alpha !== undefined) existing.alpha = config.alpha;
      if (config.sigmaThreshold !== undefined)
        existing.sigmaThreshold = config.sigmaThreshold;
    } else {
      this.states.set(metricName, {
        mean: 0,
        variance: 0,
        count: 0,
        alpha: config.alpha ?? this.defaultAlpha,
        sigmaThreshold: config.sigmaThreshold ?? this.defaultSigmaThreshold,
      });
    }
  }

  /** Feed a new data point for a metric. Returns anomaly result. */
  addDatapoint(metricName: string, value: number): AnomalyResult {
    let state = this.states.get(metricName);
    if (!state) {
      state = {
        mean: 0,
        variance: 0,
        count: 0,
        alpha: this.defaultAlpha,
        sigmaThreshold: this.defaultSigmaThreshold,
      };
      this.states.set(metricName, state);
    }

    const result = this.computeResult(metricName, value, state);

    // Update EWMA state
    if (state.count === 0) {
      state.mean = value;
      state.variance = 0;
    } else {
      const diff = value - state.mean;
      state.mean = state.alpha * value + (1 - state.alpha) * state.mean;
      state.variance =
        (1 - state.alpha) * (state.variance + state.alpha * diff * diff);
    }
    state.count += 1;

    // Record anomaly if detected
    if (result.isAnomaly) {
      this.anomalies.push(result);
      // Trim history
      if (this.anomalies.length > this.maxAnomalyHistory) {
        this.anomalies = this.anomalies.slice(-this.maxAnomalyHistory);
      }
    }

    return result;
  }

  /** Check if the latest value is anomalous without recording it. */
  detect(metricName: string, value: number): AnomalyResult {
    const state = this.states.get(metricName);
    if (!state || state.count < 2) {
      return {
        metricName,
        value,
        mean: state?.mean ?? 0,
        stddev: 0,
        deviations: 0,
        isAnomaly: false,
        timestamp: Date.now(),
        direction: value >= (state?.mean ?? 0) ? "above" : "below",
      };
    }

    return this.computeResult(metricName, value, state);
  }

  /** Get all recent anomalies. */
  getAnomalies(since?: number): AnomalyResult[] {
    if (since) {
      return this.anomalies.filter((a) => a.timestamp >= since);
    }
    return [...this.anomalies];
  }

  /** Get anomalies for a specific metric. */
  getAnomaliesForMetric(metricName: string, since?: number): AnomalyResult[] {
    return this.getAnomalies(since).filter(
      (a) => a.metricName === metricName
    );
  }

  /** Get current EWMA state for a metric (for debugging/introspection). */
  getState(metricName: string): { mean: number; stddev: number; count: number } | null {
    const state = this.states.get(metricName);
    if (!state) return null;
    return {
      mean: state.mean,
      stddev: Math.sqrt(state.variance),
      count: state.count,
    };
  }

  /** Compute anomaly result for a value given the current EWMA state. */
  private computeResult(
    metricName: string,
    value: number,
    state: EWMAState
  ): AnomalyResult {
    const stddev = Math.sqrt(state.variance);
    const deviations = stddev > 0 ? Math.abs(value - state.mean) / stddev : 0;
    const isAnomaly = state.count >= 2 && deviations > state.sigmaThreshold;

    return {
      metricName,
      value,
      mean: state.mean,
      stddev,
      deviations,
      isAnomaly,
      timestamp: Date.now(),
      direction: value >= state.mean ? "above" : "below",
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Default Instances
// ══════════════════════════════════════════════════════════════════════════════

/** Global tracer instance. */
export const tracer = new Tracer("social-perks");

/** Global metrics collector instance. */
export const metrics = new MetricsCollector();

/** Global SLO monitor instance with pre-configured SLOs. */
export const sloMonitor = new SLOMonitor();

// Pre-configure platform SLOs
sloMonitor.defineSLO({
  name: "api_availability",
  target: 99.9,
  window: 86400, // 24 hours
  indicator: {
    type: "availability",
    goodMetric: "http_requests_total{status=~'2..'}",
    totalMetric: "http_requests_total",
  },
});

sloMonitor.defineSLO({
  name: "api_latency_p99",
  target: 99.0,
  window: 86400,
  indicator: {
    type: "latency",
    goodMetric: "http_request_duration_seconds",
    totalMetric: "http_requests_total",
    threshold: 500, // 500ms
  },
});

sloMonitor.defineSLO({
  name: "verification_success_rate",
  target: 95.0,
  window: 604800, // 7 days
  indicator: {
    type: "availability",
    goodMetric: "verification_success_total",
    totalMetric: "verification_attempts_total",
  },
});

sloMonitor.defineSLO({
  name: "fraud_detection_accuracy",
  target: 98.0,
  window: 604800,
  indicator: {
    type: "error_rate",
    goodMetric: "fraud_true_positive_total",
    totalMetric: "fraud_checks_total",
  },
});

/** Global anomaly detector instance. */
export const anomalyDetector = new AnomalyDetector();
