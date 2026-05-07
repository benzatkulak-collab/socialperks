import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import { _resetApiKeyStore, verifyApiKey } from "@/lib/auth/api-keys";

let _ipCounter = 0;
function makeReq(body: unknown): NextRequest {
  _ipCounter += 1;
  return new NextRequest(
    new URL("http://localhost:3000/api/v1/agents/register"),
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        // Unique IP per request — strict-tier limiter is 5/min/IP.
        "x-real-ip": `127.30.${Math.floor(_ipCounter / 256)}.${_ipCounter % 256}`,
      },
    }
  );
}

const validBody = () => ({
  agentName: "Acme Booking Agent",
  contactEmail: "ops@acme.example",
  purposeStatement: "Search creators by niche and place sponsorship requests on behalf of Acme clients.",
  homepage: "https://acme.example/agent",
});

beforeEach(() => {
  _resetApiKeyStore();
});

afterEach(() => {
  _resetApiKeyStore();
});

describe("POST /api/v1/agents/register", () => {
  it("issues a usable read-only API key for a valid registration", async () => {
    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.apiKey).toMatch(/^sp_(live|test)_/);
    expect(body.data.agentId).toMatch(/^agent_/);
    expect(body.data.businessId).toMatch(/^agent_/);
    expect(body.data.scopes).toEqual(["read"]);
    expect(body.data.warning).toMatch(/only shown ONCE/);

    // The returned key actually verifies — confirms the round-trip works.
    const record = verifyApiKey(body.data.apiKey);
    expect(record).not.toBeNull();
    expect(record!.permissions).toEqual(["read"]);
    expect(record!.businessId).toBe(body.data.agentId);
  });

  it("homepage is optional", async () => {
    const { homepage: _h, ...rest } = validBody();
    const res = await POST(makeReq(rest));
    expect(res.status).toBe(201);
  });

  it("rejects an empty agentName", async () => {
    const res = await POST(makeReq({ ...validBody(), agentName: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_AGENT_NAME");
  });

  it("rejects an agentName with control characters", async () => {
    const res = await POST(makeReq({ ...validBody(), agentName: "Bad\x00Name" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_AGENT_NAME");
  });

  it("rejects too-short purposeStatement", async () => {
    const res = await POST(makeReq({ ...validBody(), purposeStatement: "short" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_PURPOSE");
  });

  it("rejects too-long purposeStatement", async () => {
    const res = await POST(
      makeReq({ ...validBody(), purposeStatement: "x".repeat(501) })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_PURPOSE");
  });

  it("rejects malformed contactEmail", async () => {
    const res = await POST(makeReq({ ...validBody(), contactEmail: "not-an-email" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_CONTACT_EMAIL");
  });

  it("rejects non-http homepage", async () => {
    const res = await POST(makeReq({ ...validBody(), homepage: "ftp://nope.example" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_HOMEPAGE");
  });

  it("rejects unparseable homepage", async () => {
    const res = await POST(makeReq({ ...validBody(), homepage: "not a url" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_HOMEPAGE");
  });

  it("each registration gets a distinct agentId", async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeReq(validBody()));
      const body = await res.json();
      ids.add(body.data.agentId);
    }
    expect(ids.size).toBe(5);
  });

  it("returned key authenticates via getUser as role=agent with read scope", async () => {
    const res = await POST(makeReq(validBody()));
    const body = await res.json();
    const apiKey = body.data.apiKey as string;

    // Hit the same _shared.getUser code path with the issued key.
    const { getUser } = await import("../../../_shared");
    const probeReq = new NextRequest(new URL("http://localhost:3000/api/v1/health"), {
      headers: { "x-api-key": apiKey },
    });
    const user = getUser(probeReq);
    expect(user).not.toBeNull();
    expect(user!.role).toBe("agent");
    expect(user!.businessId).toBe(body.data.agentId);
    expect(user!.permissions).toEqual(["read"]);
    expect(user!.id).toMatch(/^api-key:/);
  });
});
