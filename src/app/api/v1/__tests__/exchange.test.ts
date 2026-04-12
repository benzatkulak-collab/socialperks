/**
 * Integration tests for /api/v1/exchange routes
 *
 * GET /exchange/orders         — List orders (public GET, auth required for POST)
 * GET /exchange/market         — Real-time market data (public)
 * GET /exchange/opportunities  — Market opportunities (public)
 */

import { describe, it, expect, vi } from "vitest";

// Disable rate limiting so tests are not throttled
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 99, resetAt: Date.now() + 60000, limit: 100 }),
  rateLimitHeaders: () => ({}),
}));

import { GET as getOrders } from "../exchange/orders/route";
import { GET as getMarket } from "../exchange/market/route";
import { GET as getOpportunities } from "../exchange/opportunities/route";
import { createRequest, parseResponse } from "./helpers";

describe("Exchange API", () => {
  // ── Orders ───────────────────────────────────────────────────────────────────

  describe("GET /exchange/orders", () => {
    it("returns empty orders list (public, no auth needed for GET)", async () => {
      const res = await getOrders(createRequest("/api/v1/exchange/orders"));
      const data = await parseResponse(res);

      expect(data.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data.orders)).toBe(true);
      expect(data.data.pagination).toBeDefined();
      expect(typeof data.data.pagination.page).toBe("number");
      expect(typeof data.data.pagination.total).toBe("number");
    });

    it("POST /exchange/orders requires auth — returns 401 without token", async () => {
      const { POST: postOrders } = await import("../exchange/orders/route");
      const res = await postOrders(
        createRequest("/api/v1/exchange/orders", {
          method: "POST",
          body: {
            side: "buy",
            platformId: "google",
            actionId: "ggl_rv",
            quantity: 5,
            pricePerUnit: 10,
          },
        })
      );
      const data = await parseResponse(res);

      expect(data.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  // ── Market (public) ─────────────────────────────────────────────────────────

  describe("GET /exchange/market", () => {
    it("returns market data without auth (public)", async () => {
      const res = await getMarket(createRequest("/api/v1/exchange/market"));
      const data = await parseResponse(res);

      expect(data.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      // Default view is "stats"
      expect(data.data.view).toBe("stats");
      expect(data.data.market).toBeDefined();
      expect(typeof data.data.market.totalActions).toBe("number");
      expect(typeof data.data.market.totalPlatforms).toBe("number");
      expect(typeof data.data.market.totalVolume24h).toBe("number");
    });

    it("supports view=depth", async () => {
      const res = await getMarket(
        createRequest("/api/v1/exchange/market", {
          searchParams: { view: "depth" },
        })
      );
      const data = await parseResponse(res);

      expect(data.status).toBe(200);
      expect(data.data.view).toBe("depth");
      expect(Array.isArray(data.data.depth)).toBe(true);
    });

    it("rejects invalid view", async () => {
      const res = await getMarket(
        createRequest("/api/v1/exchange/market", {
          searchParams: { view: "invalid_view" },
        })
      );
      const data = await parseResponse(res);

      expect(data.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_VIEW");
    });
  });

  // ── Opportunities (public) ──────────────────────────────────────────────────

  describe("GET /exchange/opportunities", () => {
    it("returns opportunities without auth (public)", async () => {
      const res = await getOpportunities(
        createRequest("/api/v1/exchange/opportunities")
      );
      const data = await parseResponse(res);

      expect(data.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.opportunities).toBeDefined();
      expect(typeof data.data.opportunities.totalActions).toBe("number");
      expect(typeof data.data.opportunities.totalPlatforms).toBe("number");
      expect(Array.isArray(data.data.topPayingActions)).toBe(true);
      expect(Array.isArray(data.data.demandSignals)).toBe(true);
      expect(Array.isArray(data.data.platformSummaries)).toBe(true);
    });

    it("supports followerCount param for bonus calculation", async () => {
      const res = await getOpportunities(
        createRequest("/api/v1/exchange/opportunities", {
          searchParams: { followerCount: "10000" },
        })
      );
      const data = await parseResponse(res);

      expect(data.status).toBe(200);
      expect(data.data.opportunities.followerCount).toBe(10000);
      expect(data.data.opportunities.followerBonus).toBeGreaterThan(0);
    });

    it("rejects invalid platform filter", async () => {
      const res = await getOpportunities(
        createRequest("/api/v1/exchange/opportunities", {
          searchParams: { platforms: "nonexistent_platform_xyz" },
        })
      );
      const data = await parseResponse(res);

      expect(data.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_PLATFORMS");
    });
  });
});
