/**
 * Verifies that the withTiming wrapper actually pipes errors to the
 * observability tracker. This is the integration that turns a route
 * throw into a captured Sentry event.
 */

import { afterEach, describe, expect, it } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { withTiming, ok, err } from "../_shared";
import {
  listRecentCaptures,
  _resetErrorTracker,
} from "@/lib/observability/error-tracker";

afterEach(() => {
  _resetErrorTracker();
});

let _ipCounter = 0;
function makeReq(url: string): NextRequest {
  _ipCounter += 1;
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    headers: {
      "x-real-ip": `127.99.${Math.floor(_ipCounter / 256)}.${_ipCounter % 256}`,
    },
  });
}

describe("withTiming error capture", () => {
  it("captures uncaught throws and converts them to 500", async () => {
    const handler = withTiming(async () => {
      throw new Error("internal failure");
    });

    const res = await handler(
      makeReq("http://localhost:3000/api/v1/test/path")
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toContain("Reference:");

    // The X-Capture-Id header echoes back what's in the body so support
    // can correlate user-reported errors to captures.
    const captureId = res.headers.get("X-Capture-Id");
    expect(captureId).toBeTruthy();

    const captures = listRecentCaptures();
    expect(captures.length).toBe(1);
    expect(captures[0].message).toBe("internal failure");
    expect(captures[0].context.route).toBe("/api/v1/test/path");
    expect(captures[0].context.status).toBe(500);
  });

  it("captures explicit 5xx responses too (route returned err with 500+)", async () => {
    const handler = withTiming(async () => {
      return err("DB_DOWN", "database unreachable", 503);
    });

    const res = await handler(
      makeReq("http://localhost:3000/api/v1/test/path-503")
    );
    expect(res.status).toBe(503);

    const captures = listRecentCaptures();
    expect(captures.length).toBe(1);
    expect(captures[0].context.status).toBe(503);
    expect(captures[0].context.route).toBe("/api/v1/test/path-503");
  });

  it("does NOT capture 4xx responses", async () => {
    const handler = withTiming(async () => {
      return err("BAD_REQUEST", "missing field", 400);
    });

    const res = await handler(
      makeReq("http://localhost:3000/api/v1/test/path-4xx")
    );
    expect(res.status).toBe(400);
    expect(listRecentCaptures()).toHaveLength(0);
  });

  it("does NOT capture 2xx responses", async () => {
    const handler = withTiming(async () => {
      return ok({ hello: "world" });
    });

    await handler(makeReq("http://localhost:3000/api/v1/test/path-ok"));
    expect(listRecentCaptures()).toHaveLength(0);
  });

  it("preserves response shape on success path", async () => {
    const handler = withTiming(async () => {
      return ok({ count: 42 });
    });

    const res = await handler(makeReq("http://localhost:3000/api/v1/x"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Request-Id")).toBeTruthy();
    expect(res.headers.get("X-Response-Time")).toMatch(/ms$/);
    expect(((res as NextResponse) instanceof NextResponse)).toBe(true);
  });
});
