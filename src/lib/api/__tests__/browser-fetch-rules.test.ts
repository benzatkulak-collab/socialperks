/**
 * Three rules for browser code that talks to the app's own API.
 *
 * 1. Signed-in reads go through apiFetch. apiFetch renews the 15-minute
 *    access cookie on a 401; a plain fetch() does not, so a signed-in read
 *    made with one fails on any tab open longer than 15 minutes. Plain reads
 *    stay allowed for the auth route itself (apiFetch never renews there
 *    either) and for the public routes listed below.
 * 2. Sign-outs go through signOutWith, so a renewal that is on its way
 *    cannot set again the cookies a sign-out has just cleared.
 * 3. Signed-in writes go through apiFetch too. Besides renewing, it sends
 *    the CSRF token that routes calling requireCsrf refuse a write without.
 *    Plain writes stay allowed for the auth route, for sign-outs (rule 2),
 *    for the public routes listed below, and for the signed-in writes listed
 *    with their reasons.
 *
 * Only a browser can fetch a relative URL, so server code never matches.
 * The scan (src/__tests__/helpers/scan-fetch-calls.ts) sees only URLs
 * written out in the call: not URLs held in variables, wrappers around
 * fetch, or EventSource. A read sent as POST counts as a write, and so does
 * a call whose options do not say plainly which method it uses.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fetchCalls, sourceFiles, type FetchCall } from "@/__tests__/helpers/scan-fetch-calls";

const SRC = path.join(process.cwd(), "src");
const AUTH_ROUTE = "/api/v1/auth";

/** Routes that answer a visitor with no sign-in; a 401 never comes, so there is nothing to renew. */
const PUBLIC_READS: Record<string, string> = {
  "/api/v1/csrf": "apiFetch's own call; issues a token signed in or not",
  "/api/v1/search": "campaign search; anonymous, active campaigns only",
  "/api/v1/stats/public": "the landing page's public numbers",
  "/api/v1/flags": "feature flags; with no sign-in it answers 200 with the default flags",
  "/api/v1/discover": "campaign discovery, built from seed data",
};

const isPublic = (p: string) => Object.keys(PUBLIC_READS).some((route) => p === route || p.startsWith(`${route}/`));

/** Writes that need no sign-in, so there is no access cookie to renew and no CSRF check. */
const PUBLIC_WRITES: Record<string, string> = {
  "/api/v1/submissions/public": "the public /c page's proof form",
  "/api/v1/contact": "the contact form",
  "/api/v1/waitlist": "the landing page's waitlist form",
  "/api/v1/wallet/public/redeem": "redeeming a perk from its link, whose token is the credential",
  "/api/v1/referrals/click": "counts a visit that came with ?ref=",
};

/** /api/v1/experiments answers these actions for any visitor; its other actions need the founder. */
const VISITOR_EXPERIMENT_ACTIONS = new Set(["assign", "convert"]);

/** Signed-in writes that stay on a plain fetch(), by "file  METHOD path (action)". */
const PLAIN_SIGNED_IN_WRITES: Record<string, string> = {
  "src/components/auth/auth-form.tsx  POST /api/v1/billing (create_checkout)":
    "sent by the sign-up handler right after the sign-up set a new access cookie; /billing checks no CSRF token",
};

const isSignOut = (c: FetchCall) =>
  (c.path === AUTH_ROUTE && c.action === "logout") ||
  (c.path === "/api/v1/admin/impersonate" && c.method === "DELETE");

const isPublicWrite = (c: FetchCall) =>
  (c.path !== null && c.path in PUBLIC_WRITES) ||
  (c.path === "/api/v1/experiments" && c.action !== null && VISITOR_EXPERIMENT_ACTIONS.has(c.action));

/** "METHOD path (action)", as the lists above name a call. */
const named = (c: FetchCall) => `${c.method} ${c.path}${c.action ? ` (${c.action})` : ""}`;
const plainWriteKey = (c: FetchCall) => `${c.where.replace(/:\d+$/, "")}  ${named(c)}`;

function allFetchCalls(): FetchCall[] {
  return sourceFiles(SRC).flatMap((file) =>
    fetchCalls(path.relative(process.cwd(), file), readFileSync(file, "utf8"))
  );
}

const isSameOriginApi = (call: FetchCall) => call.url?.startsWith("/api/v1/") ?? false;

describe("the fetch() scanner", () => {
  it("reads the URL, method, action and enclosing calls of each plain fetch", () => {
    const fixture = [
      'fetch("/api/v1/campaigns", { credentials: "include" });',
      'apiFetch("/api/v1/campaigns");',
      "fetch(`/api/v1/submissions?userId=${id}`, { signal });",
      'fetch("/api/v1/billing", { method: "POST", body: JSON.stringify({ action: "get_usage" }) });',
      'fetch(url, { ...init, credentials: "include" });',
      'signOutWith(() => fetch("/api/v1/auth/", { method: "POST", body: JSON.stringify({ action: "logout" }) }));',
      'const sample = `fetch("/api/v1/campaigns")`;',
    ].join("\n");

    const calls = fetchCalls("fixture.tsx", fixture).map(({ where, path: p, method, action, insideCalls }) => ({
      where,
      path: p,
      method,
      action,
      insideCalls,
    }));

    expect(calls).toEqual([
      { where: "fixture.tsx:1", path: "/api/v1/campaigns", method: "GET", action: null, insideCalls: [] },
      { where: "fixture.tsx:3", path: "/api/v1/submissions", method: "GET", action: null, insideCalls: [] },
      { where: "fixture.tsx:4", path: "/api/v1/billing", method: "POST", action: "get_usage", insideCalls: [] },
      { where: "fixture.tsx:5", path: null, method: null, action: null, insideCalls: [] },
      { where: "fixture.tsx:6", path: "/api/v1/auth", method: "POST", action: "logout", insideCalls: ["signOutWith"] },
    ]);
  });

  it("walks the real source and parses it", () => {
    const calls = allFetchCalls();
    expect(calls).toContainEqual(
      expect.objectContaining({ path: "/api/v1/csrf", where: expect.stringMatching(/^src\/lib\/api\/csrf-fetch\.ts:/) })
    );
    expect(calls.some((c) => c.where.startsWith("src/app/api/"))).toBe(false);
  });
});

describe("browser code", () => {
  it("reads no signed-in /api/v1 route with a plain fetch()", () => {
    const signedInReads = allFetchCalls()
      .filter(isSameOriginApi)
      .filter((c) => c.method === null || c.method === "GET" || c.method === "HEAD")
      .filter((c) => c.path !== AUTH_ROUTE && !isPublic(c.path ?? ""))
      .map((c) => `${c.where}  ${c.path}`);

    expect(signedInReads).toEqual([]);
  });

  it("sends every sign-out through signOutWith", () => {
    const unguarded = allFetchCalls()
      .filter(isSignOut)
      .filter((c) => !c.insideCalls.includes("signOutWith"))
      .map((c) => `${c.where}  ${named(c)}`);

    expect(unguarded).toEqual([]);
  });

  it("writes to no signed-in /api/v1 route with a plain fetch()", () => {
    // A method the options do not say plainly (null) may be a write.
    const signedInWrites = allFetchCalls()
      .filter(isSameOriginApi)
      .filter((c) => c.method !== "GET" && c.method !== "HEAD")
      .filter((c) => c.path !== AUTH_ROUTE && !isSignOut(c) && !isPublicWrite(c))
      .filter((c) => !(plainWriteKey(c) in PLAIN_SIGNED_IN_WRITES))
      .map((c) => `${c.where}  ${named(c)}`);

    expect(signedInWrites).toEqual([]);
  });

  it("finds each allowed plain signed-in write exactly once in the source", () => {
    const counts = new Map<string, number>();
    for (const call of allFetchCalls()) {
      counts.set(plainWriteKey(call), (counts.get(plainWriteKey(call)) ?? 0) + 1);
    }
    const notOnce = Object.keys(PLAIN_SIGNED_IN_WRITES)
      .filter((key) => counts.get(key) !== 1)
      .map((key) => `${key}  (found ${counts.get(key) ?? 0})`);

    expect(notOnce).toEqual([]);
  });
});
