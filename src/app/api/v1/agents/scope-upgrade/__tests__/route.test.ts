import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import { _resetScopeUpgradeStore } from "@/lib/auth/scope-upgrades";
import { _resetApiKeyStore, createApiKey } from "@/lib/auth/api-keys";
import { signJWT } from "@/lib/auth";

let _ipCounter = 0;
function makeReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  _ipCounter += 1;
  return new NextRequest(
    new URL("http://localhost:3000/api/v1/agents/scope-upgrade"),
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        "x-real-ip": `127.90.${Math.floor(_ipCounter / 256)}.${_ipCounter % 256}`,
        ...headers,
      },
    }
  );
}

let agentKey: string;

beforeEach(() => {
  _resetApiKeyStore();
  _resetScopeUpgradeStore();
  const k = createApiKey({
    businessId: "agent_upgrade_test",
    agentName: "upgrade-test",
    env: "test",
    permissions: ["read"],
    expiresAt: null,
  });
  agentKey = k.plaintext;
});

afterEach(() => {
  _resetApiKeyStore();
  _resetScopeUpgradeStore();
});

const validBody = () => ({
  requestedScopes: ["read", "write"],
  justification:
    "We're building a creator-discovery agent for Acme Brands and need write scope to place sponsorship requests on their behalf — only on programs they explicitly fund.",
});

describe("POST /api/v1/agents/scope-upgrade", () => {
  it("creates a pending request for a read-only agent key", async () => {
    const res = await POST(makeReq(validBody(), { "x-api-key": agentKey }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.status).toBe("pending");
    expect(body.data.requestId).toMatch(/^scupg_/);
    expect(body.data.requestedScopes).toEqual(["read", "write"]);
  });

  it("rejects without auth", async () => {
    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(401);
  });

  it("rejects JWT auth (humans use the dashboard)", async () => {
    const jwt = signJWT({
      sub: "user-x",
      role: "business",
      email: "h@x",
      businessId: "biz-x",
      type: "access",
    });
    const res = await POST(
      makeReq(validBody(), { authorization: `Bearer ${jwt}` })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("WRONG_AUTH_TYPE");
  });

  it("rejects too-short justification", async () => {
    const res = await POST(
      makeReq(
        { ...validBody(), justification: "I want write." },
        { "x-api-key": agentKey }
      )
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_JUSTIFICATION");
  });

  it("rejects empty requestedScopes", async () => {
    const res = await POST(
      makeReq(
        { ...validBody(), requestedScopes: [] },
        { "x-api-key": agentKey }
      )
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_SCOPES");
  });

  it("rejects unknown scope strings", async () => {
    const res = await POST(
      makeReq(
        { ...validBody(), requestedScopes: ["read", "superuser"] },
        { "x-api-key": agentKey }
      )
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_SCOPES");
  });

  it("rejects requesting fewer scopes than current", async () => {
    // Mint a key that already has write
    const promoted = createApiKey({
      businessId: "agent_promoted",
      agentName: "promoted",
      env: "test",
      permissions: ["read", "write"],
      expiresAt: null,
    });
    const res = await POST(
      makeReq(
        { ...validBody(), requestedScopes: ["read"] },
        { "x-api-key": promoted.plaintext }
      )
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_SCOPES");
  });

  it("409s on a second pending request for the same key", async () => {
    await POST(makeReq(validBody(), { "x-api-key": agentKey }));
    const res = await POST(makeReq(validBody(), { "x-api-key": agentKey }));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("ALREADY_PENDING");
  });
});
