/**
 * Only an ACCESS token (15 minutes) is a credential. The REFRESH token
 * (7 days, HttpOnly cookie) may only be exchanged for a new access token at
 * POST /api/v1/auth {action: "refresh"}. It used to be accepted anywhere an
 * access token was: as a Bearer header, in the access-token cookie, and by the
 * auth route's session check.
 *
 * All ids and emails here are made up.
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as getWallet } from "../wallet/route";
import { GET as getAuth, POST as postAuth } from "../auth/route";
import { createTokenPair } from "@/lib/auth";

const tokens = createTokenPair("usr_test_token_owner", "influencer", "token.owner@example.test", null);

let ipCounter = 0;

function req(path: string, init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}): NextRequest {
  ipCounter += 1;
  return new NextRequest(`http://localhost${path}`, {
    method: init.method ?? "GET",
    headers: {
      "x-nf-client-connection-ip": `10.8.0.${ipCounter}`,
      ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

describe("a refresh token is not an access token", () => {
  it("is refused as a Bearer header (401)", async () => {
    const res = await getWallet(req("/api/v1/wallet", { headers: { authorization: `Bearer ${tokens.refreshToken}` } }));
    expect(res.status).toBe(401);
  });

  it("is refused in the access-token cookie (401)", async () => {
    const res = await getWallet(req("/api/v1/wallet", { headers: { cookie: `sp-access-token=${tokens.refreshToken}` } }));
    expect(res.status).toBe(401);
  });

  it("is refused by GET /api/v1/auth (401)", async () => {
    const res = await getAuth(req("/api/v1/auth", { headers: { authorization: `Bearer ${tokens.refreshToken}` } }));
    expect(res.status).toBe(401);
  });

  it("is refused by the session check (401)", async () => {
    const res = await postAuth(req("/api/v1/auth", { method: "POST", body: { action: "session", token: tokens.refreshToken } }));
    expect(res.status).toBe(401);
  });
});

describe("the access token and the refresh exchange still work", () => {
  it("accepts an access token as a Bearer header", async () => {
    const res = await getWallet(req("/api/v1/wallet", { headers: { authorization: `Bearer ${tokens.accessToken}` } }));
    expect(res.status).toBe(200);
  });

  it("accepts an access token in its cookie", async () => {
    const res = await getWallet(req("/api/v1/wallet", { headers: { cookie: `sp-access-token=${tokens.accessToken}` } }));
    expect(res.status).toBe(200);
  });

  it("accepts an access token at the session check", async () => {
    const res = await postAuth(req("/api/v1/auth", { method: "POST", body: { action: "session", token: tokens.accessToken } }));
    expect(res.status).toBe(200);
  });

  it("exchanges the refresh cookie for a new access token", async () => {
    const res = await postAuth(
      req("/api/v1/auth", {
        method: "POST",
        headers: { cookie: `sp-refresh-token=${tokens.refreshToken}` },
        body: { action: "refresh" },
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data.accessToken).toBeTruthy();
  });
});
