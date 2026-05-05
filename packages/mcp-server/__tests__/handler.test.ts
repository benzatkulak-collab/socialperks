import { describe, it, expect, vi } from "vitest";
import { handle, catalog } from "../src/handler.js";

const OPTS = { apiKey: "sk_test", baseUrl: "https://example.invalid" };

describe("catalog + tools/list", () => {
  it("catalog() returns the expected tool count", () => {
    // P14 added list_campaign_goals + recommend_for_goal (10 total).
    // When future PRs add tools, bump this assertion deliberately —
    // the test is meant to fail loudly so we never ship a tool the
    // catalog doesn't surface.
    const c = catalog();
    expect(c.tools.length).toBe(10);
  });

  it("catalog includes the goal-driven tools added in P14", () => {
    const names = catalog().tools.map((t) => t.name);
    expect(names).toContain("list_campaign_goals");
    expect(names).toContain("recommend_for_goal");
  });

  it("tools/list returns same tools as catalog", async () => {
    const res = await handle({ jsonrpc: "2.0", id: 1, method: "tools/list" }, OPTS);
    const result = res.result as { tools: Array<{ name: string }> };
    expect(result.tools.map((t) => t.name).sort()).toEqual(catalog().tools.map((t) => t.name).sort());
  });
});

describe("initialize", () => {
  it("returns protocolVersion 2024-11-05", async () => {
    const res = await handle({ jsonrpc: "2.0", id: 7, method: "initialize" }, OPTS);
    expect((res.result as { protocolVersion: string }).protocolVersion).toBe("2024-11-05");
    expect(res.id).toBe(7);
  });
});

describe("tools/call", () => {
  it("unknown tool → JSON-RPC error code -32602", async () => {
    const res = await handle(
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "no_such_tool", arguments: {} } },
      OPTS,
    );
    expect(res.error?.code).toBe(-32602);
  });

  it("print_qr_poster returns the URL in structuredContent", async () => {
    // The handler always builds a fresh SocialPerks client; pass a no-op fetch
    // so any path that accidentally hits the network would explode loudly.
    const fetchMock = vi.fn();
    const res = await handle(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "print_qr_poster", arguments: { campaignId: "cmp_xyz" } },
      },
      { ...OPTS, fetch: fetchMock as unknown as typeof fetch },
    );
    const result = res.result as { structuredContent: { url: string } };
    expect(result.structuredContent.url).toContain("campaignId=cmp_xyz");
    expect(result.structuredContent.url).toContain("/api/v1/businesses/poster");
    // poster.url is sync — should not call fetch.
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("JSON-RPC envelope", () => {
  it("echoes id + sets jsonrpc:'2.0' for all responses", async () => {
    const methods = ["initialize", "tools/list", "ping"];
    for (const method of methods) {
      const res = await handle({ jsonrpc: "2.0", id: 42, method }, OPTS);
      expect(res.jsonrpc).toBe("2.0");
      expect(res.id).toBe(42);
    }
  });

  it("invalid jsonrpc version → code -32600", async () => {
    const res = await handle({ jsonrpc: "1.0", id: 1, method: "ping" }, OPTS);
    expect(res.error?.code).toBe(-32600);
  });

  it("ping returns empty result", async () => {
    const res = await handle({ jsonrpc: "2.0", id: 9, method: "ping" }, OPTS);
    expect(res.result).toEqual({});
  });

  it("unknown method → code -32601", async () => {
    const res = await handle({ jsonrpc: "2.0", id: 1, method: "no_such_method" }, OPTS);
    expect(res.error?.code).toBe(-32601);
  });
});
