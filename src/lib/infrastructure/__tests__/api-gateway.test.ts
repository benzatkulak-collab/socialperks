import { describe, it, expect, beforeEach } from "vitest";
import {
  OpenAPIGenerator,
  APIVersionManager,
  APIKeyRateLimiter,
  UsageMeter,
  SDKGenerator,
  type EndpointSpec,
} from "../api-gateway";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSampleEndpoint(overrides: Partial<EndpointSpec> = {}): EndpointSpec {
  return {
    path: "/campaigns",
    method: "GET",
    summary: "List campaigns",
    description: "Retrieve all campaigns for the authenticated business.",
    tags: ["Campaigns"],
    auth: true,
    parameters: [
      {
        name: "businessId",
        in: "query",
        required: true,
        description: "Business ID",
        schema: { type: "string" },
      },
    ],
    requestBody: undefined,
    responses: {
      "200": { description: "Success", schema: { type: "array", items: { type: "object" } } },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 100, window: "1h" },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OpenAPIGenerator
// ═══════════════════════════════════════════════════════════════════════════════

describe("OpenAPIGenerator", () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it("addEndpoint registers an endpoint", () => {
    generator.addEndpoint(makeSampleEndpoint());
    const spec = generator.generate();
    expect(spec.paths["/campaigns"]).toBeDefined();
    expect(spec.paths["/campaigns"]["get"]).toBeDefined();
  });

  it("generate produces valid OpenAPI 3.1.0 structure", () => {
    generator.addEndpoint(makeSampleEndpoint());
    generator.addEndpoint(
      makeSampleEndpoint({
        path: "/campaigns",
        method: "POST",
        summary: "Create campaign",
        description: "Create a new campaign.",
        requestBody: {
          type: "object",
          properties: {
            name: { type: "string" },
            tier: { type: "string", enum: ["essential", "premium"] },
          },
          required: ["name"],
        },
      }),
    );

    const spec = generator.generate();
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("Social Perks API");
    expect(spec.info.version).toBe("1.0.0");
    expect(spec.servers.length).toBeGreaterThan(0);
    expect(spec.paths["/campaigns"]["get"]).toBeDefined();
    expect(spec.paths["/campaigns"]["post"]).toBeDefined();
    expect(spec.components.securitySchemes).toBeDefined();
    expect(spec.tags.length).toBeGreaterThan(0);
  });

  it("generate includes tags from endpoints", () => {
    generator.addEndpoint(makeSampleEndpoint({ tags: ["Campaigns"] }));
    generator.addEndpoint(
      makeSampleEndpoint({ path: "/influencers", tags: ["Influencers"] }),
    );

    const spec = generator.generate();
    const tagNames = spec.tags.map((t) => t.name);
    expect(tagNames).toContain("Campaigns");
    expect(tagNames).toContain("Influencers");
  });

  it("validate catches invalid endpoint specs", () => {
    const result = generator.validate({
      path: "",
      method: "GET",
      summary: "",
      description: "",
      tags: [],
      auth: false,
      parameters: [],
      responses: {},
      rateLimit: { requests: 0, window: "" },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("validate passes for valid endpoint", () => {
    const result = generator.validate(makeSampleEndpoint());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// APIVersionManager
// ═══════════════════════════════════════════════════════════════════════════════

describe("APIVersionManager", () => {
  let versionManager: APIVersionManager;

  beforeEach(() => {
    versionManager = new APIVersionManager();
    versionManager.registerVersion("1.0.0", {
      releaseDate: "2024-01-01",
      routes: [
        {
          path: "/campaigns",
          method: "GET",
          handler: "listCampaigns_v1",
          addedIn: "1.0.0",
        },
      ],
    });
    versionManager.registerVersion("2.0.0", {
      releaseDate: "2024-06-01",
      routes: [
        {
          path: "/campaigns",
          method: "GET",
          handler: "listCampaigns_v2",
          addedIn: "1.0.0",
          changelog: "Enhanced response format",
        },
        {
          path: "/campaigns/analytics",
          method: "GET",
          handler: "campaignAnalytics_v2",
          addedIn: "2.0.0",
        },
      ],
    });
  });

  it("registerVersion stores version config", () => {
    expect(versionManager.getVersion("1.0.0")).toBeDefined();
    expect(versionManager.getVersion("2.0.0")).toBeDefined();
  });

  it("resolveVersion from URL path", () => {
    const version = versionManager.resolveVersion({
      url: "https://api.example.com/v1/campaigns",
    });
    expect(version).toBe("1.0.0");
  });

  it("resolveVersion from URL with v2", () => {
    const version = versionManager.resolveVersion({
      url: "https://api.example.com/v2/campaigns",
    });
    expect(version).toBe("2.0.0");
  });

  it("resolveVersion from Accept header", () => {
    const version = versionManager.resolveVersion({
      url: "https://api.example.com/campaigns",
      headers: { accept: "application/vnd.socialperks.v2+json" },
    });
    expect(version).toBe("2.0.0");
  });

  it("resolveVersion from X-API-Version header", () => {
    const version = versionManager.resolveVersion({
      url: "https://api.example.com/campaigns",
      headers: { "x-api-version": "1.0.0" },
    });
    expect(version).toBe("1.0.0");
  });

  it("resolveVersion defaults to latest when no match", () => {
    const version = versionManager.resolveVersion({
      url: "https://api.example.com/campaigns",
    });
    expect(version).toBe("2.0.0");
  });

  it("getChangelog detects added routes between versions", () => {
    const changes = versionManager.getChangelog("1.0.0", "2.0.0");
    const added = changes.filter((c) => c.type === "added");
    expect(added.length).toBeGreaterThan(0);
    expect(added.some((c) => c.path === "/campaigns/analytics")).toBe(true);
  });

  it("getAllVersions returns sorted versions", () => {
    const versions = versionManager.getAllVersions();
    expect(versions).toHaveLength(2);
    expect(versions[0].version).toBe("2.0.0");
    expect(versions[1].version).toBe("1.0.0");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// APIKeyRateLimiter
// ═══════════════════════════════════════════════════════════════════════════════

describe("APIKeyRateLimiter", () => {
  let limiter: APIKeyRateLimiter;

  beforeEach(() => {
    limiter = new APIKeyRateLimiter();
  });

  it("checkLimit allows requests within limit", () => {
    limiter.registerKey("key_1", "starter"); // 100 req/hour
    const result = limiter.checkLimit("key_1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(100);
    expect(result.limit).toBe(100);
  });

  it("recordRequest decrements remaining", () => {
    limiter.registerKey("key_1", "starter");
    const r1 = limiter.recordRequest("key_1");
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(99);

    const r2 = limiter.recordRequest("key_1");
    expect(r2.remaining).toBe(98);
  });

  it("blocks when rate limit exceeded", () => {
    limiter.registerKey("key_1", "starter"); // 100 limit
    // Exhaust the limit
    for (let i = 0; i < 100; i++) {
      limiter.recordRequest("key_1");
    }

    const result = limiter.recordRequest("key_1");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("enterprise plan has higher limit", () => {
    limiter.registerKey("ent_key", "enterprise"); // 10000 limit
    const result = limiter.checkLimit("ent_key");
    expect(result.limit).toBe(10000);
    expect(result.remaining).toBe(10000);
  });

  it("getUsage returns plan info and counts", () => {
    limiter.registerKey("key_1", "professional");
    limiter.recordRequest("key_1");
    limiter.recordRequest("key_1");

    const usage = limiter.getUsage("key_1");
    expect(usage.plan).toBe("professional");
    expect(usage.used).toBe(2);
    expect(usage.limit).toBe(1000);
    expect(usage.remaining).toBe(998);
  });

  it("auto-creates bucket for unknown key with starter plan", () => {
    const result = limiter.checkLimit("new_key");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(100); // default starter
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// UsageMeter
// ═══════════════════════════════════════════════════════════════════════════════

describe("UsageMeter", () => {
  let meter: UsageMeter;

  beforeEach(() => {
    meter = new UsageMeter();
  });

  it("recordAPICall stores the call record", () => {
    meter.recordAPICall("key_1", "/api/campaigns", "GET", 200, 45);
    const report = meter.getUsageReport(
      "key_1",
      new Date(Date.now() - 3600000).toISOString(),
      new Date(Date.now() + 3600000).toISOString(),
    );
    expect(report.totalCalls).toBe(1);
    expect(report.successCalls).toBe(1);
  });

  it("getUsageReport calculates statistics", () => {
    meter.recordAPICall("key_1", "/api/campaigns", "GET", 200, 30);
    meter.recordAPICall("key_1", "/api/campaigns", "GET", 200, 50);
    meter.recordAPICall("key_1", "/api/campaigns", "POST", 201, 100);
    meter.recordAPICall("key_1", "/api/campaigns", "GET", 500, 200);

    const report = meter.getUsageReport(
      "key_1",
      new Date(Date.now() - 3600000).toISOString(),
      new Date(Date.now() + 3600000).toISOString(),
    );

    expect(report.totalCalls).toBe(4);
    expect(report.successCalls).toBe(3);
    expect(report.errorCalls).toBe(1);
    expect(report.avgLatencyMs).toBeGreaterThan(0);
    expect(report.byMethod["GET"]).toBe(3);
    expect(report.byMethod["POST"]).toBe(1);
    expect(report.byStatusCode["200"]).toBe(2);
    expect(report.byStatusCode["500"]).toBe(1);
  });

  it("getUsageReport filters by apiKey", () => {
    meter.recordAPICall("key_1", "/api/a", "GET", 200, 10);
    meter.recordAPICall("key_2", "/api/b", "GET", 200, 20);

    const report = meter.getUsageReport(
      "key_1",
      new Date(Date.now() - 3600000).toISOString(),
      new Date(Date.now() + 3600000).toISOString(),
    );
    expect(report.totalCalls).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SDKGenerator
// ═══════════════════════════════════════════════════════════════════════════════

describe("SDKGenerator", () => {
  let sdkGen: SDKGenerator;
  let apiGen: OpenAPIGenerator;

  beforeEach(() => {
    sdkGen = new SDKGenerator();
    apiGen = new OpenAPIGenerator();
    apiGen.addEndpoint(makeSampleEndpoint());
    apiGen.addEndpoint(
      makeSampleEndpoint({
        path: "/campaigns",
        method: "POST",
        summary: "Create campaign",
        description: "Create a new campaign",
        requestBody: { type: "object", properties: { name: { type: "string" } } },
      }),
    );
  });

  it("generateTypeScript produces a code string", () => {
    const spec = apiGen.generate();
    const code = sdkGen.generateTypeScript(spec);
    expect(typeof code).toBe("string");
    expect(code).toContain("SocialPerksClient");
    expect(code).toContain("SocialPerksConfig");
    expect(code).toContain("ApiResponse");
    expect(code).toContain("async");
    expect(code).toContain("request");
  });

  it("generateCurl produces a curl command", () => {
    const endpoint = makeSampleEndpoint();
    const curl = sdkGen.generateCurl(endpoint);
    expect(typeof curl).toBe("string");
    expect(curl).toContain("curl -X GET");
    expect(curl).toContain("/campaigns");
    expect(curl).toContain("X-API-Key");
  });

  it("generateCurl includes request body for POST endpoints", () => {
    const endpoint = makeSampleEndpoint({
      method: "POST",
      summary: "Create campaign",
      description: "Create a campaign",
      requestBody: { type: "object", properties: { name: { type: "string" } } },
    });
    const curl = sdkGen.generateCurl(endpoint);
    expect(curl).toContain("curl -X POST");
    expect(curl).toContain("-d ");
  });
});
