import { describe, it, expect } from "vitest";
import {
  apiResponse,
  apiError,
  parsePagination,
  paginationMeta,
  requireAuth,
} from "../middleware";
import { NextRequest } from "next/server";

// ─── apiResponse ─────────────────────────────────────────────────────────────

describe("apiResponse", () => {
  it("returns success: true with the given data", async () => {
    const res = apiResponse({ id: 1, name: "test" });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: 1, name: "test" });
  });

  it("defaults to status 200", () => {
    const res = apiResponse("ok");
    expect(res.status).toBe(200);
  });

  it("respects a custom status code", () => {
    const res = apiResponse(null, 201);
    expect(res.status).toBe(201);
  });

  it("passes custom headers through", () => {
    const res = apiResponse("ok", 200, { "X-Custom": "value" });
    expect(res.headers.get("X-Custom")).toBe("value");
  });

  it("works with an empty data payload", async () => {
    const res = apiResponse(null);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeNull();
  });

  it("works with an array payload", async () => {
    const res = apiResponse([1, 2, 3]);
    const body = await res.json();
    expect(body.data).toEqual([1, 2, 3]);
  });
});

// ─── apiError ────────────────────────────────────────────────────────────────

describe("apiError", () => {
  it("returns success: false with code and message", async () => {
    const res = apiError("BAD_INPUT", "field is required");
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("BAD_INPUT");
    expect(body.error.message).toBe("field is required");
  });

  it("defaults to status 400", () => {
    const res = apiError("BAD", "bad");
    expect(res.status).toBe(400);
  });

  it("respects a custom status code", () => {
    const res = apiError("NOT_FOUND", "missing", 404);
    expect(res.status).toBe(404);
  });

  it("returns 500 for server errors", () => {
    const res = apiError("SERVER_ERROR", "oops", 500);
    expect(res.status).toBe(500);
  });
});

// ─── parsePagination ─────────────────────────────────────────────────────────

describe("parsePagination", () => {
  it("returns defaults when no params are provided", () => {
    const params = new URLSearchParams();
    const result = parsePagination(params);
    expect(result).toEqual({ page: 1, perPage: 20, offset: 0 });
  });

  it("parses valid page and perPage", () => {
    const params = new URLSearchParams({ page: "3", perPage: "10" });
    const result = parsePagination(params);
    expect(result).toEqual({ page: 3, perPage: 10, offset: 20 });
  });

  it("clamps page to minimum 1", () => {
    const params = new URLSearchParams({ page: "-5" });
    const result = parsePagination(params);
    expect(result.page).toBe(1);
  });

  it("clamps page to 1 for zero", () => {
    const params = new URLSearchParams({ page: "0" });
    const result = parsePagination(params);
    expect(result.page).toBe(1);
  });

  it("clamps perPage to minimum 1", () => {
    const params = new URLSearchParams({ perPage: "0" });
    const result = parsePagination(params);
    expect(result.perPage).toBe(1);
  });

  it("clamps perPage to maximum 100", () => {
    const params = new URLSearchParams({ perPage: "500" });
    const result = parsePagination(params);
    expect(result.perPage).toBe(100);
  });

  it("handles NaN page gracefully", () => {
    const params = new URLSearchParams({ page: "abc" });
    const result = parsePagination(params);
    expect(result.page).toBe(1);
  });

  it("handles NaN perPage gracefully", () => {
    const params = new URLSearchParams({ perPage: "xyz" });
    const result = parsePagination(params);
    expect(result.perPage).toBe(20);
  });

  it("computes offset correctly for page 5 with perPage 25", () => {
    const params = new URLSearchParams({ page: "5", perPage: "25" });
    const result = parsePagination(params);
    expect(result.offset).toBe(100);
  });
});

// ─── paginationMeta ──────────────────────────────────────────────────────────

describe("paginationMeta", () => {
  it("computes totalPages correctly", () => {
    const meta = paginationMeta(100, 1, 20);
    expect(meta.totalPages).toBe(5);
  });

  it("rounds totalPages up", () => {
    const meta = paginationMeta(101, 1, 20);
    expect(meta.totalPages).toBe(6);
  });

  it("sets hasNext correctly on a middle page", () => {
    const meta = paginationMeta(100, 3, 20);
    expect(meta.hasNext).toBe(true);
    expect(meta.hasPrev).toBe(true);
  });

  it("sets hasNext to false on the last page", () => {
    const meta = paginationMeta(100, 5, 20);
    expect(meta.hasNext).toBe(false);
  });

  it("sets hasPrev to false on the first page", () => {
    const meta = paginationMeta(100, 1, 20);
    expect(meta.hasPrev).toBe(false);
  });

  it("handles zero total", () => {
    const meta = paginationMeta(0, 1, 20);
    expect(meta.totalPages).toBe(0);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(false);
  });

  it("returns correct page and perPage in the result", () => {
    const meta = paginationMeta(50, 2, 10);
    expect(meta.page).toBe(2);
    expect(meta.perPage).toBe(10);
    expect(meta.total).toBe(50);
  });
});

// ─── requireAuth ─────────────────────────────────────────────────────────────

describe("requireAuth", () => {
  function makeRequest(headers: Record<string, string> = {}): NextRequest {
    return new NextRequest("http://localhost:3000/api/test", { headers });
  }

  it("rejects when no auth headers are present", () => {
    const result = requireAuth(makeRequest());
    expect(result.authorized).toBe(false);
    expect(result.userId).toBeNull();
    expect(result.response).toBeDefined();
  });

  it("accepts a demo-token-* Bearer token and extracts userId", () => {
    const result = requireAuth(
      makeRequest({ authorization: "Bearer demo-token-b1" })
    );
    expect(result.authorized).toBe(true);
    expect(result.userId).toBe("b1");
    expect(result.response).toBeUndefined();
  });

  it("accepts a demo token via X-API-Key header", () => {
    const result = requireAuth(
      makeRequest({ "x-api-key": "demo-token-user42" })
    );
    expect(result.authorized).toBe(true);
    expect(result.userId).toBe("user42");
  });

  it("accepts an sk_* API key and returns null userId", () => {
    const result = requireAuth(
      makeRequest({ "x-api-key": "sk_live_abc123" })
    );
    expect(result.authorized).toBe(true);
    expect(result.userId).toBeNull();
  });

  it("accepts sk_* via Bearer token", () => {
    const result = requireAuth(
      makeRequest({ authorization: "Bearer sk_test_xyz" })
    );
    expect(result.authorized).toBe(true);
    expect(result.userId).toBeNull();
  });

  it("rejects an invalid token", () => {
    const result = requireAuth(
      makeRequest({ authorization: "Bearer random-invalid-token" })
    );
    expect(result.authorized).toBe(false);
    expect(result.response).toBeDefined();
  });

  it("rejects an empty Bearer token", () => {
    const result = requireAuth(
      makeRequest({ authorization: "Bearer " })
    );
    expect(result.authorized).toBe(false);
  });

  it("prefers Bearer token over X-API-Key when both present", () => {
    const result = requireAuth(
      makeRequest({
        authorization: "Bearer demo-token-fromBearer",
        "x-api-key": "demo-token-fromKey",
      })
    );
    expect(result.authorized).toBe(true);
    expect(result.userId).toBe("fromBearer");
  });
});
