import { describe, it, expect } from "vitest";
import { z } from "zod";
import { GET } from "../route";
import {
  partnerBusinessesResponse,
  partnerOverviewResponse,
  partnerWeekResponse,
} from "@/lib/partners/schemas";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function spec(): Promise<Json> {
  return (await GET()).json();
}

function jsonSchema(s: z.ZodType): Json {
  const out = z.toJSONSchema(s) as Json;
  delete out.$schema;
  return out;
}

function envelope(data: Json): Json {
  return {
    allOf: [{ $ref: "#/components/schemas/SuccessEnvelope" }, { type: "object", properties: { data } }],
  };
}

const EXISTING_PATHS = [
  "/health", "/pricing", "/actions", "/benchmarks", "/campaigns", "/ai/quick-start",
  "/ai/campaign-agent", "/influencers", "/submissions", "/submissions/review",
  "/agent-auth/token", "/agent-activity", "/usage", "/stats/public",
];

const PARTNER = [
  { path: "/partner/businesses", schema: partnerBusinessesResponse, params: [], codes: ["200", "401", "429"] },
  { path: "/partner/overview", schema: partnerOverviewResponse, params: ["from", "to"], codes: ["200", "400", "401", "429"] },
  { path: "/partner/businesses/{id}/week", schema: partnerWeekResponse, params: ["id", "from", "to"], codes: ["200", "400", "401", "404", "429"] },
] as const;

describe("published OpenAPI: partner paths", () => {
  it("declares the PartnerKey scheme and the Partner tag", async () => {
    const s = await spec();
    expect(s.components.securitySchemes.PartnerKey).toMatchObject({ type: "http", scheme: "bearer" });
    expect(s.components.securitySchemes.PartnerKey.description).toContain("spp_live_");
    expect(s.tags.map((t: Json) => t.name)).toContain("Partner");
  });

  it.each(PARTNER)("$path: method, security, parameters and response codes", async ({ path, params, codes }) => {
    const op = (await spec()).paths[path]?.get;
    expect(op).toBeDefined();
    expect(op.tags).toEqual(["Partner"]);
    expect(op.security).toEqual([{ PartnerKey: [] }]);
    expect((op.parameters ?? []).map((p: Json) => p.name).sort()).toEqual([...params].sort());
    for (const p of (op.parameters ?? []) as Json[]) {
      if (p.name === "id") {
        expect(p).toMatchObject({ in: "path", required: true });
      } else {
        expect(p).toMatchObject({ in: "query", required: true, schema: { type: "string", format: "date-time" } });
      }
    }
    expect(Object.keys(op.responses).sort()).toEqual([...codes]);
  });

  it.each(PARTNER)("$path: 200 schema equals the zod schema in the envelope", async ({ path, schema }) => {
    const op = (await spec()).paths[path].get;
    expect(op.responses["200"].content["application/json"].schema).toEqual(envelope(jsonSchema(schema)));
  });

  it.each(PARTNER)("$path: error responses use the error envelope", async ({ path, codes }) => {
    const op = (await spec()).paths[path].get;
    for (const c of codes.filter((c) => c !== "200")) {
      expect(op.responses[c].content["application/json"].schema).toEqual({ $ref: "#/components/schemas/ErrorEnvelope" });
    }
  });

  it("is still OpenAPI 3.1 with every existing path plus the three new ones", async () => {
    const s = await spec();
    expect(s.openapi).toBe("3.1.0");
    const keys = Object.keys(s.paths);
    for (const p of EXISTING_PATHS) expect(keys).toContain(p);
    expect(keys).toHaveLength(EXISTING_PATHS.length + 3);
    expect(JSON.stringify(s)).not.toContain('"$schema"');
  });
});
