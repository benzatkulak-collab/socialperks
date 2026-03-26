import { describe, it, expect } from "vitest";
import { app } from "../src/app.js";

let reqCounter = 0;
const json = (body: Record<string, unknown>) =>
  new Request("http://localhost/v1/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": `10.0.0.${++reqCounter}` },
    body: JSON.stringify(body),
  });

describe("POST /v1/auth — login", () => {
  it("logs in with valid PIN credentials", async () => {
    const res = await app.request(json({ action: "login", email: "yoga@demo.com", pin: "1234" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe("yoga@demo.com");
    expect(body.data.user.role).toBe("business_owner");
    expect(body.data).toHaveProperty("token");
    expect(body.data).toHaveProperty("accessToken");
  });

  it("rejects invalid PIN", async () => {
    const res = await app.request(json({ action: "login", email: "yoga@demo.com", pin: "9999" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects missing email", async () => {
    const res = await app.request(json({ action: "login", pin: "1234" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_CREDENTIALS");
  });

  it("rejects missing password and pin", async () => {
    const res = await app.request(json({ action: "login", email: "test@example.com" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_CREDENTIALS");
  });
});

describe("POST /v1/auth — signup", () => {
  it("creates account with valid credentials", async () => {
    const email = `test-${Date.now()}@example.com`;
    const res = await app.request(json({ action: "signup", email, password: "securepass123", name: "Test User" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe(email.toLowerCase());
    expect(body.data.user.role).toBe("business");
  });

  it("rejects weak password", async () => {
    const res = await app.request(json({ action: "signup", email: "weak@example.com", password: "short", name: "Test" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("WEAK_PASSWORD");
  });

  it("rejects missing fields", async () => {
    const res = await app.request(json({ action: "signup", email: "no-name@example.com", password: "securepass123" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_FIELDS");
  });
});

describe("POST /v1/auth — invalid action", () => {
  it("rejects unknown action", async () => {
    const res = await app.request(json({ action: "hack" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_ACTION");
  });
});

describe("GET /v1/auth — session validation", () => {
  it("rejects missing token", async () => {
    const res = await app.request("/v1/auth");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("NO_TOKEN");
  });

  it("rejects invalid token", async () => {
    const res = await app.request("/v1/auth", { headers: { Authorization: "Bearer invalid-token" } });
    expect(res.status).toBe(401);
  });
});
