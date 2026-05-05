import { describe, it, expect, vi } from "vitest";
import { SocialPerks } from "../src/client.js";
import { SocialPerksError } from "../src/errors.js";

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

const FAST_RETRY = { attempts: 2, baseDelayMs: 1 };

describe("SocialPerks.fromEnv", () => {
  it("reads SOCIAL_PERKS_API_KEY from env", () => {
    const sp = SocialPerks.fromEnv({ SOCIAL_PERKS_API_KEY: "sk_test_x" });
    expect(sp).toBeInstanceOf(SocialPerks);
  });

  it("throws SocialPerksError when missing", () => {
    expect(() => SocialPerks.fromEnv({})).toThrow(SocialPerksError);
  });
});

describe("auth + request shape", () => {
  it("sets Bearer auth on every request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ campaigns: [] }));
    const sp = new SocialPerks({ apiKey: "sk_abc", fetch: fetchMock as unknown as typeof fetch, retry: FAST_RETRY });
    await sp.campaigns.list();
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer sk_abc" });
  });

  it("campaigns.list({status:'active'}) sends ?status=active", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ campaigns: [] }));
    const sp = new SocialPerks({ apiKey: "k", fetch: fetchMock as unknown as typeof fetch, retry: FAST_RETRY });
    await sp.campaigns.list({ status: "active" });
    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("?status=active");
  });

  it("campaigns.create() sends POST + JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "cmp_1", status: "draft" }));
    const sp = new SocialPerks({ apiKey: "k", fetch: fetchMock as unknown as typeof fetch, retry: FAST_RETRY });
    await sp.campaigns.create({ platformId: "instagram", actionId: "ig_story", rewardType: "pct", rewardValue: "15" });
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse(String((init as RequestInit).body))).toMatchObject({ platformId: "instagram" });
  });
});

describe("retry + errors", () => {
  it("retries on 429 then returns body on 200", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: "slow" }, { status: 429 }))
      .mockResolvedValueOnce(jsonResponse({ error: "slow" }, { status: 429 }))
      .mockResolvedValueOnce(jsonResponse({ campaigns: [{ id: "cmp_1" }] }));
    const sp = new SocialPerks({ apiKey: "k", fetch: fetchMock as unknown as typeof fetch, retry: FAST_RETRY });
    const out = await sp.campaigns.list();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(out).toEqual([{ id: "cmp_1" }]);
  });

  it.each([
    [401, "unauthorized"],
    [404, "not_found"],
    [500, "server"],
  ])("status %i → code %s", async (status, code) => {
    // 500 will retry per config, so use attempts:0
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: "x" }, { status }));
    const sp = new SocialPerks({ apiKey: "k", fetch: fetchMock as unknown as typeof fetch, retry: { attempts: 0, baseDelayMs: 1 } });
    await expect(sp.campaigns.list()).rejects.toMatchObject({ code, status });
  });

  it("network failure → code 'network'", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("ENOTFOUND"));
    const sp = new SocialPerks({ apiKey: "k", fetch: fetchMock as unknown as typeof fetch, retry: { attempts: 0, baseDelayMs: 1 } });
    await expect(sp.campaigns.list()).rejects.toMatchObject({ code: "network" });
  });

  it("aborts after timeoutMs → code 'timeout'", async () => {
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        }),
    );
    const sp = new SocialPerks({
      apiKey: "k",
      fetch: fetchMock as unknown as typeof fetch,
      timeoutMs: 5,
      retry: { attempts: 0, baseDelayMs: 1 },
    });
    await expect(sp.campaigns.list()).rejects.toMatchObject({ code: "timeout" });
  });
});

describe("poster.url", () => {
  it("builds the right query string", () => {
    const sp = new SocialPerks({ apiKey: "k" });
    const url = sp.poster.url({ campaignId: "cmp_123", businessName: "Maria's Coffee", perk: "15% off" });
    expect(url).toContain("campaignId=cmp_123");
    expect(url).toContain("businessName=Maria%27s+Coffee");
    expect(url).toContain("perk=15%25+off");
  });
});

describe("sms.enqueuePostPurchase", () => {
  it("hits /api/v1/sms/enqueue (production endpoint)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ queued: true, sendAt: "now" }));
    const sp = new SocialPerks({ apiKey: "k", fetch: fetchMock as unknown as typeof fetch, retry: FAST_RETRY });
    await sp.sms.enqueuePostPurchase({ businessId: "b1", campaignId: "c1", customerPhone: "+14155551234" });
    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/api/v1/sms/enqueue");
    expect(String(url)).not.toContain("/sms/test");
  });
});

describe("response unwrapping", () => {
  it("unwraps {data: ...}", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { ok: true }, meta: 1 }));
    const sp = new SocialPerks({ apiKey: "k", fetch: fetchMock as unknown as typeof fetch, retry: FAST_RETRY });
    const out = await sp.reference.health();
    expect(out).toEqual({ ok: true });
  });

  it("does not unwrap when 'data' key absent", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const sp = new SocialPerks({ apiKey: "k", fetch: fetchMock as unknown as typeof fetch, retry: FAST_RETRY });
    const out = await sp.reference.health();
    expect(out).toEqual({ ok: true });
  });
});
