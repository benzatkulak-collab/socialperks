/**
 * apiFetch renews the 15-minute access cookie on a 401.
 *
 * Sign-in sets `sp-access-token` (15 minutes) and `sp-refresh-token`
 * (7 days, sent only to /api/v1/auth). `POST /api/v1/auth {action:"refresh"}`
 * trades the second for a new first. These tests pin when apiFetch asks for
 * that, how often, and what the caller gets back; and how sign-outs
 * (signOutWith) and session checks (checkSession) keep clear of each other.
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
let signOutWith: CsrfFetchModule["signOutWith"];
let checkSession: CsrfFetchModule["checkSession"];

beforeEach(async () => {
  // The module keeps its CSRF token and its refresh state between calls, as
  // it does in a browser tab. Each test starts from a freshly loaded tab.
  vi.resetModules();
  ({ apiFetch, signOutWith, checkSession } = await import("../csrf-fetch"));
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

const logoutBody = JSON.stringify({ action: "logout" });
const signOutRequest = () => fetch("/api/v1/auth", { method: "POST", body: logoutBody });

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

  it("treats every spelling of the auth route as the auth route", async () => {
    const api = fakeApi({
      "GET /api/v1/auth/": [expiredAccess],
      "GET /api/v1/auth": [expiredAccess, expiredAccess],
    });

    for (const url of ["/api/v1/auth/", "/api/v1/auth?check=1", "https://socialperks.app/api/v1/auth"]) {
      expect((await apiFetch(url)).status).toBe(401);
    }

    expect(api.requests.filter((r) => (r.body as { action?: string } | undefined)?.action === "refresh")).toEqual([]);
  });

  it("recovers a write on a route that checks the CSRF token before the sign-in", async () => {
    // Like POST /api/v1/api-keys: CSRF first, then the cookie. The token held
    // from before the cookie ran out is tied to the user, and the server no
    // longer knows the user, so the write is refused twice before it lands.
    let signedIn = true;
    const tokenNow = () => (signedIn ? "csrf-user" : "csrf-anon");
    const issueToken: Answer = () => csrfToken(tokenNow())();
    const csrfFirstWrite: Answer = (req) => {
      if (req.headers.get("X-CSRF-Token") !== tokenNow()) return csrfInvalid();
      if (!signedIn) return expiredAccess();
      return okWith({ key: { id: "key_test_1" } })();
    };
    const api = fakeApi({
      "GET /api/v1/csrf": [issueToken, issueToken, issueToken],
      "POST /api/v1/api-keys": Array(6).fill(csrfFirstWrite),
      "POST /api/v1/auth": [
        () => {
          signedIn = true;
          return refreshAccepted();
        },
      ],
    });
    const body = JSON.stringify({ agentName: "Test Agent", permissions: ["read"] });

    expect((await apiFetch("/api/v1/api-keys", { method: "POST", body })).status).toBe(200);
    signedIn = false; // the access cookie runs out
    const res = await apiFetch("/api/v1/api-keys", { method: "POST", body });

    expect(res.status).toBe(200);
    expect(api.sent("POST /api/v1/auth")).toHaveLength(1);
  });
});

describe("signOutWith", () => {
  const authActions = (api: ReturnType<typeof fakeApi>) =>
    api.sent("POST /api/v1/auth").map((r) => (r.body as { action?: string }).action);

  it("waits for a refresh in flight, so the refresh's cookies land before the sign-out clears them", async () => {
    const refresh = heldAnswer();
    const api = fakeApi({
      "GET /api/v1/campaigns": [expiredAccess, campaignList],
      "POST /api/v1/auth": [refresh.answer, okWith({ loggedOut: true, sessionDestroyed: false })],
    });

    const read = apiFetch(campaignsUrl);
    await settle(); // the 401 is in and the refresh is on its way
    const signOut = signOutWith(signOutRequest);
    await settle();
    expect(authActions(api)).toEqual(["refresh"]);

    refresh.release(refreshAccepted());
    await signOut;
    await read;
    expect(authActions(api)).toEqual(["refresh", "logout"]);
  });

  it("starts no refresh while the sign-out is on its way, and renews again afterwards", async () => {
    const logout = heldAnswer();
    const api = fakeApi({
      "GET /api/v1/campaigns": [expiredAccess, expiredAccess, campaignList],
      "POST /api/v1/auth": [logout.answer, refreshAccepted],
    });

    const signOut = signOutWith(signOutRequest);
    expect((await apiFetch(campaignsUrl)).status).toBe(401);
    expect(authActions(api)).toEqual(["logout"]);

    logout.release(okWith({ loggedOut: true, sessionDestroyed: true })());
    await signOut;

    // Signed in again in the same tab: renewal works as before.
    expect((await apiFetch(campaignsUrl)).status).toBe(200);
    expect(authActions(api)).toEqual(["logout", "refresh"]);
  });
});

describe("checkSession", () => {
  // GET /api/v1/auth renews from the refresh cookie on the server and sets
  // the auth cookies, so a check answered after a sign-out would sign the
  // person back in for 7 days.
  const signedIn = okWith({
    user: { id: "usr_test_1", email: "owner@example.test", role: "business", businessId: "biz_usr_test_1" },
    expiresAt: "2026-03-02T15:15:00.000Z",
  });
  /** The same check once a sign-out has cleared the cookies. */
  const signedOut = errorWith(401, "NO_TOKEN", "No session token provided. Send Authorization: Bearer <token>.");
  const loggedOut = okWith({ loggedOut: true, sessionDestroyed: false });
  const routesSent = (api: ReturnType<typeof fakeApi>) => api.requests.map((r) => `${r.method} ${r.path}`);

  it("a sign-out waits for a session check on its way", async () => {
    const check = heldAnswer();
    const api = fakeApi({
      "GET /api/v1/auth": [check.answer],
      "POST /api/v1/auth": [loggedOut],
    });

    const session = checkSession();
    const signOut = signOutWith(signOutRequest);
    await settle();
    expect(routesSent(api)).toEqual(["GET /api/v1/auth"]); // the logout has not been sent

    check.release(signedIn());
    await signOut;
    expect(routesSent(api)).toEqual(["GET /api/v1/auth", "POST /api/v1/auth"]);
    expect((await session).status).toBe(200);
  });

  it("a session check asked during a sign-out goes out after it", async () => {
    const logout = heldAnswer();
    const api = fakeApi({
      "POST /api/v1/auth": [logout.answer],
      "GET /api/v1/auth": [signedOut],
    });

    const signOut = signOutWith(signOutRequest);
    const session = checkSession();
    await settle();
    expect(api.sent("GET /api/v1/auth")).toEqual([]);

    logout.release(loggedOut());
    expect((await session).status).toBe(401);
    await signOut;
    expect(routesSent(api)).toEqual(["POST /api/v1/auth", "GET /api/v1/auth"]);
  });

  it("a session check asked during a sign-out does not share one sent before it", async () => {
    const early = heldAnswer();
    const api = fakeApi({
      "GET /api/v1/auth": [early.answer, signedOut],
      "POST /api/v1/auth": [loggedOut],
    });

    const before = checkSession();
    await settle(); // the first check is on its way
    const signOut = signOutWith(signOutRequest);
    const during = checkSession();

    early.release(signedIn());
    expect((await before).status).toBe(200);
    expect((await during).status).toBe(401);
    await signOut;
    expect(routesSent(api)).toEqual(["GET /api/v1/auth", "POST /api/v1/auth", "GET /api/v1/auth"]);
  });

  it("callers share one session check, each reading its own answer", async () => {
    const api = fakeApi({ "GET /api/v1/auth": [signedIn] });

    const [first, second] = await Promise.all([checkSession(), checkSession()]);
    const [a, b] = await Promise.all([first.json(), second.json()]);

    expect([a.data.user.id, b.data.user.id]).toEqual(["usr_test_1", "usr_test_1"]);
    const sent = api.sent("GET /api/v1/auth");
    expect(sent).toHaveLength(1);
    expect(sent[0].credentials).toBe("include");
  });

  it("a caller's signal ends only its own wait", async () => {
    const check = heldAnswer();
    const api = fakeApi({ "GET /api/v1/auth": [check.answer] });
    const controller = new AbortController();

    const abandoned = checkSession(controller.signal);
    const kept = checkSession();
    // Before the request leaves: a request carrying this signal would never
    // leave, and the second caller would get the AbortError too.
    controller.abort();
    const reason = await abandoned.catch((e: unknown) => e);
    expect(reason).toBe(controller.signal.reason);
    expect(reason).toMatchObject({ name: "AbortError" });

    check.release(signedIn());
    expect((await kept).status).toBe(200);
    expect(api.sent("GET /api/v1/auth")).toHaveLength(1);
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

  it("asks again when the computer's clock has been set back since the last refresh", async () => {
    const api = fakeApi({
      "GET /api/v1/campaigns": [expiredAccess, expiredAccess],
      "POST /api/v1/auth": [refreshRefused, refreshRefused],
    });

    expect((await apiFetch(campaignsUrl)).status).toBe(401);
    vi.setSystemTime(start - 60 * 60_000); // the clock is put back an hour
    expect((await apiFetch(campaignsUrl)).status).toBe(401);

    expect(api.sent("POST /api/v1/auth")).toHaveLength(2);
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
