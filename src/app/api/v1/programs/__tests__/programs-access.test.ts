/**
 * Perk programs belong to one business. Every program route must refuse a
 * caller who is not that business, including a caller with NO business (a
 * self-signup influencer). The old check, `user.businessId && ... !== ...`,
 * waved such a caller through: they could list and create programs for any
 * business and read its members' names and emails.
 *
 * All ids, names and emails here are made up.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listPrograms, POST as createProgram } from "../route";
import { GET as listMembers, POST as enrollMember } from "../[programId]/members/route";
import { GET as getProgress } from "../[programId]/progress/route";
import { POST as submitAction } from "../[programId]/submit/route";
import { signJWT } from "@/lib/auth";
import { generateCsrfToken } from "@/lib/security/csrf";
import { programs, programMembers, _resetProgramsForTests, type PerkProgram } from "@/lib/programs/store";

const OWNER_BIZ = "biz_test_beta";
const OTHER_BIZ = "biz_test_alpha";
const PROGRAM_ID = "prog_test_beta";
const MEMBER_EMAIL = "jo.member@example.test";

let ipCounter = 0;

interface Caller {
  sub: string;
  role: string;
  businessId: string | null;
}

const influencer: Caller = { sub: "usr_test_influencer", role: "influencer", businessId: null };
const otherBusiness: Caller = { sub: "usr_test_owner_a", role: "business", businessId: OTHER_BIZ };
const owner: Caller = { sub: "usr_test_owner_b", role: "business", businessId: OWNER_BIZ };

function req(method: "GET" | "POST", path: string, who: Caller, body?: unknown): NextRequest {
  ipCounter += 1;
  const token = signJWT({ sub: who.sub, role: who.role, email: `${who.sub}@example.test`, businessId: who.businessId, type: "access" });
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    "x-nf-client-connection-ip": `10.6.0.${ipCounter}`,
  };
  if (method === "POST") {
    headers["x-csrf-token"] = generateCsrfToken(who.sub);
    headers["content-type"] = "application/json";
  }
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ctx = { params: Promise.resolve({ programId: PROGRAM_ID }) };

beforeEach(() => {
  _resetProgramsForTests();
  const now = new Date().toISOString();
  const program: PerkProgram = {
    id: PROGRAM_ID,
    businessId: OWNER_BIZ,
    name: "Test loyalty program",
    description: "",
    status: "active",
    rules: [{ actionId: "ig_st", platformId: "ig", pointsPerAction: 10, maxPerCycle: 5 }],
    tiers: [],
    cycle: "monthly",
    cycleStartDay: 1,
    createdAt: now,
    updatedAt: now,
  };
  programs.set(program.id, program);
  programMembers.set("mem_test_1", {
    id: "mem_test_1",
    programId: PROGRAM_ID,
    memberId: "member_test_1",
    name: "Jo Member",
    email: MEMBER_EMAIL,
    enrolledAt: now,
    totalPoints: 0,
    currentTier: null,
  });
});

const refused = (status: number) => status === 403 || status === 404;

describe("a caller with no business", () => {
  it("cannot list a business's programs", async () => {
    const res = await listPrograms(req("GET", `/api/v1/programs?businessId=${OWNER_BIZ}`, influencer));
    expect(refused(res.status)).toBe(true);
  });

  it("cannot create a program for a business", async () => {
    const res = await createProgram(
      req("POST", "/api/v1/programs", influencer, { businessId: OWNER_BIZ, name: "Planted program" }),
    );
    expect(refused(res.status)).toBe(true);
    expect([...programs.values()].some((p) => p.name === "Planted program")).toBe(false);
  });

  it("cannot read a program's members", async () => {
    const res = await listMembers(req("GET", `/api/v1/programs/${PROGRAM_ID}/members`, influencer), ctx);
    expect(refused(res.status)).toBe(true);
    expect(JSON.stringify(await res.json())).not.toContain(MEMBER_EMAIL);
  });

  it("cannot enroll a member", async () => {
    const res = await enrollMember(
      req("POST", `/api/v1/programs/${PROGRAM_ID}/members`, influencer, {
        memberId: "member_test_planted",
        name: "Planted Member",
        email: "planted@example.test",
      }),
      ctx,
    );
    expect(refused(res.status)).toBe(true);
  });

  it("cannot read a member's progress", async () => {
    const res = await getProgress(
      req("GET", `/api/v1/programs/${PROGRAM_ID}/progress?memberId=member_test_1`, influencer),
      ctx,
    );
    expect(refused(res.status)).toBe(true);
  });

  it("cannot submit an action for a member", async () => {
    const res = await submitAction(
      req("POST", `/api/v1/programs/${PROGRAM_ID}/submit`, influencer, {
        memberId: "member_test_1",
        actionId: "ig_st",
        platformId: "ig",
        proofUrl: "https://example.test/proof",
        proofType: "url",
      }),
      ctx,
    );
    expect(refused(res.status)).toBe(true);
  });
});

describe("another business", () => {
  it("cannot list the program's business's programs", async () => {
    const res = await listPrograms(req("GET", `/api/v1/programs?businessId=${OWNER_BIZ}`, otherBusiness));
    expect(refused(res.status)).toBe(true);
  });

  it("cannot read the program's members", async () => {
    const res = await listMembers(req("GET", `/api/v1/programs/${PROGRAM_ID}/members`, otherBusiness), ctx);
    expect(refused(res.status)).toBe(true);
  });
});

describe("the owning business", () => {
  it("lists its programs (the /programs page does)", async () => {
    const res = await listPrograms(req("GET", `/api/v1/programs?businessId=${OWNER_BIZ}`, owner));
    expect(res.status).toBe(200);
    expect((await res.json()).data.programs).toHaveLength(1);
  });

  it("creates a program", async () => {
    const res = await createProgram(req("POST", "/api/v1/programs", owner, { businessId: OWNER_BIZ, name: "New program" }));
    expect(res.status).toBe(201);
  });

  it("reads its members", async () => {
    const res = await listMembers(req("GET", `/api/v1/programs/${PROGRAM_ID}/members`, owner), ctx);
    expect(res.status).toBe(200);
    expect(JSON.stringify(await res.json())).toContain(MEMBER_EMAIL);
  });

  it("reads a member's progress", async () => {
    const res = await getProgress(req("GET", `/api/v1/programs/${PROGRAM_ID}/progress?memberId=member_test_1`, owner), ctx);
    expect(res.status).toBe(200);
  });
});
