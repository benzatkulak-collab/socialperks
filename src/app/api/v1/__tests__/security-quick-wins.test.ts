/**
 * Tests for the three security quick-wins in this PR:
 *
 *   1. /api/v1/experiments POST: admin actions now require auth.
 *      Previously the route had ZERO auth — anyone could call
 *      `create`, `start`, `results`, `auto-winner`. Public actions
 *      (`assign`, `convert`) remain unauthenticated by design but
 *      gain a strict-tier rate limit.
 *
 *   2. /api/v1/influencers GET: PII fields (email, pin) stripped
 *      from the public list response. The full SeedInfluencer shape
 *      previously leaked through.
 *
 *   3. CampaignStateMachine.recordSpend was public; now private.
 *      Architecture audit (#43) flagged this as a P0 — the only
 *      caller is checkAndSpendBudget (which holds the budget lock),
 *      so making it private closes the unlocked-spend window.
 *
 * The recordSpend test is structural — it asserts the type signature
 * no longer exposes `recordSpend` on the public surface.
 */

import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as experimentsPOST } from "../experiments/route";
import { GET as influencersGET } from "../influencers/route";
import { campaignManager } from "@/lib/campaign-state-machine";

let _ipCounter = 0;
function nextIp(): string {
  _ipCounter += 1;
  return `127.110.${Math.floor(_ipCounter / 256) % 256}.${_ipCounter % 256}`;
}

function postReq(url: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-real-ip": nextIp(),
    },
  });
}

function getReq(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    headers: { "x-real-ip": nextIp() },
  });
}

describe("Quick-win 1: /api/v1/experiments POST auth gating", () => {
  it("rejects unauthenticated `create`", async () => {
    const res = await experimentsPOST(
      postReq("/api/v1/experiments", {
        action: "create",
        name: "Test",
        variants: [
          { name: "A", weight: 50 },
          { name: "B", weight: 50 },
        ],
      })
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("NO_TOKEN");
  });

  it("rejects unauthenticated `start`", async () => {
    const res = await experimentsPOST(
      postReq("/api/v1/experiments", { action: "start", experimentId: "x" })
    );
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated `results` (was leaking business intel)", async () => {
    const res = await experimentsPOST(
      postReq("/api/v1/experiments", { action: "results", experimentId: "x" })
    );
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated `auto-winner`", async () => {
    const res = await experimentsPOST(
      postReq("/api/v1/experiments", { action: "auto-winner", experimentId: "x" })
    );
    expect(res.status).toBe(401);
  });

  it("accepts unauthenticated `assign` (legitimately public)", async () => {
    // assign + convert are called from in-page experiment runners with
    // no logged-in user — they intentionally don't require auth, just
    // strict rate limiting.
    const res = await experimentsPOST(
      postReq("/api/v1/experiments", {
        action: "assign",
        experimentId: "non-existent",
        userId: "u1",
      })
    );
    // Will likely 400 because the experiment doesn't exist, but it
    // should NOT be 401 — that would be the auth gate firing.
    expect(res.status).not.toBe(401);
  });

  it("accepts unauthenticated `convert` (legitimately public)", async () => {
    const res = await experimentsPOST(
      postReq("/api/v1/experiments", {
        action: "convert",
        experimentId: "non-existent",
        userId: "u1",
      })
    );
    expect(res.status).not.toBe(401);
  });
});

describe("Quick-win 2: /api/v1/influencers GET PII stripping", () => {
  it("does not return email field in the public list", async () => {
    const res = await influencersGET(getReq("/api/v1/influencers"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.influencers.length).toBeGreaterThan(0);
    for (const inf of body.data.influencers) {
      expect(inf.email).toBeUndefined();
      expect(inf.pin).toBeUndefined();
    }
  });

  it("still returns expected non-PII fields", async () => {
    const res = await influencersGET(getReq("/api/v1/influencers"));
    const body = await res.json();
    const first = body.data.influencers[0];
    expect(first.id).toBeTruthy();
    expect(first.displayName).toBeTruthy();
    expect(first.tier).toBeTruthy();
    expect(typeof first.followerCount).toBe("number");
  });

  it("filtering still works after PII strip", async () => {
    const res = await influencersGET(getReq("/api/v1/influencers?tier=mid"));
    const body = await res.json();
    for (const inf of body.data.influencers) {
      expect(inf.tier).toBe("mid");
      expect(inf.email).toBeUndefined();
    }
  });
});

describe("Quick-win 3: recordSpend private (architecture audit P0)", () => {
  it("recordSpend is no longer accessible to TypeScript callers", () => {
    // Architecture audit (#43) flagged that any external caller could
    // hit the unlocked recordSpend path and bypass the budget lock
    // that checkAndSpendBudget enforces. The fix marks recordSpend
    // `private` — at compile time TypeScript rejects external calls,
    // even though the method still exists on the runtime prototype.
    //
    // This @ts-expect-error fails compilation if the property becomes
    // public again, which is the actual guarantee we're protecting.
    // @ts-expect-error — recordSpend is private; calling externally is forbidden by design
    const directCall = () => campaignManager.recordSpend("x", 1);
    void directCall; // referenced so the directive doesn't get flagged unused

    // The safe entry points are still public (sanity check).
    expect(typeof campaignManager.checkAndSpendBudget).toBe("function");
    expect(typeof campaignManager.checkBudget).toBe("function");
  });
});
