/**
 * An API key's permissions are enforced. The dashboard mints a key with
 * "read" and, only if the owner ticks it, "write"; the agent OAuth flow maps
 * read.* scopes to "read" and the rest to "write". A key without "write" (or
 * "admin") may read but not change anything: any request other than GET, HEAD
 * or OPTIONS is refused with 403 API_KEY_READ_ONLY. Before this, permissions
 * were stored and shown but never checked.
 *
 * All ids and URLs here are made up.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listWebhooks, POST as registerWebhook } from "../webhooks/route";
import { createApiKey, _resetApiKeyStore } from "@/lib/auth/api-keys";

const BIZ = "biz_test_keys";

let ipCounter = 0;

function req(method: "GET" | "POST", headers: Record<string, string>, body?: unknown): NextRequest {
  ipCounter += 1;
  return new NextRequest("http://localhost/api/v1/webhooks", {
    method,
    headers: {
      "x-nf-client-connection-ip": `10.9.0.${ipCounter}`,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const webhook = { url: "https://hooks.example.test/social-perks", events: ["campaign.created"] };

function keyWith(permissions: string[]): string {
  return createApiKey({ businessId: BIZ, agentName: `test agent ${permissions.join("+") || "none"}`, permissions }).plaintext;
}

beforeEach(() => {
  _resetApiKeyStore();
});

describe("a read-only API key", () => {
  it("cannot register a webhook (403 API_KEY_READ_ONLY), via x-api-key", async () => {
    const res = await registerWebhook(req("POST", { "x-api-key": keyWith(["read"]) }, webhook));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("API_KEY_READ_ONLY");
  });

  it("cannot register a webhook, via a Bearer header", async () => {
    const res = await registerWebhook(req("POST", { authorization: `Bearer ${keyWith(["read"])}` }, webhook));
    expect(res.status).toBe(403);
  });

  it("can still read", async () => {
    const res = await listWebhooks(req("GET", { "x-api-key": keyWith(["read"]) }));
    expect(res.status).toBe(200);
  });
});

describe("a key that may write", () => {
  it("registers a webhook with write", async () => {
    const res = await registerWebhook(req("POST", { "x-api-key": keyWith(["read", "write"]) }, webhook));
    expect(res.status).toBe(201);
  });

  it("registers a webhook with admin", async () => {
    const res = await registerWebhook(req("POST", { "x-api-key": keyWith(["admin"]) }, webhook));
    expect(res.status).toBe(201);
  });
});

describe("a key with no permissions", () => {
  it("cannot write", async () => {
    const res = await registerWebhook(req("POST", { "x-api-key": keyWith([]) }, webhook));
    expect(res.status).toBe(403);
  });
});
