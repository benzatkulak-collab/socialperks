/**
 * Session checks (GET and POST {action: "session"}) renew the 15-minute access
 * cookie from the refresh cookie when the access cookie is gone.
 *
 * The refresh cookie is scoped to /api/v1/auth, so browsers already send it
 * with every session check; the check itself can therefore answer "signed in"
 * and set a new cookie pair, instead of answering 401 and leaving the client
 * to find that out and refresh.
 */
import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";
import { createTokenPair, verifyJWT } from "@/lib/auth";
import { ensureUsersSeeded, putUser, type UserRecord } from "@/lib/auth/user-store";
import { GET, POST } from "../route";

// Every request comes from its own address: the auth routes share a
// 5-a-minute rate limit per address, which the tests must not trip.
let address = 0;
const nextAddress = () => `10.78.0.${++address}`;

function getRequest(cookie?: string): NextRequest {
  const headers: Record<string, string> = { "x-real-ip": nextAddress() };
  if (cookie) headers.cookie = cookie;
  return new NextRequest("http://localhost/api/v1/auth", { method: "GET", headers });
}

function sessionPostRequest(cookie: string): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth", {
    method: "POST",
    headers: { "content-type": "application/json", cookie, "x-real-ip": nextAddress() },
    body: JSON.stringify({ action: "session" }),
  });
}

/** The Set-Cookie line for one cookie, or undefined when the answer sets none. */
function setCookie(res: Response, name: string): string | undefined {
  return res.headers.getSetCookie().find((line) => line.startsWith(`${name}=`));
}

function cookieValue(res: Response, name: string): string | undefined {
  return setCookie(res, name)?.split(";")[0].slice(name.length + 1);
}

function account(overrides: Partial<UserRecord> & Pick<UserRecord, "id" | "email">): UserRecord {
  return {
    name: "Test Account",
    passwordHash: "not-a-real-hash",
    role: "business",
    businessId: `biz_${overrides.id}`,
    suspendedAt: null,
    suspensionReason: null,
    createdAt: "2026-03-01T15:00:00.000Z",
    ...overrides,
  };
}

const owner = account({ id: "usr_test_renew_owner", email: "renew-owner@example.test" });
const suspended = account({
  id: "usr_test_renew_suspended",
  email: "renew-suspended@example.test",
  suspendedAt: "2026-03-02T09:00:00.000Z",
  suspensionReason: "test suspension",
});

const refreshCookieFor = (a: UserRecord) =>
  `sp-refresh-token=${createTokenPair(a.id, a.role, a.email, a.businessId).refreshToken}`;

beforeAll(async () => {
  await ensureUsersSeeded();
  await putUser(owner);
  await putUser(suspended);
});

describe("GET /api/v1/auth", () => {
  it("answers a request with only the refresh cookie as signed in, with a new cookie pair", async () => {
    const res = await GET(getRequest(refreshCookieFor(owner)));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.user.id).toBe(owner.id);
    const access = verifyJWT(cookieValue(res, "sp-access-token") ?? "", "access");
    expect(access).toMatchObject({ sub: owner.id, role: owner.role });
    expect(cookieValue(res, "sp-refresh-token")).toBeTruthy();
    expect(body.data.expiresAt).toBe(new Date((access?.exp ?? 0) * 1000).toISOString());
  });

  it("with a good access cookie sets no cookies", async () => {
    const { accessToken } = createTokenPair(owner.id, owner.role, owner.email, owner.businessId);

    const res = await GET(getRequest(`sp-access-token=${accessToken}`));

    expect(res.status).toBe(200);
    expect(setCookie(res, "sp-access-token")).toBeUndefined();
  });

  it("refuses a suspended account and clears its cookies", async () => {
    const res = await GET(getRequest(refreshCookieFor(suspended)));

    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("ACCOUNT_SUSPENDED");
    for (const name of ["sp-access-token", "sp-refresh-token", "sp-session"]) {
      expect(setCookie(res, name)).toMatch(/Max-Age=0/);
    }
  });

  it("with no cookies answers 401 NO_TOKEN as before", async () => {
    const res = await GET(getRequest());

    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("NO_TOKEN");
  });

  it("two session checks at once both answer signed in", async () => {
    const cookie = refreshCookieFor(owner);

    const [a, b] = await Promise.all([GET(getRequest(cookie)), GET(getRequest(cookie))]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
  });
});

describe("POST /api/v1/auth {action: session}", () => {
  it("renews from the refresh cookie", async () => {
    const res = await POST(sessionPostRequest(refreshCookieFor(owner)));

    expect(res.status).toBe(200);
    expect(verifyJWT(cookieValue(res, "sp-access-token") ?? "", "access")?.sub).toBe(owner.id);
  });
});
