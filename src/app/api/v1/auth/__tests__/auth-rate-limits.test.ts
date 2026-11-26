/**
 * The auth route's rate-limit counters.
 *
 * Sign-in, sign-up and the other actions share the strict 5-a-minute counter.
 * Session checks (GET, and POST "session") and the refresh have their own,
 * so a page that checks its session on every load cannot lock a person out
 * of signing in, and refused sign-ins cannot lock out a session check.
 * Logout counts against neither and is never refused.
 */
import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";
import { ensureUsersSeeded } from "@/lib/auth/user-store";
import { GET, POST } from "../route";

function get(ip: string): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth", {
    method: "GET",
    headers: { "x-real-ip": ip },
  });
}

function post(ip: string, body: string): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip },
    body,
  });
}

function login(ip: string): NextRequest {
  return post(
    ip,
    JSON.stringify({
      action: "login",
      email: "limit-test@example.test",
      password: "wrong-password-1",
    })
  );
}

describe("auth route rate limits", () => {
  beforeAll(async () => {
    await ensureUsersSeeded();
  });

  it("refused sign-ins do not block a session check from the same address", async () => {
    const ip = "10.79.0.1";
    for (let i = 0; i < 5; i++) expect((await POST(login(ip))).status).toBe(401);
    expect((await POST(login(ip))).status).toBe(429);
    expect((await GET(get(ip))).status).not.toBe(429);
  });

  it("session checks do not use up sign-in's five a minute", async () => {
    const ip = "10.79.0.2";
    for (let i = 0; i < 6; i++) expect((await GET(get(ip))).status).toBe(401);
    expect((await POST(login(ip))).status).toBe(401);
  });

  it("session checks sent as POST do not use up sign-in's five a minute", async () => {
    const ip = "10.79.0.7";
    for (let i = 0; i < 6; i++) {
      expect((await POST(post(ip, JSON.stringify({ action: "session" })))).status).toBe(401);
    }
    expect((await POST(login(ip))).status).toBe(401);
  });

  it("refresh attempts do not count against sign-in", async () => {
    const ip = "10.79.0.3";
    for (let i = 0; i < 6; i++) {
      expect((await POST(post(ip, JSON.stringify({ action: "refresh" })))).status).toBe(401);
    }
    expect((await POST(login(ip))).status).not.toBe(429);
  });

  it("a body that is not JSON counts as a sign-in attempt", async () => {
    const ip = "10.79.0.4";
    for (let i = 0; i < 5; i++) expect((await POST(post(ip, "not json"))).status).toBe(400);
    expect((await POST(login(ip))).status).toBe(429);
  });

  it("a JSON null body counts as a sign-in attempt", async () => {
    const ip = "10.79.0.5";
    for (let i = 0; i < 5; i++) expect((await POST(post(ip, "null"))).status).toBe(400);
    expect((await POST(login(ip))).status).toBe(429);
  });

  it("a sign-out is never refused, even once sign-in's limit is used up", async () => {
    // A refused sign-out clears no cookies, and the 7-day refresh cookie
    // would keep the person signed in.
    const ip = "10.79.0.6";
    for (let i = 0; i < 5; i++) expect((await POST(login(ip))).status).toBe(401);
    expect((await POST(login(ip))).status).toBe(429);

    const res = await POST(post(ip, JSON.stringify({ action: "logout" })));

    expect(res.status).toBe(200);
    const marker = res.headers.getSetCookie().find((line) => line.startsWith("sp-session="));
    expect(marker).toMatch(/Max-Age=0/);
  });
});
