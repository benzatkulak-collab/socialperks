/**
 * /api/v1/drip runs (POST) and reports on (GET) the onboarding email drip for
 * EVERY account. Only the onboarding-drip cron (internal key in x-api-key) and
 * the founder may use it. Any other signed-in account used to be enough.
 *
 * The internal key here is a made-up test value.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import { signJWT } from "@/lib/auth";
import { emailProvider } from "@/lib/email";

const INTERNAL_KEY = "test-internal-key-0123456789abcdef";

let ipCounter = 0;
let send: ReturnType<typeof vi.spyOn>;
const savedEnv = { ...process.env };

function token(sub: string, role: string, businessId: string | null): string {
  return signJWT({ sub, role, email: `${sub}@example.test`, businessId, type: "access" });
}

function req(method: "GET" | "POST", headers: Record<string, string> = {}): NextRequest {
  ipCounter += 1;
  return new NextRequest("http://localhost/api/v1/drip", {
    method,
    headers: { "x-nf-client-connection-ip": `10.7.0.${ipCounter}`, ...headers },
  });
}

const bearer = (sub: string, role: string, businessId: string | null) => ({
  authorization: `Bearer ${token(sub, role, businessId)}`,
});

beforeEach(() => {
  delete process.env.DRIP_API_KEY;
  delete process.env.INTERNAL_API_KEY;
  process.env.CRON_SECRET = INTERNAL_KEY;
  send = vi.spyOn(emailProvider, "send").mockResolvedValue({ success: true, id: "test" } as never);
});

afterEach(() => {
  send.mockRestore();
  process.env = { ...savedEnv };
});

describe("POST /api/v1/drip", () => {
  it("refuses an anonymous caller (401)", async () => {
    expect((await POST(req("POST"))).status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a business and sends nothing (403)", async () => {
    const res = await POST(req("POST", bearer("usr_test_owner", "business", "biz_test_alpha")));
    expect(res.status).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses an influencer and sends nothing (403)", async () => {
    const res = await POST(req("POST", bearer("usr_test_influencer", "influencer", null)));
    expect(res.status).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });

  it("runs for the cron's internal key", async () => {
    expect((await POST(req("POST", { "x-api-key": INTERNAL_KEY }))).status).toBe(200);
  });

  it("runs for the founder", async () => {
    expect((await POST(req("POST", bearer("usr_admin_root", "admin", null)))).status).toBe(200);
  });
});

describe("GET /api/v1/drip", () => {
  it("refuses a business (403)", async () => {
    const res = await GET(req("GET", bearer("usr_test_owner", "business", "biz_test_alpha")));
    expect(res.status).toBe(403);
  });

  it("reports for the internal key and the founder", async () => {
    expect((await GET(req("GET", { "x-api-key": INTERNAL_KEY }))).status).toBe(200);
    expect((await GET(req("GET", bearer("usr_admin_root", "admin", null)))).status).toBe(200);
  });
});
