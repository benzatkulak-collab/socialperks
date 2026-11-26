/**
 * apiFetch renews the 15-minute access cookie on a 401.
 *
 * Sign-in sets `sp-access-token` (15 minutes) and `sp-refresh-token`
 * (7 days, sent only to /api/v1/auth). `POST /api/v1/auth {action:"refresh"}`
 * trades the second for a new first. These tests pin when apiFetch asks for
 * that, how often, and what the caller gets back.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type Answer,
  csrfToken,
  errorWith,
  expiredAccess,
  fakeApi,
  heldAnswer,
  okWith,
  refreshAccepted,
  refreshRefused,
} from "@/__tests__/helpers/fake-api";

type CsrfFetchModule = typeof import("../csrf-fetch");
let apiFetch: CsrfFetchModule["apiFetch"];

beforeEach(async () => {
  // The module keeps its CSRF token and its refresh state between calls, as
  // it does in a browser tab. Each test starts from a freshly loaded tab.
  vi.resetModules();
  ({ apiFetch } = await import("../csrf-fetch"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const campaignsUrl = "/api/v1/campaigns?businessId=biz_usr_test_1";
const campaignList = okWith({
  campaigns: [{ id: "cmp_test_1", name: "Test Coffee Story Tag", state: "active" }],
  total: 1,
  page: 1,
  perPage: 20,
  totalPages: 1,
});
const loginRefused = errorWith(401, "INVALID_CREDENTIALS", "Invalid email or password");
const csrfInvalid = errorWith(403, "CSRF_TOKEN_INVALID", "CSRF token is invalid or expired. Refresh and retry.");

/** Let every answer already queued arrive before the test goes on. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("apiFetch on a 401", () => {
  it("renews the access cookie with the refresh cookie and repeats the read", async () => {
    const api = fakeApi({
      "GET /api/v1/campaigns": [expiredAccess, campaignList],
      "POST /api/v1/auth": [refreshAccepted],
    });

    const res = await apiFetch(campaignsUrl);

    expect(res.status).toBe(200);
    expect((await res.json()).data.campaigns[0].id).toBe("cmp_test_1");
    expect(api.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
      "GET /api/v1/campaigns",
      "POST /api/v1/auth",
      "GET /api/v1/campaigns",
    ]);
    const [refresh] = api.sent("POST /api/v1/auth");
    expect(refresh.body).toEqual({ action: "refresh" });
    expect(refresh.credentials).toBe("include");
    expect(api.sent("GET /api/v1/campaigns").map((r) => r.url)).toEqual([campaignsUrl, campaignsUrl]);
  });

  it("repeats a write with the same body and a CSRF token", async () => {
    const api = fakeApi({
      "GET /api/v1/csrf": [csrfToken("csrf-test-1"), csrfToken("csrf-test-2")],
      "PUT /api/v1/campaigns": [expiredAccess, okWith({ campaign: { id: "cmp_test_1" } })],
      "POST /api/v1/auth": [refreshAccepted],
    });
    const body = JSON.stringify({ campaignId: "cmp_test_1", name: "Test Coffee Spring Promo" });

    const res = await apiFetch("/api/v1/campaigns", { method: "PUT", body });

    expect(res.status).toBe(200);
    const writes = api.sent("PUT /api/v1/campaigns");
    expect(writes).toHaveLength(2);
    for (const write of writes) {
      expect(["csrf-test-1", "csrf-test-2"]).toContain(write.headers.get("X-CSRF-Token"));
      expect(write.body).toEqual({ campaignId: "cmp_test_1", name: "Test Coffee Spring Promo" });
    }
  });

  it("gets a new CSRF token when the one it holds was issued while the cookie was gone", async () => {
    // As on the server: GET /csrf ties a token to whoever is signed in when it
    // is issued (an anonymous visitor once the cookie has gone), and a write
    // is checked against whoever is signed in when it arrives.
    let signedIn = false;
    const issueToken: Answer = () => csrfToken(signedIn ? "csrf-user" : "csrf-anon")();
    const write: Answer = (req) => {
      if (!signedIn) return expiredAccess();
      return req.headers.get("X-CSRF-Token") === "csrf-user"
        ? okWith({ campaign: { id: "cmp_test_1" } })()
        : csrfInvalid();
    };
    const api = fakeApi({
      "GET /api/v1/csrf": [issueToken, issueToken],
      "PUT /api/v1/campaigns": [write, write, write],
      "POST /api/v1/auth": [
        () => {
          signedIn = true;
          return refreshAccepted();
        },
      ],
    });

    const res = await apiFetch("/api/v1/campaigns", {
      method: "PUT",
      body: JSON.stringify({ campaignId: "cmp_test_1" }),
    });

    expect(res.status).toBe(200);
    expect(api.sent("PUT /api/v1/campaigns").at(-1)?.headers.get("X-CSRF-Token")).toBe("csrf-user");
  });

  it("shares one refresh between requests that get 401 at the same time", async () => {
    const refresh = heldAnswer();
    const api = fakeApi({
      "GET /api/v1/submissions": [expiredAccess, okWith({ submissions: [] })],
      "GET /api/v1/payouts": [expiredAccess, okWith({ account: null, payouts: [] })],
      "GET /api/v1/wallet": [expiredAccess, okWith({ wallets: [] })],
      "POST /api/v1/auth": [refresh.answer],
    });

    const pending = Promise.all([
      apiFetch("/api/v1/submissions?userId=usr_test_1"),
      apiFetch("/api/v1/payouts?influencerId=usr_test_1"),
      apiFetch("/api/v1/wallet"),
    ]);
    await settle(); // all three 401s are in; the refresh has not answered
    expect(api.sent("POST /api/v1/auth")).toHaveLength(1);

    refresh.release(await refreshAccepted());
    const results = await pending;

    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(api.sent("POST /api/v1/auth")).toHaveLength(1);
  });

  it("repeats a request that left before another call renewed the cookie, without a second refresh", async () => {
    const slow = heldAnswer();
    const api = fakeApi({
      "GET /api/v1/campaigns": [expiredAccess, campaignList],
      "GET /api/v1/submissions": [slow.answer, okWith({ submissions: [] })],
      "POST /api/v1/auth": [refreshAccepted],
    });

    const fast = apiFetch(campaignsUrl);
    const late = apiFetch("/api/v1/submissions?businessId=biz_usr_test_1");
    expect((await fast).status).toBe(200);

    slow.release(await expiredAccess()); // sent with the old cookie, answered after the renewal
    expect((await late).status).toBe(200);
    expect(api.sent("POST /api/v1/auth")).toHaveLength(1);
    expect(api.sent("GET /api/v1/submissions")).toHaveLength(2);
  });

  it("returns the original 401 when the refresh cookie is refused", async () => {
    const api = fakeApi({
      "GET /api/v1/campaigns": [expiredAccess],
      "POST /api/v1/auth": [refreshRefused],
    });

    const res = await apiFetch(campaignsUrl);

    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("NO_TOKEN");
    expect(api.sent("GET /api/v1/campaigns")).toHaveLength(1);
    expect(api.sent("POST /api/v1/auth")).toHaveLength(1);
  });

  it("returns the original 401 when the refresh request fails on the network", async () => {
    const api = fakeApi({
      "GET /api/v1/campaigns": [expiredAccess],
      "POST /api/v1/auth": [
        () => {
          throw new TypeError("Failed to fetch");
        },
      ],
    });

    const res = await apiFetch(campaignsUrl);

    expect(api.sent("POST /api/v1/auth")).toHaveLength(1);
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("NO_TOKEN");
  });

  it("repeats the request only once", async () => {
    const api = fakeApi({
      "GET /api/v1/campaigns": [expiredAccess, expiredAccess],
      "POST /api/v1/auth": [refreshAccepted],
    });

    const res = await apiFetch(campaignsUrl);

    expect(res.status).toBe(401);
    expect(api.sent("GET /api/v1/campaigns")).toHaveLength(2);
    expect(api.sent("POST /api/v1/auth")).toHaveLength(1);
  });

  it("never asks for a refresh on a 401 from the auth route itself", async () => {
    const api = fakeApi({
      "GET /api/v1/csrf": [csrfToken("csrf-test-1")],
      "POST /api/v1/auth": [loginRefused],
      "GET /api/v1/auth": [expiredAccess],
    });

    const login = await apiFetch("/api/v1/auth", {
      method: "POST",
      body: JSON.stringify({ action: "login", email: "owner@example.test", password: "not-the-password" }),
    });
    const session = await apiFetch("/api/v1/auth");

    expect(login.status).toBe(401);
    expect(session.status).toBe(401);
    expect(api.requests.filter((r) => (r.body as { action?: string } | undefined)?.action === "refresh")).toEqual([]);
  });
});

describe("apiFetch asks for a refresh at most once a minute", () => {
  // The refresh shares POST /api/v1/auth, and so its rate limit, with the
  // sign-in form: 5 a minute per address. A tab whose refresh cookie has gone
  // must not use that up.
  const start = new Date("2026-03-02T15:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(start);
  });

  it("after a refused refresh, returns 401s for the next minute without asking again", async () => {
    const api = fakeApi({
      "GET /api/v1/campaigns": [expiredAccess, expiredAccess, expiredAccess],
      "POST /api/v1/auth": [refreshRefused, refreshRefused],
    });

    expect((await apiFetch(campaignsUrl)).status).toBe(401);
    vi.setSystemTime(start + 59_000);
    expect((await apiFetch(campaignsUrl)).status).toBe(401);
    expect(api.sent("POST /api/v1/auth")).toHaveLength(1);

    vi.setSystemTime(start + 60_000);
    expect((await apiFetch(campaignsUrl)).status).toBe(401);
    expect(api.sent("POST /api/v1/auth")).toHaveLength(2);
  });

  it("returns a 401 within a minute of a renewal as it is: the new cookie was sent", async () => {
    const api = fakeApi({
      "GET /api/v1/campaigns": [expiredAccess, campaignList],
      "GET /api/v1/admin/stats": [expiredAccess],
      "POST /api/v1/auth": [refreshAccepted],
    });

    expect((await apiFetch(campaignsUrl)).status).toBe(200);
    vi.setSystemTime(start + 20_000);
    expect((await apiFetch("/api/v1/admin/stats")).status).toBe(401);

    expect(api.sent("POST /api/v1/auth")).toHaveLength(1);
    expect(api.sent("GET /api/v1/admin/stats")).toHaveLength(1);
  });

  it("renews again when the renewed cookie runs out 15 minutes later", async () => {
    const api = fakeApi({
      "GET /api/v1/campaigns": [expiredAccess, campaignList, expiredAccess, campaignList],
      "POST /api/v1/auth": [refreshAccepted, refreshAccepted],
    });

    expect((await apiFetch(campaignsUrl)).status).toBe(200);
    vi.setSystemTime(start + 15 * 60_000);
    expect((await apiFetch(campaignsUrl)).status).toBe(200);

    expect(api.sent("POST /api/v1/auth")).toHaveLength(2);
  });
});
