import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import {
  captureException,
  _resetErrorTracker,
} from "@/lib/observability/error-tracker";
import { signJWT } from "@/lib/auth";

afterEach(() => {
  _resetErrorTracker();
});

let _ipCounter = 0;
function makeReq(token?: string): NextRequest {
  _ipCounter += 1;
  return new NextRequest(
    new URL("http://localhost:3000/api/v1/admin/errors"),
    {
      headers: {
        "x-real-ip": `127.42.${Math.floor(_ipCounter / 256)}.${_ipCounter % 256}`,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    }
  );
}

function adminToken(): string {
  return signJWT({
    sub: "admin-1",
    role: "admin",
    email: "admin@example.com",
    businessId: null,
    type: "access",
  });
}

function businessToken(): string {
  return signJWT({
    sub: "biz-1",
    role: "business",
    email: "biz@example.com",
    businessId: "b1",
    type: "access",
  });
}

describe("GET /api/v1/admin/errors", () => {
  it("rejects unauthenticated callers", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("rejects non-admin authenticated callers", async () => {
    const res = await GET(makeReq(businessToken()));
    expect(res.status).toBe(403);
  });

  it("returns captured errors for admin", async () => {
    captureException(new Error("boom"), { route: "/api/v1/auth" });
    captureException(new Error("crash"), { route: "/api/v1/billing/webhook" });

    const res = await GET(makeReq(adminToken()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.captures).toHaveLength(2);
    expect(body.data.captures[0].message).toBe("crash"); // newest first
  });
});
