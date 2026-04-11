/**
 * Integration tests for /api/v1/auth
 *
 * These tests call the route handlers directly (no HTTP server needed).
 * Each test uses a unique email to avoid collisions with the in-memory user store.
 */

import { describe, it, expect, vi } from "vitest";

// Disable rate limiting so tests are not throttled by the strict tier (5 req/min)
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 99, resetAt: Date.now() + 60000, limit: 100 }),
  rateLimitHeaders: () => ({}),
}));

import { GET, POST } from "../auth/route";
import { createRequest, parseResponse, authHeaders } from "./helpers";

describe("Auth API", () => {
  // ── Signup ──────────────────────────────────────────────────────────────────

  it("POST /auth — signup creates a new account and returns 201", async () => {
    const req = createRequest("/api/v1/auth", {
      method: "POST",
      body: {
        action: "signup",
        email: `test-auth-signup-1-${Date.now()}@example.com`,
        password: "TestPass123!",
        name: "Test User",
      },
    });
    const res = await POST(req);
    const data = await parseResponse(res);

    expect(data.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.user).toBeDefined();
    expect(data.data.token).toBeDefined();
    expect(data.data.accessToken).toBeDefined();
  });

  it("POST /auth — signup with missing fields returns 400", async () => {
    const req = createRequest("/api/v1/auth", {
      method: "POST",
      body: { action: "signup", email: "incomplete@example.com" },
    });
    const res = await POST(req);
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("MISSING_FIELDS");
  });

  it("POST /auth — signup with short password returns 400", async () => {
    const req = createRequest("/api/v1/auth", {
      method: "POST",
      body: {
        action: "signup",
        email: `test-auth-short-${Date.now()}@example.com`,
        password: "short",
        name: "Test",
      },
    });
    const res = await POST(req);
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("WEAK_PASSWORD");
  });

  it("POST /auth — signup with invalid email returns 400", async () => {
    const req = createRequest("/api/v1/auth", {
      method: "POST",
      body: {
        action: "signup",
        email: "not-an-email",
        password: "TestPass123!",
        name: "Test",
      },
    });
    const res = await POST(req);
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INVALID_EMAIL");
  });

  it("POST /auth — duplicate signup returns 409", async () => {
    const email = `test-auth-dup-${Date.now()}@example.com`;

    // First signup
    await POST(
      createRequest("/api/v1/auth", {
        method: "POST",
        body: { action: "signup", email, password: "TestPass123!", name: "First" },
      })
    );

    // Second signup with the same email
    const res = await POST(
      createRequest("/api/v1/auth", {
        method: "POST",
        body: { action: "signup", email, password: "TestPass123!", name: "Second" },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(409);
    expect(data.success).toBe(false);
  });

  // ── Login ──────────────────────────────────────────────────────────────────

  it("POST /auth — login with correct credentials returns 200 with token", async () => {
    const email = `test-auth-login-${Date.now()}@example.com`;

    // First signup
    await POST(
      createRequest("/api/v1/auth", {
        method: "POST",
        body: { action: "signup", email, password: "TestPass123!", name: "Login Test" },
      })
    );

    // Then login
    const res = await POST(
      createRequest("/api/v1/auth", {
        method: "POST",
        body: { action: "login", email, password: "TestPass123!" },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.token).toBeDefined();
    expect(data.data.accessToken).toBeDefined();
    expect(data.data.user.email).toBe(email);
  });

  it("POST /auth — login with wrong password returns 401", async () => {
    const email = `test-auth-wrongpw-${Date.now()}@example.com`;

    await POST(
      createRequest("/api/v1/auth", {
        method: "POST",
        body: { action: "signup", email, password: "TestPass123!", name: "Test" },
      })
    );

    const res = await POST(
      createRequest("/api/v1/auth", {
        method: "POST",
        body: { action: "login", email, password: "WrongPass!" },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("POST /auth — login without email returns 400", async () => {
    const res = await POST(
      createRequest("/api/v1/auth", {
        method: "POST",
        body: { action: "login", password: "TestPass123!" },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("MISSING_CREDENTIALS");
  });

  it("POST /auth — login without password or pin returns 400", async () => {
    const res = await POST(
      createRequest("/api/v1/auth", {
        method: "POST",
        body: { action: "login", email: "test@example.com" },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("MISSING_CREDENTIALS");
  });

  // ── Logout ─────────────────────────────────────────────────────────────────

  it("POST /auth — logout with valid token returns 200", async () => {
    const email = `test-auth-logout-${Date.now()}@example.com`;

    // Signup to get a token
    const signupRes = await POST(
      createRequest("/api/v1/auth", {
        method: "POST",
        body: { action: "signup", email, password: "TestPass123!", name: "Logout Test" },
      })
    );
    const signupData = await signupRes.json();
    const token = signupData.data.accessToken;

    // Logout
    const res = await POST(
      createRequest("/api/v1/auth", {
        method: "POST",
        body: { action: "logout" },
        headers: authHeaders(token),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.loggedOut).toBe(true);
  });

  // ── Session Validation (GET) ──────────────────────────────────────────────

  it("GET /auth — without token returns 401", async () => {
    const res = await GET(createRequest("/api/v1/auth"));
    const data = await parseResponse(res);

    expect(data.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("NO_TOKEN");
  });

  it("GET /auth — with valid token returns user info", async () => {
    const email = `test-auth-session-${Date.now()}@example.com`;

    // Signup
    const signupRes = await POST(
      createRequest("/api/v1/auth", {
        method: "POST",
        body: { action: "signup", email, password: "TestPass123!", name: "Session Test" },
      })
    );
    const signupData = await signupRes.json();
    const token = signupData.data.accessToken;

    // Validate session
    const res = await GET(
      createRequest("/api/v1/auth", { headers: authHeaders(token) })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.user).toBeDefined();
    expect(data.data.user.email).toBe(email);
    expect(data.data.expiresAt).toBeDefined();
  });

  it("GET /auth — with invalid token returns 401", async () => {
    const res = await GET(
      createRequest("/api/v1/auth", {
        headers: authHeaders("invalid.jwt.token"),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(401);
  });

  // ── Invalid action ────────────────────────────────────────────────────────

  it("POST /auth — invalid action returns 400", async () => {
    const res = await POST(
      createRequest("/api/v1/auth", {
        method: "POST",
        body: { action: "unknown-action" },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INVALID_ACTION");
  });

  // ── Password Reset Request ────────────────────────────────────────────────

  it("POST /auth — reset-password returns 200 regardless of email existence", async () => {
    const res = await POST(
      createRequest("/api/v1/auth", {
        method: "POST",
        body: { action: "reset-password", email: "nonexistent@example.com" },
      })
    );
    const data = await parseResponse(res);

    // Always returns success to prevent email enumeration
    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
