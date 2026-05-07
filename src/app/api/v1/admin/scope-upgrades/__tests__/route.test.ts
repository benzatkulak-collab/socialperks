import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as listGET } from "../route";
import { POST as decidePOST } from "../[requestId]/route";
import {
  createScopeUpgradeRequest,
  _resetScopeUpgradeStore,
  getScopeUpgradeRequest,
} from "@/lib/auth/scope-upgrades";
import {
  _resetApiKeyStore,
  createApiKey,
  verifyApiKey,
} from "@/lib/auth/api-keys";
import { signJWT } from "@/lib/auth";

let _ipCounter = 0;
function nextIp(): string {
  _ipCounter += 1;
  return `127.91.${Math.floor(_ipCounter / 256)}.${_ipCounter % 256}`;
}

function adminToken(): string {
  return signJWT({
    sub: "admin-1",
    role: "admin",
    email: "a@x",
    businessId: null,
    type: "access",
  });
}

function businessToken(): string {
  return signJWT({
    sub: "biz-1",
    role: "business",
    email: "b@x",
    businessId: "biz-1",
    type: "access",
  });
}

function makeListReq(token?: string, status?: string): NextRequest {
  const url = new URL("http://localhost:3000/api/v1/admin/scope-upgrades");
  if (status) url.searchParams.set("status", status);
  return new NextRequest(url, {
    headers: {
      "x-real-ip": nextIp(),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
}

function makeDecideReq(
  requestId: string,
  body: unknown,
  token?: string
): NextRequest {
  return new NextRequest(
    new URL(`http://localhost:3000/api/v1/admin/scope-upgrades/${requestId}`),
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        "x-real-ip": nextIp(),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    }
  );
}

beforeEach(() => {
  _resetScopeUpgradeStore();
  _resetApiKeyStore();
});

afterEach(() => {
  _resetScopeUpgradeStore();
  _resetApiKeyStore();
});

const baseRequest = () => ({
  apiKeyId: "ak_test",
  agentBusinessId: "agent_test",
  currentScopes: ["read"] as const,
  requestedScopes: ["read", "write"] as const,
  justification:
    "We need write scope to place sponsorship orders on behalf of our brand client.",
});

describe("GET /api/v1/admin/scope-upgrades", () => {
  it("admin can list pending requests", async () => {
    createScopeUpgradeRequest({ ...baseRequest() });
    const res = await listGET(makeListReq(adminToken()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.requests).toHaveLength(1);
    expect(body.data.requests[0].status).toBe("pending");
  });

  it("non-admin gets 403", async () => {
    const res = await listGET(makeListReq(businessToken()));
    expect(res.status).toBe(403);
  });

  it("unauth gets 401", async () => {
    const res = await listGET(makeListReq());
    expect(res.status).toBe(401);
  });

  it("filters by status query param", async () => {
    createScopeUpgradeRequest({ ...baseRequest(), apiKeyId: "ak_a" });
    const r2 = createScopeUpgradeRequest({ ...baseRequest(), apiKeyId: "ak_b" });
    const stored = getScopeUpgradeRequest(r2.id);
    if (stored) stored.status = "approved";

    const pending = await (await listGET(makeListReq(adminToken(), "pending"))).json();
    expect(pending.data.requests).toHaveLength(1);
    const approved = await (await listGET(makeListReq(adminToken(), "approved"))).json();
    expect(approved.data.requests).toHaveLength(1);
  });

  it("rejects bad status filter", async () => {
    const res = await listGET(makeListReq(adminToken(), "bogus"));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/admin/scope-upgrades/:requestId", () => {
  it("approve widens the api-key permissions", async () => {
    // Mint a real key with read scope, then file a request against its id.
    const k = createApiKey({
      businessId: "agent_approve",
      agentName: "approve-target",
      env: "test",
      permissions: ["read"],
      expiresAt: null,
    });
    const r = createScopeUpgradeRequest({
      ...baseRequest(),
      apiKeyId: k.record.id,
      agentBusinessId: "agent_approve",
    });

    const res = await decidePOST(
      makeDecideReq(r.id, { decision: "approve" }, adminToken()),
      { params: Promise.resolve({ requestId: r.id }) }
    );
    expect(res.status).toBe(200);
    // Verify the key now has write scope
    const keyRecord = verifyApiKey(k.plaintext);
    expect(keyRecord?.permissions).toEqual(["read", "write"]);
  });

  it("reject does NOT widen permissions, requires reason", async () => {
    const k = createApiKey({
      businessId: "agent_reject",
      agentName: "reject-target",
      env: "test",
      permissions: ["read"],
      expiresAt: null,
    });
    const r = createScopeUpgradeRequest({
      ...baseRequest(),
      apiKeyId: k.record.id,
      agentBusinessId: "agent_reject",
    });

    // Reject without reason → 400
    const res1 = await decidePOST(
      makeDecideReq(r.id, { decision: "reject" }, adminToken()),
      { params: Promise.resolve({ requestId: r.id }) }
    );
    expect(res1.status).toBe(400);

    // Reject with reason → 200
    const res2 = await decidePOST(
      makeDecideReq(
        r.id,
        { decision: "reject", reason: "Insufficient justification" },
        adminToken()
      ),
      { params: Promise.resolve({ requestId: r.id }) }
    );
    expect(res2.status).toBe(200);
    // Key still read-only
    const keyRecord = verifyApiKey(k.plaintext);
    expect(keyRecord?.permissions).toEqual(["read"]);
  });

  it("non-admin gets 403", async () => {
    const r = createScopeUpgradeRequest({ ...baseRequest() });
    const res = await decidePOST(
      makeDecideReq(r.id, { decision: "approve" }, businessToken()),
      { params: Promise.resolve({ requestId: r.id }) }
    );
    expect(res.status).toBe(403);
  });

  it("404 on unknown request", async () => {
    const res = await decidePOST(
      makeDecideReq("scupg_does_not_exist", { decision: "approve" }, adminToken()),
      { params: Promise.resolve({ requestId: "scupg_does_not_exist" }) }
    );
    expect(res.status).toBe(404);
  });

  it("409 on already-decided request", async () => {
    const k = createApiKey({
      businessId: "agent_409",
      agentName: "x",
      env: "test",
      permissions: ["read"],
      expiresAt: null,
    });
    const r = createScopeUpgradeRequest({
      ...baseRequest(),
      apiKeyId: k.record.id,
      agentBusinessId: "agent_409",
    });
    await decidePOST(
      makeDecideReq(r.id, { decision: "approve" }, adminToken()),
      { params: Promise.resolve({ requestId: r.id }) }
    );
    const res2 = await decidePOST(
      makeDecideReq(
        r.id,
        { decision: "reject", reason: "trying again" },
        adminToken()
      ),
      { params: Promise.resolve({ requestId: r.id }) }
    );
    expect(res2.status).toBe(409);
  });

  it("rejects malformed decision", async () => {
    const r = createScopeUpgradeRequest({ ...baseRequest() });
    const res = await decidePOST(
      makeDecideReq(r.id, { decision: "maybe" }, adminToken()),
      { params: Promise.resolve({ requestId: r.id }) }
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_DECISION");
  });
});
