import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

let _ipCounter = 0;
function makeReq(qs = ""): NextRequest {
  _ipCounter += 1;
  return new NextRequest(
    new URL(`http://localhost:3000/api/v1/exchange/market${qs}`),
    {
      headers: {
        "x-real-ip": `127.50.${Math.floor(_ipCounter / 256)}.${_ipCounter % 256}`,
      },
    }
  );
}

afterEach(() => {
  delete process.env.EXCHANGE_LIVE;
});

describe("GET /api/v1/exchange/market — data honesty meta block", () => {
  it("default stats view carries mode: demo + disclaimer", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.meta.mode).toBe("demo");
    expect(body.data.meta.dataSource).toBe("synthetic_seeded");
    expect(body.data.meta.disclaimer).toMatch(/synthetic/);
    expect(body.data.meta.disclaimer).toMatch(/\/api\/v1\/pricing/);
    expect(body.data.meta.oracleEndpoint).toBe("/api/v1/pricing");
    expect(body.data.meta.schemaVersion).toBe("social-perks-market-v1");
  });

  it("depth view carries the meta block", async () => {
    const res = await GET(makeReq("?view=depth"));
    const body = await res.json();
    expect(body.data.meta.mode).toBe("demo");
    expect(body.data.meta.disclaimer).toMatch(/synthetic/);
    expect(body.data.view).toBe("depth");
    expect(Array.isArray(body.data.depth)).toBe(true);
  });

  it("movers view carries the meta block", async () => {
    const res = await GET(makeReq("?view=movers"));
    const body = await res.json();
    expect(body.data.meta.mode).toBe("demo");
    expect(body.data.meta.disclaimer).toMatch(/synthetic/);
    expect(body.data.view).toBe("movers");
  });

  it("history view carries the meta block", async () => {
    const res = await GET(makeReq("?view=history&hours=12"));
    const body = await res.json();
    expect(body.data.meta.mode).toBe("demo");
    expect(body.data.meta.disclaimer).toMatch(/synthetic/);
    expect(body.data.view).toBe("history");
  });

  it("flips to mode: live and drops the disclaimer when EXCHANGE_LIVE=1", async () => {
    process.env.EXCHANGE_LIVE = "1";
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.data.meta.mode).toBe("live");
    expect(body.data.meta.dataSource).toBe("live_orderbook");
    expect(body.data.meta.disclaimer).toBeUndefined();
  });

  it("invalid view is still rejected with 400", async () => {
    const res = await GET(makeReq("?view=invalid"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_VIEW");
  });

  it("emits Cache-Control: 60s", async () => {
    const res = await GET(makeReq());
    expect(res.headers.get("Cache-Control")).toMatch(/s-maxage=60/);
  });

  it("schemaVersion is stable across views (so agents can pin it)", async () => {
    const versions = await Promise.all(
      ["?view=stats", "?view=depth", "?view=movers", "?view=history"].map(async (q) => {
        const res = await GET(makeReq(q));
        const body = await res.json();
        return body.data.meta.schemaVersion;
      })
    );
    expect(new Set(versions).size).toBe(1);
    expect(versions[0]).toBe("social-perks-market-v1");
  });
});
