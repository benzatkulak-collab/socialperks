/**
 * Whether this server holds realtime streams open: REALTIME_EVENTS.
 *
 * Production runs on Netlify Free, where every function runs on its own
 * Lambda and is billed for as long as it runs (10 credits per GB-hour; the
 * whole site pauses when the month's 300 credits are gone). A stream holds
 * its function for as long as the tab stays open, and the in-memory publisher
 * hardly ever reaches it: a Lambda instance runs one request at a time, so
 * the submissions and campaign changes that publish run on other instances.
 * So production streams nothing unless REALTIME_EVENTS=on. Development and
 * tests stream unless it is "off".
 *
 * Off, GET and HEAD answer 204 No Content: the HTML spec's way to tell an
 * EventSource to stop reconnecting, and the client's cue to stop asking.
 *
 * All ids and emails here are made up.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, HEAD } from "../route";
import { signJWT } from "@/lib/auth";
import { eventPublisher } from "@/lib/realtime/publisher";
import { realtimeEventsEnabled } from "@/lib/realtime/switch";

const BIZ_A = "biz_test_alpha";

function cookieRequest(method: "GET" | "HEAD"): NextRequest {
  const token = signJWT({ sub: "usr_test_owner_a", role: "business", email: "usr_test_owner_a@example.test", businessId: BIZ_A, type: "access" });
  return new NextRequest("http://localhost/api/v1/events", { method, headers: { cookie: `sp-access-token=${token}` } });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("realtimeEventsEnabled", () => {
  it("is off in production unless REALTIME_EVENTS turns it on", () => {
    expect(realtimeEventsEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(realtimeEventsEnabled({ NODE_ENV: "production", REALTIME_EVENTS: "" })).toBe(false);
    expect(realtimeEventsEnabled({ NODE_ENV: "production", REALTIME_EVENTS: "on" })).toBe(true);
    expect(realtimeEventsEnabled({ NODE_ENV: "production", REALTIME_EVENTS: " ON " })).toBe(true);
    expect(realtimeEventsEnabled({ NODE_ENV: "production", REALTIME_EVENTS: "true" })).toBe(true);
  });

  it("is on in development and tests unless REALTIME_EVENTS turns it off", () => {
    expect(realtimeEventsEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(realtimeEventsEnabled({ NODE_ENV: "test" })).toBe(true);
    expect(realtimeEventsEnabled({})).toBe(true);
    expect(realtimeEventsEnabled({ NODE_ENV: "development", REALTIME_EVENTS: "off" })).toBe(false);
    expect(realtimeEventsEnabled({ NODE_ENV: "test", REALTIME_EVENTS: "false" })).toBe(false);
  });

  it("ignores a value it does not know, and keeps the default", () => {
    expect(realtimeEventsEnabled({ NODE_ENV: "production", REALTIME_EVENTS: "yes please" })).toBe(false);
    expect(realtimeEventsEnabled({ NODE_ENV: "development", REALTIME_EVENTS: "maybe" })).toBe(true);
  });
});

describe("GET and HEAD /api/v1/events with REALTIME_EVENTS=off", () => {
  it("answers GET 204 with no body, and opens no stream", async () => {
    vi.stubEnv("REALTIME_EVENTS", "off");
    const before = eventPublisher.listenerCount;
    const res = await GET(cookieRequest("GET"));
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(eventPublisher.listenerCount).toBe(before);
  });

  it("answers HEAD 204", async () => {
    vi.stubEnv("REALTIME_EVENTS", "off");
    const res = await HEAD(cookieRequest("HEAD"));
    expect(res.status).toBe(204);
  });

  it("streams again when REALTIME_EVENTS=on", async () => {
    vi.stubEnv("REALTIME_EVENTS", "on");
    const abort = new AbortController();
    const token = signJWT({ sub: "usr_test_owner_a", role: "business", email: "usr_test_owner_a@example.test", businessId: BIZ_A, type: "access" });
    const res = await GET(new NextRequest("http://localhost/api/v1/events", { headers: { cookie: `sp-access-token=${token}` }, signal: abort.signal }));
    expect(res.status).toBe(200);
    abort.abort();
  });
});
