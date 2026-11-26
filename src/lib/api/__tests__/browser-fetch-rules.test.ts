/**
 * Three rules for browser code that talks to the app's own API.
 *
 * 1. Signed-in reads go through apiFetch. apiFetch renews the 15-minute
 *    access cookie on a 401; a plain fetch() does not, so a signed-in read
 *    made with one fails on any tab open longer than 15 minutes. Plain reads
 *    stay allowed for the public routes listed below. A read of the auth
 *    route is a session check, and rule 3 covers it.
 * 2. Sign-outs go through signOutWith, so neither a refresh nor a session
 *    check that is on its way can set again the cookies a sign-out has just
 *    cleared.
 * 3. Session checks go through checkSession, which waits for any sign-out on
 *    its way. A session check renews from the refresh cookie on the server,
 *    so a plain one could undo a sign-out.
 *
 * Only a browser can fetch a relative URL, so server code never matches.
 * The scan (src/__tests__/helpers/scan-fetch-calls.ts) sees only URLs
 * written out in the call: not URLs held in variables, wrappers around
 * fetch, reads sent as POST, or EventSource. Writes are not checked.
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

function allFetchCalls(): FetchCall[] {
  return sourceFiles(SRC).flatMap((file) =>
    fetchCalls(path.relative(process.cwd(), file), readFileSync(file, "utf8"))
  );
}

const isSameOriginApi = (call: FetchCall) => call.url?.startsWith("/api/v1/") ?? false;

/** A read, or a call whose method the scanner cannot tell. */
const mayRead = (call: FetchCall) => call.method === null || call.method === "GET" || call.method === "HEAD";

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
      .filter(mayRead)
      // The auth route's reads are session checks: the checkSession rule below.
      .filter((c) => c.path !== AUTH_ROUTE && !isPublic(c.path ?? ""))
      .map((c) => `${c.where}  ${c.path}`);

    expect(signedInReads).toEqual([]);
  });

  it("sends every sign-out through signOutWith", () => {
    const unguarded = allFetchCalls()
      .filter(
        (c) =>
          (c.path === AUTH_ROUTE && c.action === "logout") ||
          (c.path === "/api/v1/admin/impersonate" && c.method === "DELETE")
      )
      .filter((c) => !c.insideCalls.includes("signOutWith"))
      .map((c) => `${c.where}  ${c.method} ${c.path}${c.action ? ` (${c.action})` : ""}`);

    expect(unguarded).toEqual([]);
  });

  it("sends every session check through checkSession", () => {
    // checkSession fetches through a constant, so its own call is not seen here.
    const plainChecks = allFetchCalls()
      .filter((c) => c.path === AUTH_ROUTE && (mayRead(c) || c.action === "session"))
      .map((c) => `${c.where}  ${c.method ?? "?"} ${c.path}${c.action ? ` (${c.action})` : ""}`);

    expect(plainChecks).toEqual([]);
  });
});
