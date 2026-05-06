import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import {
  programs,
  registerClaimCode,
  _resetClaimCodeIndex,
  type PerkProgram,
} from "@/lib/programs/store";

// Public tier is 120 req/min so 8 requests is fine, but using unique
// IPs per request keeps these tests isolated from any shared limiter
// state if other suites also hit /api/v1/claim/* in the same run.
let _ipCounter = 0;
function makeReq(code: string): NextRequest {
  _ipCounter += 1;
  return new NextRequest(
    new URL(`http://localhost:3000/api/v1/claim/${code}`),
    {
      headers: {
        "x-real-ip": `127.0.${Math.floor(_ipCounter / 256)}.${_ipCounter % 256}`,
      },
    }
  );
}

function makeCtx(code: string) {
  return { params: Promise.resolve({ code }) };
}

function fakeProgram(overrides: Partial<PerkProgram> = {}): PerkProgram {
  return {
    id: "prg-test-1",
    businessId: "b1",
    claimCode: "AAAA22",
    name: "Yoga Loyalty",
    description: "Post on Instagram, get a free class",
    status: "active",
    rules: [
      { actionId: "ig_st", platformId: "ig", pointsPerAction: 1, maxPerCycle: 1 },
    ],
    tiers: [
      { name: "Bronze", requiredActions: 1, perkValue: 10, perkType: "pct" },
      { name: "Gold", requiredActions: 3, perkValue: 25, perkType: "pct" },
    ],
    cycle: "monthly",
    cycleStartDay: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  programs.clear();
  _resetClaimCodeIndex();
});

afterEach(() => {
  programs.clear();
  _resetClaimCodeIndex();
});

describe("GET /api/v1/claim/:code", () => {
  it("returns program details for a valid claim code", async () => {
    const program = fakeProgram();
    programs.set(program.id, program);
    registerClaimCode(program.claimCode, program.id);

    const res = await GET(makeReq("AAAA22"), makeCtx("AAAA22"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.programId).toBe("prg-test-1");
    expect(body.data.claimCode).toBe("AAAA22");
    expect(body.data.businessName).toBeTruthy();
    // Top tier is the highest-required tier — Gold (3 actions, 25%).
    expect(body.data.topTier).toEqual({
      name: "Gold",
      requiredActions: 3,
      perkValue: 25,
      perkType: "pct",
    });
    // Actions array hydrates from ALL_ACTIONS metadata.
    expect(body.data.actions).toHaveLength(1);
    expect(body.data.actions[0].label).toBe("Story Tag");
    expect(body.data.actions[0].platformName).toBe("Instagram");
  });

  it("is case-insensitive on the code", async () => {
    const program = fakeProgram();
    programs.set(program.id, program);
    registerClaimCode(program.claimCode, program.id);

    const res = await GET(makeReq("aaaa22"), makeCtx("aaaa22"));
    expect(res.status).toBe(200);
  });

  it("rejects malformed codes with 400", async () => {
    const res = await GET(makeReq("BAD"), makeCtx("BAD"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_CODE");
  });

  it("rejects codes with forbidden characters", async () => {
    const res = await GET(makeReq("ABCDE0"), makeCtx("ABCDE0"));
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown codes", async () => {
    const res = await GET(makeReq("ZZZZ99"), makeCtx("ZZZZ99"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for paused programs", async () => {
    const program = fakeProgram({ status: "paused" });
    programs.set(program.id, program);
    registerClaimCode(program.claimCode, program.id);

    const res = await GET(makeReq("AAAA22"), makeCtx("AAAA22"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("PROGRAM_INACTIVE");
  });

  it("returns 404 for ended programs", async () => {
    const program = fakeProgram({ status: "ended" });
    programs.set(program.id, program);
    registerClaimCode(program.claimCode, program.id);

    const res = await GET(makeReq("AAAA22"), makeCtx("AAAA22"));
    expect(res.status).toBe(404);
  });

  it("does not leak businessId raw values when business is unknown", async () => {
    const program = fakeProgram({ businessId: "unknown-biz-id" });
    programs.set(program.id, program);
    registerClaimCode(program.claimCode, program.id);

    const res = await GET(makeReq("AAAA22"), makeCtx("AAAA22"));
    expect(res.status).toBe(200);
    const body = await res.json();
    // Falls back to a friendly placeholder rather than echoing the raw id.
    expect(body.data.businessName).toBe("A Local Business");
    expect(JSON.stringify(body.data)).not.toContain("unknown-biz-id");
  });
});
