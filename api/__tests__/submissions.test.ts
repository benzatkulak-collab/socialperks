import { describe, it, expect } from "vitest";
import { app } from "../src/app.js";

let reqCounter = 100;
const post = (path: string, body: Record<string, unknown>) =>
  app.request(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer demo-token-test",
      "X-Forwarded-For": `10.1.0.${++reqCounter}`,
    },
    body: JSON.stringify(body),
  });

describe("POST /v1/submissions", () => {
  it("rejects missing required fields", async () => {
    const res = await post("/v1/submissions", { campaignId: "c1" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_FIELDS");
  });

  it("rejects invalid proofType", async () => {
    const res = await post("/v1/submissions", {
      campaignId: "c1", userId: "test", actionId: "ig_post",
      proofUrl: "https://example.com", proofType: "telepathy",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_PROOF_TYPE");
  });

  it("requires authentication", async () => {
    const res = await app.request("/v1/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: "c1", userId: "test", actionId: "ig_post", proofUrl: "https://example.com", proofType: "url" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /v1/submissions/review", () => {
  it("rejects missing fields", async () => {
    const res = await post("/v1/submissions/review", { submissionId: "s1" });
    expect(res.status).toBe(400);
  });

  it("rejects invalid decision", async () => {
    const res = await post("/v1/submissions/review", {
      submissionId: "s1", reviewerId: "r1", decision: "maybe",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_DECISION");
  });

  it("returns 404 for non-existent submission", async () => {
    // reviewerId must match the authenticated user (demo-token-test → "test")
    const res = await post("/v1/submissions/review", {
      submissionId: "nonexistent", reviewerId: "test", decision: "approve",
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /v1/submissions", () => {
  it("accepts valid status filter", async () => {
    const res = await app.request("/v1/submissions?status=pending");
    expect(res.status).toBe(200);
  });

  it("rejects invalid status filter", async () => {
    const res = await app.request("/v1/submissions?status=invalid");
    expect(res.status).toBe(400);
  });
});
