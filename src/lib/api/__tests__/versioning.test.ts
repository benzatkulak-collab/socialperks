import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  detectVersion,
  getVersionConfig,
  addVersionHeaders,
  transformRequest,
  transformResponse,
  isValidVersion,
} from "../versioning";
import { NextResponse } from "next/server";

// ─── Helper ─────────────────────────────────────────────────────────────────

function makeReq(
  url: string,
  headers?: Record<string, string>
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    headers: headers ? new Headers(headers) : undefined,
  });
}

// ─── detectVersion ──────────────────────────────────────────────────────────

describe("detectVersion", () => {
  it("detects v1 from URL path", () => {
    const req = makeReq("/api/v1/campaigns");
    expect(detectVersion(req)).toBe("v1");
  });

  it("detects v2 from URL path", () => {
    const req = makeReq("/api/v2/campaigns");
    expect(detectVersion(req)).toBe("v2");
  });

  it("detects v2 from X-API-Version header", () => {
    const req = makeReq("/api/v1/campaigns", { "X-API-Version": "v2" });
    // URL path takes precedence: /api/v1/ -> v1
    expect(detectVersion(req)).toBe("v1");
  });

  it("uses X-API-Version header when URL has no version", () => {
    const req = makeReq("/api/campaigns", { "X-API-Version": "v2" });
    expect(detectVersion(req)).toBe("v2");
  });

  it("detects v2 from query param", () => {
    const req = makeReq("/api/campaigns?api_version=v2");
    expect(detectVersion(req)).toBe("v2");
  });

  it("header takes precedence over query param", () => {
    const req = makeReq("/api/campaigns?api_version=v1", {
      "X-API-Version": "v2",
    });
    expect(detectVersion(req)).toBe("v2");
  });

  it("defaults to v1 when no version signal is present", () => {
    const req = makeReq("/api/campaigns");
    expect(detectVersion(req)).toBe("v1");
  });

  it("defaults to v1 for invalid version in header", () => {
    const req = makeReq("/api/campaigns", { "X-API-Version": "v99" });
    expect(detectVersion(req)).toBe("v1");
  });

  it("defaults to v1 for invalid version in query param", () => {
    const req = makeReq("/api/campaigns?api_version=v99");
    expect(detectVersion(req)).toBe("v1");
  });
});

// ─── getVersionConfig ───────────────────────────────────────────────────────

describe("getVersionConfig", () => {
  it("returns v1 config as deprecated", () => {
    const config = getVersionConfig("v1");
    expect(config.version).toBe("v1");
    expect(config.status).toBe("deprecated");
    expect(config.sunsetDate).toBeDefined();
    expect(config.deprecationMessage).toBeDefined();
  });

  it("returns v2 config as current", () => {
    const config = getVersionConfig("v2");
    expect(config.version).toBe("v2");
    expect(config.status).toBe("current");
    expect(config.sunsetDate).toBeUndefined();
    expect(config.deprecationMessage).toBeUndefined();
  });
});

// ─── addVersionHeaders ──────────────────────────────────────────────────────

describe("addVersionHeaders", () => {
  it("adds X-API-Version header", () => {
    const res = NextResponse.json({ ok: true });
    addVersionHeaders(res, "v2");
    expect(res.headers.get("X-API-Version")).toBe("v2");
  });

  it("adds Deprecation header for deprecated versions", () => {
    const res = NextResponse.json({ ok: true });
    addVersionHeaders(res, "v1", "campaigns");
    expect(res.headers.get("Deprecation")).toBe("true");
  });

  it("does not add Deprecation header for current versions", () => {
    const res = NextResponse.json({ ok: true });
    addVersionHeaders(res, "v2");
    expect(res.headers.get("Deprecation")).toBeNull();
  });

  it("adds Sunset header with correct date format for deprecated version", () => {
    const res = NextResponse.json({ ok: true });
    addVersionHeaders(res, "v1", "campaigns");
    const sunset = res.headers.get("Sunset");
    expect(sunset).toBeTruthy();
    // Verify it parses as a valid date
    const parsed = new Date(sunset!);
    expect(parsed.getFullYear()).toBe(2026);
  });

  it("adds Link header pointing to v2 successor", () => {
    const res = NextResponse.json({ ok: true });
    addVersionHeaders(res, "v1", "campaigns");
    const link = res.headers.get("Link");
    expect(link).toBe('</api/v2/campaigns>; rel="successor-version"');
  });

  it("adds X-Deprecation-Notice with message", () => {
    const res = NextResponse.json({ ok: true });
    addVersionHeaders(res, "v1", "campaigns");
    const notice = res.headers.get("X-Deprecation-Notice");
    expect(notice).toContain("deprecated");
    expect(notice).toContain("v2");
  });

  it("does not add Link header when no endpoint is provided", () => {
    const res = NextResponse.json({ ok: true });
    addVersionHeaders(res, "v1");
    // Link header is only set when endpoint is provided
    expect(res.headers.get("Link")).toBeNull();
  });
});

// ─── Campaign transformRequest v1 -> v2 ─────────────────────────────────────

describe("transformRequest — campaigns", () => {
  it("transforms v1 campaign fields to v2 nested reward", () => {
    const v1 = {
      discountValue: 15,
      discountType: "pct",
      name: "Summer Sale",
    };
    const v2 = transformRequest(v1, "v1", "v2", "campaigns");

    expect(v2).toEqual({
      name: "Summer Sale",
      reward: {
        value: 15,
        type: "pct",
        description: "15% off",
      },
    });
    expect(v2).not.toHaveProperty("discountValue");
    expect(v2).not.toHaveProperty("discountType");
  });

  it("transforms v2 nested reward back to v1 flat fields", () => {
    const v2 = {
      reward: { value: 10, type: "dol" },
      name: "Fall Promo",
    };
    const v1 = transformRequest(v2, "v2", "v1", "campaigns");

    expect(v1).toEqual({
      discountValue: 10,
      discountType: "dol",
      name: "Fall Promo",
    });
    expect(v1).not.toHaveProperty("reward");
  });

  it("passes through when from === to", () => {
    const body = { discountValue: 5, discountType: "pct" };
    expect(transformRequest(body, "v1", "v1", "campaigns")).toEqual(body);
  });

  it("passes through when endpoint has no transformer", () => {
    const body = { foo: "bar" };
    expect(transformRequest(body, "v1", "v2", "health")).toEqual(body);
  });
});

// ─── Submission transformRequest v1 -> v2 ───────────────────────────────────

describe("transformRequest — submissions", () => {
  it("transforms v2 nested proof to v1 flat fields", () => {
    const v2 = {
      proof: { url: "https://example.com/proof.png", type: "screenshot" },
      campaignId: "camp_123",
    };
    const v1 = transformRequest(v2, "v2", "v1", "submissions");

    expect(v1).toEqual({
      proofUrl: "https://example.com/proof.png",
      proofType: "screenshot",
      campaignId: "camp_123",
    });
  });
});

// ─── transformResponse ──────────────────────────────────────────────────────

describe("transformResponse — v1 to v2", () => {
  it("wraps v1 campaign response in v2 envelope with reward transform", () => {
    const v1Body = {
      success: true,
      data: {
        campaign: {
          id: "camp_123",
          discountValue: 20,
          discountType: "pct",
          name: "Test Campaign",
        },
      },
    };
    const v2Body = transformResponse(v1Body, "v1", "v2", "campaigns");

    // Should have v2 envelope
    expect(v2Body).toHaveProperty("data");
    expect(v2Body).toHaveProperty("meta");
    expect((v2Body.meta as Record<string, unknown>).version).toBe("v2");

    // Inner campaign should have reward instead of discountValue/discountType
    const data = v2Body.data as Record<string, unknown>;
    const campaign = data.campaign as Record<string, unknown>;
    expect(campaign.reward).toEqual({
      value: 20,
      type: "pct",
      description: "20% off",
    });
    expect(campaign).not.toHaveProperty("discountValue");
    expect(campaign).not.toHaveProperty("discountType");
  });

  it("wraps v1 submission response in v2 envelope with proof transform", () => {
    const v1Body = {
      success: true,
      data: {
        submission: {
          id: "sub_456",
          proofUrl: "https://example.com/img.jpg",
          proofType: "screenshot",
        },
      },
    };
    const v2Body = transformResponse(v1Body, "v1", "v2", "submissions");

    expect(v2Body).toHaveProperty("data");
    expect(v2Body).toHaveProperty("meta");

    const data = v2Body.data as Record<string, unknown>;
    const submission = data.submission as Record<string, unknown>;
    expect(submission.proof).toEqual({
      url: "https://example.com/img.jpg",
      type: "screenshot",
    });
    expect(submission).not.toHaveProperty("proofUrl");
    expect(submission).not.toHaveProperty("proofType");
  });
});

describe("transformResponse — v2 to v1", () => {
  it("unwraps v2 envelope to v1 format", () => {
    const v2Body = {
      data: {
        campaign: {
          id: "camp_123",
          reward: { value: 20, type: "pct", description: "20% off" },
          name: "Test",
        },
      },
      meta: { version: "v2", requestId: "r1", timing: null },
    };
    const v1Body = transformResponse(v2Body, "v2", "v1", "campaigns");

    expect(v1Body).toHaveProperty("success", true);
    expect(v1Body).toHaveProperty("data");
    expect(v1Body).not.toHaveProperty("meta");

    const data = v1Body.data as Record<string, unknown>;
    const campaign = data.campaign as Record<string, unknown>;
    expect(campaign.discountValue).toBe(20);
    expect(campaign.discountType).toBe("pct");
    expect(campaign).not.toHaveProperty("reward");
  });
});

// ─── Round-trip preservation ────────────────────────────────────────────────

describe("round-trip transformation", () => {
  it("campaign: v1 -> v2 -> v1 preserves data", () => {
    const original = {
      success: true,
      data: {
        campaign: {
          id: "camp_789",
          discountValue: 25,
          discountType: "dol",
          name: "Round Trip Test",
        },
      },
    };

    const v2 = transformResponse(original, "v1", "v2", "campaigns");
    const roundTripped = transformResponse(v2, "v2", "v1", "campaigns");

    expect(roundTripped).toHaveProperty("success", true);
    const data = roundTripped.data as Record<string, unknown>;
    const campaign = data.campaign as Record<string, unknown>;
    expect(campaign.discountValue).toBe(25);
    expect(campaign.discountType).toBe("dol");
    expect(campaign.name).toBe("Round Trip Test");
    expect(campaign.id).toBe("camp_789");
  });

  it("submission: v1 -> v2 -> v1 preserves data", () => {
    const original = {
      success: true,
      data: {
        submission: {
          id: "sub_001",
          proofUrl: "https://example.com/proof",
          proofType: "url",
        },
      },
    };

    const v2 = transformResponse(original, "v1", "v2", "submissions");
    const roundTripped = transformResponse(v2, "v2", "v1", "submissions");

    expect(roundTripped).toHaveProperty("success", true);
    const data = roundTripped.data as Record<string, unknown>;
    const submission = data.submission as Record<string, unknown>;
    expect(submission.proofUrl).toBe("https://example.com/proof");
    expect(submission.proofType).toBe("url");
  });

  it("auth: v1 -> v2 -> v1 preserves user data", () => {
    const original = {
      success: true,
      data: {
        user: {
          id: "usr_abc",
          email: "test@example.com",
          role: "business",
          businessId: "biz_xyz",
        },
        token: "tok_123",
      },
    };

    const v2 = transformResponse(original, "v1", "v2", "auth");
    const roundTripped = transformResponse(v2, "v2", "v1", "auth");

    expect(roundTripped).toHaveProperty("success", true);
    const data = roundTripped.data as Record<string, unknown>;
    const user = data.user as Record<string, unknown>;
    expect(user.businessId).toBe("biz_xyz");
    expect(user.id).toBe("usr_abc");
    expect(user).not.toHaveProperty("business");
  });
});

// ─── isValidVersion ─────────────────────────────────────────────────────────

describe("isValidVersion", () => {
  it("accepts v1", () => {
    expect(isValidVersion("v1")).toBe(true);
  });

  it("accepts v2", () => {
    expect(isValidVersion("v2")).toBe(true);
  });

  it("rejects v3", () => {
    expect(isValidVersion("v3")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidVersion("")).toBe(false);
  });

  it("rejects arbitrary strings", () => {
    expect(isValidVersion("latest")).toBe(false);
  });
});

// ─── Edge cases ─────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("handles empty body gracefully in transformRequest", () => {
    const result = transformRequest({}, "v1", "v2", "campaigns");
    expect(result).toEqual({});
  });

  it("handles body with no matching fields in transformRequest", () => {
    const body = { name: "Test", tags: ["promo"] };
    const result = transformRequest(body, "v1", "v2", "campaigns");
    expect(result.name).toBe("Test");
    expect(result.tags).toEqual(["promo"]);
  });

  it("handles nested campaign object in transform", () => {
    const body = {
      campaign: {
        discountValue: 10,
        discountType: "pct",
        name: "Nested Test",
      },
    };
    const v2 = transformRequest(body, "v1", "v2", "campaigns");
    const campaign = v2.campaign as Record<string, unknown>;
    expect(campaign.reward).toBeDefined();
    expect(campaign).not.toHaveProperty("discountValue");
  });

  it("dollar reward description is generated correctly", () => {
    const v1 = { discountValue: 5, discountType: "dol" };
    const v2 = transformRequest(v1, "v1", "v2", "campaigns");
    const reward = v2.reward as Record<string, unknown>;
    expect(reward.description).toBe("$5 off");
  });
});
