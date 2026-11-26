/**
 * Who may use /api/v1/experiments.
 *
 * Running the A/B framework (listing experiments, creating, starting, reading
 * results, picking a winner) is the founder's. Putting a visitor in a variant
 * and recording that visitor's conversion stay open: the useExperiment hook
 * calls them for whoever is on the page.
 *
 * All names and ids here are made up.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import { signJWT } from "@/lib/auth";
import { createExperiment, startExperiment, _resetStore } from "@/lib/experiments";

let ipCounter = 0;

function token(sub: string, role: string, businessId: string | null): string {
  return signJWT({ sub, role, email: `${sub}@example.test`, businessId, type: "access" });
}

function req(method: "GET" | "POST", bearer?: string, body?: unknown): NextRequest {
  ipCounter += 1;
  const headers: Record<string, string> = { "x-nf-client-connection-ip": `10.5.0.${ipCounter}` };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  return new NextRequest("http://localhost/api/v1/experiments", {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const createBody = {
  action: "create",
  name: "Test headline experiment",
  variants: [
    { name: "control", weight: 50 },
    { name: "variant", weight: 50 },
  ],
};

let runningId: string;

beforeEach(() => {
  _resetStore();
  const exp = createExperiment({
    name: "Running test experiment",
    variants: [
      { name: "control", weight: 50 },
      { name: "variant", weight: 50 },
    ],
  });
  startExperiment(exp.id);
  runningId = exp.id;
});

const business = () => token("usr_test_owner", "business", "biz_test_alpha");
const admin = () => token("usr_admin_root", "admin", null);

describe("GET /api/v1/experiments", () => {
  it("refuses an anonymous caller (401)", async () => {
    expect((await GET(req("GET"))).status).toBe(401);
  });

  it("refuses a business (403)", async () => {
    expect((await GET(req("GET", business()))).status).toBe(403);
  });

  it("lists experiments for the founder", async () => {
    const res = await GET(req("GET", admin()));
    expect(res.status).toBe(200);
    expect((await res.json()).data.total).toBe(1);
  });
});

describe("POST /api/v1/experiments — running the framework", () => {
  it("refuses an anonymous create (401)", async () => {
    expect((await POST(req("POST", undefined, createBody))).status).toBe(401);
  });

  it("refuses a business's create (403)", async () => {
    expect((await POST(req("POST", business(), createBody))).status).toBe(403);
  });

  it("refuses anonymous start, results and auto-winner (401)", async () => {
    for (const action of ["start", "results", "auto-winner"]) {
      const res = await POST(req("POST", undefined, { action, experimentId: runningId }));
      expect(res.status, action).toBe(401);
    }
  });

  it("lets the founder create", async () => {
    expect((await POST(req("POST", admin(), createBody))).status).toBe(201);
  });
});

describe("POST /api/v1/experiments — visitor bucketing stays open", () => {
  it("assigns an anonymous visitor to a variant", async () => {
    const res = await POST(req("POST", undefined, { action: "assign", experimentId: runningId, userId: "visitor_test_1" }));
    expect(res.status).toBe(200);
  });

  it("records an anonymous visitor's conversion", async () => {
    await POST(req("POST", undefined, { action: "assign", experimentId: runningId, userId: "visitor_test_2" }));
    const res = await POST(req("POST", undefined, { action: "convert", experimentId: runningId, userId: "visitor_test_2" }));
    expect(res.status).toBe(200);
  });
});
