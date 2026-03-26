import { describe, it, expect } from "vitest";
import { app } from "../src/app.js";

describe("GET /v1/health", () => {
  it("returns healthy status", async () => {
    const res = await app.request("/v1/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("healthy");
  });

  it("includes version, timestamp, and uptime", async () => {
    const res = await app.request("/v1/health");
    const body = await res.json();
    expect(body.data).toHaveProperty("version");
    expect(body.data).toHaveProperty("timestamp");
    expect(body.data).toHaveProperty("uptime");
    expect(typeof body.data.uptime).toBe("number");
  });

  it("returns valid ISO timestamp", async () => {
    const res = await app.request("/v1/health");
    const body = await res.json();
    const parsed = new Date(body.data.timestamp);
    expect(parsed.toISOString()).toBe(body.data.timestamp);
  });
});

describe("GET /", () => {
  it("returns service info", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.service).toBe("social-perks-api");
    expect(body.status).toBe("ok");
  });
});
