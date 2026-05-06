import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureException,
  listRecentCaptures,
  getCaptureCount,
  getRouteErrorCount,
  _resetErrorTracker,
} from "../error-tracker";
import { metrics } from "@/lib/reliability/metrics";

const ORIGINAL_FETCH = globalThis.fetch;

beforeEach(() => {
  _resetErrorTracker();
});

afterEach(() => {
  _resetErrorTracker();
  globalThis.fetch = ORIGINAL_FETCH;
  delete process.env.SENTRY_DSN;
  delete process.env.ERROR_WEBHOOK_URL;
});

describe("captureException", () => {
  it("captures Error instances with stack", () => {
    const err = new Error("kaboom");
    const captured = captureException(err, { route: "/api/v1/foo", method: "POST" });
    expect(captured.message).toBe("kaboom");
    expect(captured.name).toBe("Error");
    expect(captured.stack).toBeTruthy();
    expect(captured.context.route).toBe("/api/v1/foo");
    expect(captured.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("wraps non-Error values", () => {
    const cap1 = captureException("string error");
    expect(cap1.message).toBe("string error");

    const cap2 = captureException({ unusual: "shape" });
    expect(cap2.message).toContain("unusual");
  });

  it("appends to the ring buffer", () => {
    captureException(new Error("one"));
    captureException(new Error("two"));
    captureException(new Error("three"));
    expect(getCaptureCount()).toBe(3);

    const recent = listRecentCaptures();
    // Newest first
    expect(recent[0].message).toBe("three");
    expect(recent[2].message).toBe("one");
  });

  it("filters by route", () => {
    captureException(new Error("a"), { route: "/api/v1/auth" });
    captureException(new Error("b"), { route: "/api/v1/billing/webhook" });
    captureException(new Error("c"), { route: "/api/v1/auth" });

    const auth = listRecentCaptures({ route: "/api/v1/auth" });
    expect(auth).toHaveLength(2);
    expect(auth.every((e) => e.context.route === "/api/v1/auth")).toBe(true);
  });

  it("filters by since", () => {
    captureException(new Error("old"));
    const cutoff = new Date(Date.now() + 10).toISOString();
    // Wait briefly to make the new capture post-cutoff
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        captureException(new Error("new"));
        const after = listRecentCaptures({ since: cutoff });
        expect(after).toHaveLength(1);
        expect(after[0].message).toBe("new");
        resolve();
      }, 20);
    });
  });

  it("increments per-route error count", () => {
    captureException(new Error("e1"), { route: "/api/v1/auth" });
    captureException(new Error("e2"), { route: "/api/v1/auth" });
    captureException(new Error("e3"), { route: "/api/v1/billing/webhook" });
    expect(getRouteErrorCount("/api/v1/auth")).toBe(2);
    expect(getRouteErrorCount("/api/v1/billing/webhook")).toBe(1);
    expect(getRouteErrorCount("/api/v1/nope")).toBe(0);
  });

  it("increments the labeled counter on the metrics collector", () => {
    captureException(new Error("e"), {
      route: "/api/v1/auth",
      method: "POST",
    });
    const points = metrics.getCounterPoints("system.api.error.captured");
    const found = points.find(
      (p) =>
        p.labels?.route === "/api/v1/auth" && p.labels?.method === "POST"
    );
    expect(found).toBeTruthy();
  });

  it("ships to Sentry when SENTRY_DSN is set", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    globalThis.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    process.env.SENTRY_DSN = "https://abc123@sentry.example.com/42";
    _resetErrorTracker(); // re-cache the DSN

    captureException(new Error("ship me"), { route: "/api/v1/x" });

    // Fire-and-forget — wait a tick for the void promise to settle.
    await new Promise((r) => setImmediate(r));

    const sentryCall = calls.find((c) => c.url.includes("sentry.example.com"));
    expect(sentryCall).toBeTruthy();
    expect(sentryCall?.init?.method).toBe("POST");
    const body = JSON.parse(String(sentryCall?.init?.body));
    expect(body.exception.values[0].value).toBe("ship me");
    expect(body.request.url).toBe("/api/v1/x");
  });

  it("posts to webhook when ERROR_WEBHOOK_URL is set", async () => {
    const calls: Array<{ url: string }> = [];
    globalThis.fetch = vi.fn(async (url: string) => {
      calls.push({ url: String(url) });
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    process.env.ERROR_WEBHOOK_URL = "https://hooks.example.com/incident";
    captureException(new Error("notify"));

    await new Promise((r) => setImmediate(r));
    const webhookCall = calls.find((c) =>
      c.url.includes("hooks.example.com")
    );
    expect(webhookCall).toBeTruthy();
  });

  it("does not throw if Sentry returns 500", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response("{}", { status: 500 });
    }) as typeof fetch;

    process.env.SENTRY_DSN = "https://abc123@sentry.example.com/42";
    _resetErrorTracker();

    expect(() =>
      captureException(new Error("still ok"))
    ).not.toThrow();
  });

  it("does not throw if Sentry fetch rejects", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network");
    }) as typeof fetch;

    process.env.SENTRY_DSN = "https://abc123@sentry.example.com/42";
    _resetErrorTracker();

    expect(() =>
      captureException(new Error("still ok"))
    ).not.toThrow();
    // Still captured to ring buffer + metrics.
    expect(getCaptureCount()).toBe(1);
  });
});
