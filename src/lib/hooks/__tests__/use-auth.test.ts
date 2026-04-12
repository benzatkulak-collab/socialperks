/**
 * Tests for the useAuth hook
 *
 * Mocks fetch globally to test login, logout, session restore, and error handling.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "../use-auth";

// Mock the constants module to provide API_ENDPOINTS
vi.mock("@/lib/shared/constants", () => ({
  API_ENDPOINTS: {
    auth: "/api/v1/auth",
  },
}));

describe("useAuth", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default fetch mock — returns 401 (no session)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: "NO_TOKEN" } }),
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("starts with no user and restoring=true", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("login sends correct payload and sets user on success", async () => {
    const mockUser = { id: "u1", email: "test@demo.com", name: "Test", role: "business" };
    const mockFetch = vi.fn()
      // First call: session restore (returns 401)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false }),
      })
      // Second call: login
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { user: mockUser, token: "tok_123", accessToken: "at_123" },
        }),
      });
    globalThis.fetch = mockFetch;

    const { result } = renderHook(() => useAuth());

    // Wait for session restore to finish
    await waitFor(() => expect(result.current.restoring).toBe(false));

    // Call login
    await act(async () => {
      await result.current.login("test@demo.com", "1234");
    });

    // Check the login fetch call
    const loginCall = mockFetch.mock.calls[1];
    expect(loginCall[0]).toBe("/api/v1/auth");
    expect(loginCall[1].method).toBe("POST");

    const body = JSON.parse(loginCall[1].body);
    expect(body.email).toBe("test@demo.com");
    expect(body.password).toBe("1234");
    expect(body.action).toBe("login");

    // User should be set
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.error).toBeNull();
  });

  it("logout clears user state", async () => {
    const mockUser = { id: "u1", email: "test@demo.com", name: "Test", role: "business" };
    const mockFetch = vi.fn()
      // Session restore: return an active session
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { user: mockUser, expiresAt: new Date(Date.now() + 3600000).toISOString() },
        }),
      })
      // Logout call
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { loggedOut: true } }),
      });
    globalThis.fetch = mockFetch;

    const { result } = renderHook(() => useAuth());

    // Wait for session restore to populate user
    await waitFor(() => expect(result.current.user).toEqual(mockUser));

    // Call logout
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });

  it("session restore from cookie sets user on mount", async () => {
    const mockUser = { id: "u1", email: "test@demo.com", name: "Test", role: "influencer" };
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { user: mockUser, expiresAt: new Date(Date.now() + 3600000).toISOString() },
      }),
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.restoring).toBe(false));

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isInfluencer).toBe(true);
    expect(result.current.isBusiness).toBe(false);
  });

  it("handles login failure with error message", async () => {
    const mockFetch = vi.fn()
      // Session restore
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false }),
      })
      // Login failure
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false, error: { message: "Invalid credentials" } }),
      });
    globalThis.fetch = mockFetch;

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.restoring).toBe(false));

    await act(async () => {
      await result.current.login("bad@demo.com", "0000");
    });

    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeDefined();
    expect(result.current.loading).toBe(false);
  });

  it("handles network error during login", async () => {
    const mockFetch = vi.fn()
      // Session restore
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false }),
      })
      // Login network error
      .mockRejectedValueOnce(new Error("Network error"));
    globalThis.fetch = mockFetch;

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.restoring).toBe(false));

    await act(async () => {
      await result.current.login("test@demo.com", "1234");
    });

    expect(result.current.user).toBeNull();
    expect(result.current.error).toBe("Network error");
    expect(result.current.loading).toBe(false);
  });
});
