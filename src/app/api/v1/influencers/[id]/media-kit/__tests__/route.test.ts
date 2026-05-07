import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

let _ipCounter = 0;
function makeReq(id: string): NextRequest {
  _ipCounter += 1;
  return new NextRequest(
    new URL(`http://localhost:3000/api/v1/influencers/${id}/media-kit`),
    {
      headers: {
        "x-real-ip": `127.40.${Math.floor(_ipCounter / 256)}.${_ipCounter % 256}`,
      },
    }
  );
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/v1/influencers/:id/media-kit", () => {
  it("returns a typed media kit for a known influencer", async () => {
    // i1 = Priya Eats DC (food, mid tier, IG + TikTok)
    const res = await GET(makeReq("i1"), makeCtx("i1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const kit = body.data;
    expect(kit["@context"]).toBe("https://schema.org");
    expect(kit["@type"]).toBe("Person");
    expect(kit.id).toBe("i1");
    expect(kit.displayName).toBe("Priya Eats DC");
    expect(kit.tier).toBe("mid");
    expect(kit.totalFollowers).toBe(45000);
    expect(kit.avgEngagementRate).toBe(4.2);
    expect(kit.niches).toContain("food");
  });

  it("hydrates platforms with name + url", async () => {
    const res = await GET(makeReq("i1"), makeCtx("i1"));
    const kit = (await res.json()).data;
    const ig = kit.platforms.find((p: { platformId: string }) => p.platformId === "ig");
    expect(ig).toBeTruthy();
    expect(ig.platformName).toBe("Instagram");
    expect(ig.url).toBe("https://instagram.com/priya.eats.dc");
    expect(ig.handle).toBe("@priya.eats.dc");
    expect(ig.followers).toBe(35000);
  });

  it("only prices actions on platforms the creator is on", async () => {
    // i3 = DCStyleDiary, IG only
    const res = await GET(makeReq("i3"), makeCtx("i3"));
    const kit = (await res.json()).data;
    const platforms = new Set(kit.rateCard.map((r: { platformId: string }) => r.platformId));
    expect([...platforms]).toEqual(["ig"]);
  });

  it("applies tier multipliers — mega rates exceed micro for the same action", async () => {
    // Compare a mega-tier creator's rate card against a micro-tier one
    // for the same actionId. Mega should be strictly higher (4.0 vs 1.0
    // multiplier).
    // i3 = micro (8.5k), i5 = macro (230k). The seed has no `mega` tier
    // so test macro vs micro instead.
    const microRes = await GET(makeReq("i3"), makeCtx("i3"));
    const macroRes = await GET(makeReq("i5"), makeCtx("i5"));
    const micro = (await microRes.json()).data;
    const macro = (await macroRes.json()).data;

    // Pick an action both have (IG story tag — both are on IG).
    const microIgSt = micro.rateCard.find(
      (r: { actionId: string }) => r.actionId === "ig_st"
    );
    const macroIgSt = macro.rateCard.find(
      (r: { actionId: string }) => r.actionId === "ig_st"
    );
    expect(microIgSt).toBeTruthy();
    expect(macroIgSt).toBeTruthy();
    expect(macroIgSt.rate).toBeGreaterThan(microIgSt.rate);
  });

  it("rate card is capped to keep payload size reasonable", async () => {
    const res = await GET(makeReq("i1"), makeCtx("i1"));
    const kit = (await res.json()).data;
    expect(kit.rateCard.length).toBeLessThanOrEqual(25);
  });

  it("infers industries from niches", async () => {
    const res = await GET(makeReq("i1"), makeCtx("i1")); // food blogger
    const kit = (await res.json()).data;
    expect(kit.audienceFit.industries).toContain("Food & Beverage");
  });

  it("includes agent instructions block with explicit endpoints", async () => {
    const res = await GET(makeReq("i1"), makeCtx("i1"));
    const kit = (await res.json()).data;
    expect(kit.agentInstructions.bookingEndpoint).toMatch(/orders/);
    expect(kit.agentInstructions.pricingOracle).toMatch(/\/api\/v1\/pricing/);
    expect(kit.agentInstructions.docs).toBe("/AGENTS.md");
    expect(kit.agentInstructions.schemaVersion).toBe("social-perks-media-kit-v1");
  });

  it("includes a self-referencing URL in _meta", async () => {
    const res = await GET(makeReq("i1"), makeCtx("i1"));
    const kit = (await res.json()).data;
    expect(kit._meta.selfUrl).toMatch(/\/api\/v1\/influencers\/i1\/media-kit$/);
    expect(kit._meta.format).toBe("social-perks-media-kit-v1");
  });

  it("emits cache headers for agent traffic friendliness", async () => {
    const res = await GET(makeReq("i1"), makeCtx("i1"));
    expect(res.headers.get("Cache-Control")).toMatch(/max-age=300/);
  });

  it("returns 404 for unknown ids", async () => {
    const res = await GET(makeReq("does-not-exist"), makeCtx("does-not-exist"));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("rejects malformed ids", async () => {
    const oversized = "x".repeat(100);
    const res = await GET(makeReq(oversized), makeCtx(oversized));
    expect(res.status).toBe(400);
  });
});
