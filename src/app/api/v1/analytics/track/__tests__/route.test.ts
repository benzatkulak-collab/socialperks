import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import { recentEvents, _resetAnalytics } from "@/lib/analytics";

beforeEach(() => {
  _resetAnalytics();
});

afterEach(() => {
  _resetAnalytics();
});

let _ipCounter = 0;
function makeReq(body: unknown): NextRequest {
  _ipCounter += 1;
  return new NextRequest(
    new URL("http://localhost:3000/api/v1/analytics/track"),
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        "x-real-ip": `127.20.${Math.floor(_ipCounter / 256)}.${_ipCounter % 256}`,
      },
    }
  );
}

describe("POST /api/v1/analytics/track", () => {
  it("accepts a valid event", async () => {
    const res = await POST(
      makeReq({
        event: "landing.viewed",
        distinctId: "anon-uuid",
        properties: { path: "/" },
      })
    );
    expect(res.status).toBe(200);
    const events = recentEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("landing.viewed");
  });

  it("rejects malformed event names", async () => {
    const res = await POST(
      makeReq({
        event: "BAD-NAME",
        distinctId: "anon-uuid",
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_EVENT");
    expect(recentEvents()).toHaveLength(0);
  });

  it("rejects events without distinctId", async () => {
    const res = await POST(
      makeReq({
        event: "landing.viewed",
      })
    );
    expect(res.status).toBe(400);
  });

  it("strips $-prefixed properties (system reserved)", async () => {
    await POST(
      makeReq({
        event: "test.event",
        distinctId: "u1",
        properties: { $user_id: "forged", legit: "ok" },
      })
    );
    const e = recentEvents()[0];
    expect(e.properties.legit).toBe("ok");
    expect(e.properties.$user_id).toBeUndefined();
    // The route adds $ip itself — that's the only $ prop allowed.
    expect(e.properties.$ip).toBeTruthy();
  });

  it("rejects when too many properties posted", async () => {
    const props: Record<string, string> = {};
    for (let i = 0; i < 30; i++) props[`p${i}`] = String(i);
    const res = await POST(
      makeReq({ event: "x.y", distinctId: "u1", properties: props })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("TOO_MANY_PROPERTIES");
  });

  it("truncates long string values rather than rejecting", async () => {
    const longString = "a".repeat(2000);
    await POST(
      makeReq({
        event: "x.y",
        distinctId: "u1",
        properties: { note: longString },
      })
    );
    const e = recentEvents()[0];
    expect(typeof e.properties.note).toBe("string");
    expect((e.properties.note as string).length).toBe(1024);
  });

  it("drops non-scalar property values", async () => {
    await POST(
      makeReq({
        event: "x.y",
        distinctId: "u1",
        properties: {
          ok: "string",
          drop: { nested: "object" },
          drop2: ["arr"],
        } as Record<string, unknown>,
      })
    );
    const e = recentEvents()[0];
    expect(e.properties.ok).toBe("string");
    expect(e.properties.drop).toBeUndefined();
    expect(e.properties.drop2).toBeUndefined();
  });
});
