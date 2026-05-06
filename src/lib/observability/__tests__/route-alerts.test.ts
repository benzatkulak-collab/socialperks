import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { _testHelpers, HIGH_STAKES_ROUTES } from "../route-alerts";
import { metrics, METRIC } from "@/lib/reliability/metrics";

beforeEach(() => {
  // Counter state lives on the metrics singleton — reset by replacing
  // the windowPoints array on each counter we use.
  for (const counterName of [METRIC.API_REQUEST, METRIC.API_ERROR, "system.api.error.captured"]) {
    const c = metrics.getCounterPoints(counterName);
    // Cast away readonly to clear in-place. This is fine because the
    // counter object itself is held by the singleton.
    (c as unknown as { length: number }).length = 0;
  }
});

afterEach(() => {
  _testHelpers.reset();
});

describe("HIGH_STAKES_ROUTES", () => {
  it("covers exactly five routes", () => {
    expect(HIGH_STAKES_ROUTES).toHaveLength(5);
  });

  it("each route has a non-empty runbook and blast radius", () => {
    for (const route of HIGH_STAKES_ROUTES) {
      expect(route.runbook.length).toBeGreaterThan(20);
      expect(route.blastRadius.length).toBeGreaterThan(20);
      expect(["critical", "high"]).toContain(route.severity);
    }
  });

  it("includes the billing webhook (#1 on the stakes list)", () => {
    expect(
      HIGH_STAKES_ROUTES.some((r) => r.path === "/api/v1/billing/webhook")
    ).toBe(true);
  });

  it("includes auth (#2 on the stakes list)", () => {
    expect(HIGH_STAKES_ROUTES.some((r) => r.path === "/api/v1/auth")).toBe(true);
  });
});

describe("buildAlertsForRoute", () => {
  const testRoute = HIGH_STAKES_ROUTES[0];

  it("creates two alerts per route (capture + rate)", () => {
    const alerts = _testHelpers.buildAlertsForRoute(testRoute);
    expect(alerts).toHaveLength(2);
    expect(alerts[0].id).toContain("route_capture_");
    expect(alerts[1].id).toContain("route_error_rate_");
  });

  it("capture alert fires on any captured error for the route", () => {
    const [captureAlert] = _testHelpers.buildAlertsForRoute(testRoute);

    expect(captureAlert.evaluate()).toBeNull();

    metrics.increment("system.api.error.captured", 1, {
      route: testRoute.path,
      method: "POST",
    });
    expect(captureAlert.evaluate()).toMatch(/1 captured error/);
  });

  it("capture alert ignores errors from other routes", () => {
    const [captureAlert] = _testHelpers.buildAlertsForRoute(testRoute);

    metrics.increment("system.api.error.captured", 1, {
      route: "/api/v1/somewhere/else",
      method: "POST",
    });
    expect(captureAlert.evaluate()).toBeNull();
  });

  it("rate alert respects minTraffic floor", () => {
    const route = { ...testRoute, minTraffic: 10, errorRateThreshold: 0.1 };
    const alerts = _testHelpers.buildAlertsForRoute(route);
    const rateAlert = alerts[1];

    // 1 error, 1 request — 100% rate but below the traffic floor.
    metrics.increment(METRIC.API_REQUEST, 1, { path: route.path });
    metrics.increment(METRIC.API_ERROR, 1, { path: route.path, status: "500" });
    expect(rateAlert.evaluate()).toBeNull();
  });

  it("rate alert fires when error rate exceeds threshold", () => {
    const route = { ...testRoute, minTraffic: 5, errorRateThreshold: 0.1 };
    const alerts = _testHelpers.buildAlertsForRoute(route);
    const rateAlert = alerts[1];

    // 8 requests, 2 errors — 25% rate, above 10% threshold and above min traffic.
    for (let i = 0; i < 8; i++) {
      metrics.increment(METRIC.API_REQUEST, 1, { path: route.path });
    }
    for (let i = 0; i < 2; i++) {
      metrics.increment(METRIC.API_ERROR, 1, { path: route.path, status: "500" });
    }
    const reason = rateAlert.evaluate();
    expect(reason).toMatch(/2\/8 requests failed/);
  });

  it("rate alert does not fire when below threshold", () => {
    const route = { ...testRoute, minTraffic: 5, errorRateThreshold: 0.5 };
    const alerts = _testHelpers.buildAlertsForRoute(route);
    const rateAlert = alerts[1];

    for (let i = 0; i < 10; i++) {
      metrics.increment(METRIC.API_REQUEST, 1, { path: route.path });
    }
    metrics.increment(METRIC.API_ERROR, 1, { path: route.path, status: "500" });
    expect(rateAlert.evaluate()).toBeNull();
  });
});
