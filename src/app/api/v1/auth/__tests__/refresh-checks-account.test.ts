/**
 * POST /api/v1/auth {action: "refresh"} answers from the account as it is
 * now, not from the claims the refresh token carries.
 *
 * The client renews the 15-minute access cookie on every 401 (apiFetch), so
 * the refresh is the only point where an open tab meets the account again.
 * Without these checks a suspension, a role change or the end of an
 * impersonation would never reach a tab that stays open.
 */
import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";
import { createSeedData } from "@social-perks/shared/seed";
import { createTokenPair, verifyJWT } from "@/lib/auth";
import { ensureUsersSeeded, putUser, type UserRecord } from "@/lib/auth/user-store";
import { POST as authPOST } from "../route";
import { POST as impersonatePOST } from "../../admin/impersonate/route";

// Every request comes from its own address: the auth routes share a
// 5-a-minute rate limit per address, which the tests must not trip.
let address = 0;
const nextAddress = () => `10.77.0.${++address}`;

function refreshRequest(refreshToken: string): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `sp-refresh-token=${refreshToken}`,
      "x-real-ip": nextAddress(),
    },
    body: JSON.stringify({ action: "refresh" }),
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

const owner = account({ id: "usr_test_refresh_owner", email: "refresh-owner@example.test" });
const suspended = account({
  id: "usr_test_refresh_suspended",
  email: "refresh-suspended@example.test",
  suspendedAt: "2026-03-02T09:00:00.000Z",
  suspensionReason: "test suspension",
});

beforeAll(async () => {
  await ensureUsersSeeded();
  await putUser(owner);
  await putUser(suspended);
});

describe("POST /api/v1/auth {action: refresh}", () => {
  it("builds the new access token from the account's current role and business", async () => {
    // The token still says enterprise; the account has since become business.
    const { refreshToken } = createTokenPair(owner.id, "enterprise", owner.email, "biz_test_old");

    const res = await authPOST(refreshRequest(refreshToken));

    expect(res.status).toBe(200);
    const access = verifyJWT(cookieValue(res, "sp-access-token") ?? "", "access");
    expect(access).toMatchObject({ sub: owner.id, role: "business", businessId: "biz_usr_test_refresh_owner" });
  });

  it("refuses a suspended account and clears its cookies", async () => {
    const { refreshToken } = createTokenPair(suspended.id, suspended.role, suspended.email, suspended.businessId);

    const res = await authPOST(refreshRequest(refreshToken));

    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("ACCOUNT_SUSPENDED");
    for (const name of ["sp-access-token", "sp-refresh-token", "sp-session"]) {
      expect(setCookie(res, name)).toMatch(/Max-Age=0/);
    }
  });

  it("refuses a token whose account is not on file, and leaves the refresh cookie alone", async () => {
    // Not on file may only mean this server failed to load the accounts table,
    // so the cookie stays for a server that can answer.
    const { refreshToken } = createTokenPair("usr_test_not_on_file", "business", "nobody@example.test", null);

    const res = await authPOST(refreshRequest(refreshToken));

    expect(res.status).toBe(401);
    expect(setCookie(res, "sp-refresh-token")).toBeUndefined();
    expect(setCookie(res, "sp-access-token")).toBeUndefined();
  });

  it("still renews the demo accounts development seeds", async () => {
    const demo = createSeedData().businesses[0];
    const { refreshToken } = createTokenPair(demo.id, "business", demo.email, demo.id);

    const res = await authPOST(refreshRequest(refreshToken));

    expect(res.status).toBe(200);
    expect(verifyJWT(cookieValue(res, "sp-access-token") ?? "", "access")?.sub).toBe(demo.id);
  });
});

describe("POST /api/v1/admin/impersonate", () => {
  it("gives the impersonated session no refresh cookie, so it ends with its 15 minutes", async () => {
    const adminToken = createTokenPair("usr_test_admin", "admin", "admin@example.test", null).accessToken;
    const req = new NextRequest("http://localhost/api/v1/admin/impersonate", {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": "application/json",
        "x-real-ip": nextAddress(),
      },
      body: JSON.stringify({ email: owner.email }),
    });

    const res = await impersonatePOST(req);

    expect(res.status).toBe(200);
    expect(verifyJWT(cookieValue(res, "sp-access-token") ?? "", "access")?.sub).toBe(owner.id);
    // Expired, not just left out: the admin's own refresh cookie would
    // otherwise renew the tab back into the admin's account.
    expect(cookieValue(res, "sp-refresh-token")).toBe("");
    expect(setCookie(res, "sp-refresh-token")).toMatch(/Max-Age=0/);
  });
});
