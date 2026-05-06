import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  track,
  identify,
  flush,
  recentEvents,
  funnel,
  FUNNEL_EVENT,
  _resetAnalytics,
} from "../index";

const ORIGINAL_FETCH = globalThis.fetch;

beforeEach(() => {
  _resetAnalytics();
});

afterEach(() => {
  _resetAnalytics();
  globalThis.fetch = ORIGINAL_FETCH;
  delete process.env.POSTHOG_API_KEY;
});

describe("track", () => {
  it("buffers events and exposes them via recentEvents", () => {
    track("test.event", { distinctId: "user-1", count: 5 });
    const events = recentEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("test.event");
    expect(events[0].distinctId).toBe("user-1");
    expect(events[0].properties.count).toBe(5);
    expect(events[0].timestamp).toBeTruthy();
  });

  it("ignores events without a distinctId", () => {
    track("orphan", { distinctId: "" });
    expect(recentEvents()).toHaveLength(0);
  });

  it("recent events are in newest-first order", () => {
    track("e1", { distinctId: "u1" });
    track("e2", { distinctId: "u1" });
    track("e3", { distinctId: "u1" });
    const events = recentEvents();
    expect(events[0].event).toBe("e3");
    expect(events[2].event).toBe("e1");
  });
});

describe("flush", () => {
  it("noop when buffer empty", async () => {
    expect(await flush()).toBe(0);
  });

  it("returns count when no API key set", async () => {
    track("a", { distinctId: "u1" });
    track("b", { distinctId: "u1" });
    expect(await flush()).toBe(2);
  });

  it("posts to PostHog when API key is configured", async () => {
    const calls: Array<{ url: string; body: string }> = [];
    globalThis.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), body: String(init?.body ?? "") });
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    process.env.POSTHOG_API_KEY = "phc_test_key";
    track("conversion", { distinctId: "user-1", value: 100 });
    track("page", { distinctId: "user-1" });

    const flushed = await flush();
    expect(flushed).toBe(2);

    const phCall = calls.find((c) => c.url.includes("/capture/"));
    expect(phCall).toBeTruthy();
    const body = JSON.parse(phCall!.body);
    expect(body.api_key).toBe("phc_test_key");
    expect(body.batch).toHaveLength(2);
    expect(body.batch[0].event).toBe("conversion");
    expect(body.batch[0].distinct_id).toBe("user-1");
  });

  it("does not throw if PostHog is unreachable", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network");
    }) as typeof fetch;
    process.env.POSTHOG_API_KEY = "phc_test";
    track("e", { distinctId: "u1" });
    await expect(flush()).resolves.toBe(1);
  });
});

describe("identify", () => {
  it("buffers a $identify event with stringified $set", async () => {
    identify("user-99", { plan: "pro", country: "US" });
    const events = recentEvents();
    expect(events[0].event).toBe("$identify");
    expect(events[0].distinctId).toBe("user-99");
    // $set is JSON-stringified internally; flush parses it back out.
    expect(events[0].properties.$set).toBeTruthy();
  });

  it("flush sends $identify with parsed $set object", async () => {
    const calls: Array<{ body: string }> = [];
    globalThis.fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      calls.push({ body: String(init?.body ?? "") });
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    process.env.POSTHOG_API_KEY = "phc_test";

    identify("user-99", { plan: "pro" });
    await flush();

    const body = JSON.parse(calls[0].body);
    expect(body.batch[0].event).toBe("$identify");
    expect(body.batch[0].properties.$set).toEqual({ plan: "pro" });
  });
});

describe("funnel helpers", () => {
  it("signupCompleted records the canonical event", () => {
    funnel.signupCompleted("user-1", { businessId: "biz-1", role: "business" });
    const events = recentEvents();
    expect(events[0].event).toBe(FUNNEL_EVENT.AUTH_SIGNUP_COMPLETED);
    expect(events[0].distinctId).toBe("user-1");
    expect(events[0].properties.businessId).toBe("biz-1");
  });

  it("programCreated includes isFirst flag", () => {
    funnel.programCreated("user-1", {
      businessId: "biz-1",
      programId: "prg-1",
      isFirst: true,
    });
    expect(recentEvents()[0].properties.isFirst).toBe(true);
  });

  it("claimLandingViewed binds the anonymous distinctId", () => {
    funnel.claimLandingViewed("anon:abc123", {
      businessId: "biz-1",
      programId: "prg-1",
      claimCode: "AAAA22",
    });
    const e = recentEvents()[0];
    expect(e.distinctId).toBe("anon:abc123");
    expect(e.properties.claimCode).toBe("AAAA22");
  });
});
