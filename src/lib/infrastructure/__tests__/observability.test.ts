import { describe, it, expect, beforeEach } from "vitest";
import {
  Tracer,
  MetricsCollector,
  SLOMonitor,
  AnomalyDetector,
} from "../observability";

// ═══════════════════════════════════════════════════════════════════════════════
// Tracer
// ═══════════════════════════════════════════════════════════════════════════════

describe("Tracer", () => {
  let tracer: Tracer;

  beforeEach(() => {
    tracer = new Tracer("test-service");
  });

  it("startSpan creates a span with auto-generated IDs", () => {
    const span = tracer.startSpan("test-operation");
    expect(span.traceId).toBeDefined();
    expect(span.spanId).toBeDefined();
    expect(span.operationName).toBe("test-operation");
    expect(span.serviceName).toBe("test-service");
    expect(span.status).toBe("unset");
    expect(span.endTime).toBeNull();
  });

  it("endSpan computes duration and sets status", () => {
    const span = tracer.startSpan("test-op");
    const ended = tracer.endSpan(span.spanId);
    expect(ended).not.toBeNull();
    expect(ended!.endTime).not.toBeNull();
    expect(ended!.duration).toBeGreaterThanOrEqual(0);
    expect(ended!.status).toBe("ok");
  });

  it("endSpan returns null for non-existent span", () => {
    expect(tracer.endSpan("nonexistent")).toBeNull();
  });

  it("getTrace returns all spans for a trace", () => {
    const span1 = tracer.startSpan("parent");
    const span2 = tracer.startSpan("child", {
      traceId: span1.traceId,
      parentSpanId: span1.spanId,
    });

    tracer.endSpan(span1.spanId);
    tracer.endSpan(span2.spanId);

    const trace = tracer.getTrace(span1.traceId);
    expect(trace).not.toBeNull();
    expect(trace!.spans).toHaveLength(2);
    expect(trace!.spanCount).toBe(2);
    expect(trace!.services).toContain("test-service");
  });

  it("getTrace returns null for non-existent trace", () => {
    expect(tracer.getTrace("nonexistent")).toBeNull();
  });

  it("child spans link to parent via parentSpanId", () => {
    const parent = tracer.startSpan("parent");
    const child = tracer.startChildSpan(parent.spanId, "child-op");

    expect(child).not.toBeNull();
    expect(child!.parentSpanId).toBe(parent.spanId);
    expect(child!.traceId).toBe(parent.traceId);
  });

  it("startChildSpan returns null for non-existent parent", () => {
    expect(tracer.startChildSpan("nonexistent", "child")).toBeNull();
  });

  it("addEvent adds timestamped events to a span", () => {
    const span = tracer.startSpan("op");
    tracer.addEvent(span.spanId, "checkpoint", { step: 1 });

    const retrieved = tracer.getSpan(span.spanId);
    expect(retrieved!.events).toHaveLength(1);
    expect(retrieved!.events[0].name).toBe("checkpoint");
    expect(retrieved!.events[0].attributes.step).toBe(1);
  });

  it("setStatus changes span status", () => {
    const span = tracer.startSpan("op");
    tracer.setStatus(span.spanId, "error");
    const retrieved = tracer.getSpan(span.spanId);
    expect(retrieved!.status).toBe("error");
  });

  it("getActiveSpans returns only unfinished spans", () => {
    const span1 = tracer.startSpan("op1");
    tracer.startSpan("op2");
    tracer.endSpan(span1.spanId);

    const active = tracer.getActiveSpans();
    expect(active).toHaveLength(1);
    expect(active[0].operationName).toBe("op2");
  });

  it("setAttributes adds attributes to a span", () => {
    const span = tracer.startSpan("op");
    tracer.setAttributes(span.spanId, { "http.method": "GET", "http.status": 200 });

    const retrieved = tracer.getSpan(span.spanId);
    expect(retrieved!.attributes["http.method"]).toBe("GET");
    expect(retrieved!.attributes["http.status"]).toBe(200);
  });

  it("getTrace computes trace duration from root span", () => {
    const root = tracer.startSpan("root");
    tracer.endSpan(root.spanId);

    const trace = tracer.getTrace(root.traceId);
    expect(trace).not.toBeNull();
    expect(trace!.duration).toBeGreaterThanOrEqual(0);
    expect(trace!.rootSpan).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MetricsCollector
// ═══════════════════════════════════════════════════════════════════════════════

describe("MetricsCollector", () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  it("counter increments correctly", () => {
    collector.counter("test_counter", { method: "GET" });
    collector.counter("test_counter", { method: "GET" });
    collector.counter("test_counter", { method: "GET" });

    const metric = collector.getMetric("test_counter");
    expect(metric).not.toBeNull();
    expect(metric!.values).toHaveLength(1);
    expect(metric!.values[0].value).toBe(3);
  });

  it("counter increments by custom amount", () => {
    collector.counter("test_counter", { method: "POST" }, 5);
    const metric = collector.getMetric("test_counter");
    expect(metric!.values[0].value).toBe(5);
  });

  it("gauge sets value", () => {
    collector.gauge("active_connections", 42, { service: "api" });
    collector.gauge("active_connections", 38, { service: "api" });

    const metric = collector.getMetric("active_connections");
    expect(metric).not.toBeNull();
    // Latest value should be 38
    expect(metric!.values[0].value).toBe(38);
  });

  it("histogram records values and updates buckets", () => {
    collector.histogram("request_duration", 0.05, { path: "/api" });
    collector.histogram("request_duration", 0.5, { path: "/api" });
    collector.histogram("request_duration", 2.0, { path: "/api" });

    const metric = collector.getMetric("request_duration");
    expect(metric).not.toBeNull();
    expect(metric!.histogramBuckets).toBeDefined();

    const buckets = metric!.histogramBuckets!.values().next().value;
    expect(buckets).toBeDefined();
    expect(buckets!.count).toBe(3);
    expect(buckets!.sum).toBeCloseTo(2.55, 2);
  });

  it("getMetrics returns Prometheus exposition format", () => {
    collector.counter("my_counter", { env: "test" });
    const output = collector.getMetrics();
    expect(typeof output).toBe("string");
    expect(output).toContain("# HELP");
    expect(output).toContain("# TYPE");
  });

  it("getMetrics includes histogram bucket lines", () => {
    collector.histogram("latency", 0.1, { svc: "web" });
    const output = collector.getMetrics();
    expect(output).toContain("latency_bucket");
    expect(output).toContain("latency_sum");
    expect(output).toContain("latency_count");
    expect(output).toContain('+Inf');
  });

  it("register creates a new metric definition", () => {
    collector.register({
      name: "custom_metric",
      type: "gauge",
      description: "A custom gauge",
      unit: "items",
      labels: ["env"],
    });

    const defs = collector.getDefinitions();
    expect(defs.some((d) => d.name === "custom_metric")).toBe(true);
  });

  it("reset clears all metric values", () => {
    collector.counter("test_counter", {});
    collector.reset();
    const metric = collector.getMetric("test_counter");
    expect(metric!.values).toHaveLength(0);
  });

  it("startTimer records histogram duration", () => {
    const stop = collector.startTimer("timer_test", { op: "load" });
    const duration = stop();
    expect(duration).toBeGreaterThanOrEqual(0);

    const metric = collector.getMetric("timer_test");
    expect(metric).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SLOMonitor
// ═══════════════════════════════════════════════════════════════════════════════

describe("SLOMonitor", () => {
  let monitor: SLOMonitor;

  beforeEach(() => {
    monitor = new SLOMonitor();
    monitor.defineSLO({
      name: "test_availability",
      target: 99.0,
      window: 3600, // 1 hour
      indicator: {
        type: "availability",
        goodMetric: "success_total",
        totalMetric: "requests_total",
      },
    });
  });

  it("defineSLO registers an SLO", () => {
    const status = monitor.getCurrentSLO("test_availability");
    expect(status).not.toBeNull();
    expect(status!.name).toBe("test_availability");
    expect(status!.target).toBe(99.0);
  });

  it("recordEvent tracks good events", () => {
    for (let i = 0; i < 100; i++) {
      monitor.recordEvent("test_availability", true);
    }

    const status = monitor.getCurrentSLO("test_availability");
    expect(status!.totalEvents).toBe(100);
    expect(status!.goodEvents).toBe(100);
    expect(status!.badEvents).toBe(0);
    expect(status!.current).toBe(100);
    expect(status!.isCompliant).toBe(true);
  });

  it("getCurrentSLO shows error budget consumption", () => {
    // 95 good, 5 bad = 95% (target is 99%)
    for (let i = 0; i < 95; i++) {
      monitor.recordEvent("test_availability", true);
    }
    for (let i = 0; i < 5; i++) {
      monitor.recordEvent("test_availability", false);
    }

    const status = monitor.getCurrentSLO("test_availability");
    expect(status!.current).toBe(95);
    expect(status!.isCompliant).toBe(false);
    expect(status!.errorBudgetConsumedPct).toBeGreaterThan(0);
    expect(status!.burnRate).toBeGreaterThan(0);
  });

  it("getCurrentSLO returns null for unknown SLO", () => {
    expect(monitor.getCurrentSLO("nonexistent")).toBeNull();
  });

  it("getReport includes all SLO statuses", () => {
    monitor.defineSLO({
      name: "test_latency",
      target: 95.0,
      window: 3600,
      indicator: {
        type: "latency",
        goodMetric: "fast_requests",
        totalMetric: "all_requests",
        threshold: 500,
      },
    });

    monitor.recordEvent("test_availability", true);
    monitor.recordEvent("test_latency", true);

    const report = monitor.getReport();
    expect(report.slos).toHaveLength(2);
    expect(report.overallCompliance).toBeDefined();
    expect(report.generatedAt).toBeDefined();
  });

  it("burn rate triggers alerts when too high", () => {
    const alertMonitor = new SLOMonitor(1.0); // Low threshold
    alertMonitor.defineSLO({
      name: "alerting_slo",
      target: 99.9,
      window: 3600,
      indicator: {
        type: "availability",
        goodMetric: "good",
        totalMetric: "total",
      },
    });

    // Record many bad events to trigger alert
    for (let i = 0; i < 10; i++) {
      alertMonitor.recordEvent("alerting_slo", false);
    }
    for (let i = 0; i < 5; i++) {
      alertMonitor.recordEvent("alerting_slo", true);
    }

    const alerts = alertMonitor.getAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].sloName).toBe("alerting_slo");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AnomalyDetector
// ═══════════════════════════════════════════════════════════════════════════════

describe("AnomalyDetector", () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AnomalyDetector(0.3, 3, 100);
  });

  it("addDatapoint updates EWMA state", () => {
    detector.addDatapoint("latency", 100);
    detector.addDatapoint("latency", 105);
    detector.addDatapoint("latency", 95);

    const state = detector.getState("latency");
    expect(state).not.toBeNull();
    expect(state!.count).toBe(3);
    expect(state!.mean).toBeGreaterThan(0);
  });

  it("detect returns false for normal values after learning", () => {
    // Train with normal values
    for (let i = 0; i < 20; i++) {
      detector.addDatapoint("metric", 100 + Math.random() * 5);
    }

    // Test a normal value
    const result = detector.detect("metric", 102);
    expect(result.isAnomaly).toBe(false);
    expect(result.metricName).toBe("metric");
  });

  it("detect returns false when fewer than 2 data points", () => {
    detector.addDatapoint("new_metric", 100);
    const result = detector.detect("new_metric", 200);
    expect(result.isAnomaly).toBe(false);
  });

  it("detect returns false for uninitialized metric", () => {
    const result = detector.detect("unknown", 100);
    expect(result.isAnomaly).toBe(false);
    expect(result.deviations).toBe(0);
  });

  it("addDatapoint detects anomaly for extreme values", () => {
    // Build up a stable baseline with some natural variance
    // (EWMA needs non-zero variance to detect anomalies)
    for (let i = 0; i < 30; i++) {
      detector.addDatapoint("stable", 100 + (i % 2 === 0 ? 1 : -1));
    }

    // Now an extreme value far beyond any normal deviation
    const result = detector.addDatapoint("stable", 100000);
    expect(result.isAnomaly).toBe(true);
    expect(result.direction).toBe("above");
  });

  it("getAnomalies returns stored anomaly results", () => {
    // Build baseline with some variance
    for (let i = 0; i < 30; i++) {
      detector.addDatapoint("metric", 100 + (i % 2 === 0 ? 2 : -2));
    }

    // Trigger anomaly with extreme value
    detector.addDatapoint("metric", 100000);

    const anomalies = detector.getAnomalies();
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].metricName).toBe("metric");
    expect(anomalies[0].isAnomaly).toBe(true);
  });

  it("getAnomaliesForMetric filters by metric name", () => {
    for (let i = 0; i < 30; i++) {
      detector.addDatapoint("m1", 100);
      detector.addDatapoint("m2", 50);
    }

    detector.addDatapoint("m1", 100000);
    detector.addDatapoint("m2", 50000);

    const m1Anomalies = detector.getAnomaliesForMetric("m1");
    const m2Anomalies = detector.getAnomaliesForMetric("m2");
    expect(m1Anomalies.every((a) => a.metricName === "m1")).toBe(true);
    expect(m2Anomalies.every((a) => a.metricName === "m2")).toBe(true);
  });

  it("configure adjusts sensitivity for a metric", () => {
    detector.configure("custom", { alpha: 0.5, sigmaThreshold: 2 });

    const state = detector.getState("custom");
    // State is initialized but no data yet
    expect(state).not.toBeNull();
    expect(state!.count).toBe(0);
  });
});
