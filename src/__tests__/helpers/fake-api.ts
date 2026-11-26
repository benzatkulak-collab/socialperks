/**
 * A stand-in for the app's own `/api/v1` routes in browser-side tests.
 *
 * Each route ("GET /api/v1/campaigns") answers from its own queue, in order.
 * A request with nothing queued fails loudly instead of hanging, and every
 * request is recorded first, so a test can count what was sent even when the
 * request itself was unexpected.
 *
 * The bodies below copy the shape of the real routes' answers (`ok()` /
 * `err()` in `src/app/api/v1/_shared.ts`). Which answer a route gives is each
 * test's choice: a test that queues `expiredAccess` models a route that
 * requires a sign-in, whether or not that route requires one today.
 * Test data only: no real people or businesses.
 */
import { vi } from "vitest";

export interface SentRequest {
  method: string;
  /** Pathname only, without the query string. */
  path: string;
  /** The URL exactly as the code passed it to fetch. */
  url: string;
  headers: Headers;
  /** The body parsed as JSON when it is a JSON string. */
  body: unknown;
  credentials: RequestCredentials | undefined;
}

/** Builds one response; it sees the request, so a route can follow the server's rules. */
export type Answer = (req: SentRequest) => Response | Promise<Response>;

/** An answer that is the same whatever was sent. */
export type FixedAnswer = () => Response;

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** `ok(data)`: what a route answers on success. */
export function okWith(data: unknown): FixedAnswer {
  return () => jsonResponse(200, { success: true, data });
}

/** `err(code, message, status)`: what a route answers on failure. */
export function errorWith(status: number, code: string, message: string): FixedAnswer {
  return () => jsonResponse(status, { success: false, error: { code, message } });
}

/** Any signed-in route once the 15-minute access cookie has gone. */
export const expiredAccess: FixedAnswer = errorWith(401, "NO_TOKEN", "Authentication required");

/** `POST /api/v1/auth {action: "refresh"}` while the 7-day refresh cookie is valid. */
export const refreshAccepted: FixedAnswer = okWith({
  user: { id: "usr_test_1", email: "owner@example.test", role: "business", businessId: "biz_usr_test_1" },
  accessToken: "test.access.token",
});

/** The same call once the refresh cookie has gone too (7 days, or signed out). */
export const refreshRefused: FixedAnswer = errorWith(401, "NO_REFRESH_TOKEN", "No refresh token provided");

/** `GET /api/v1/csrf`. */
export function csrfToken(token: string): FixedAnswer {
  return okWith({ csrfToken: token });
}

/**
 * A route that checks the CSRF token, as `requireCsrf` does
 * (src/app/api/v1/_shared.ts): no `X-CSRF-Token` header gets 403
 * CSRF_TOKEN_MISSING, a token other than the one `GET /api/v1/csrf` issued
 * gets 403 CSRF_TOKEN_INVALID, and only then does `answer` run. The real
 * token is also tied to the caller's account, which this does not model.
 */
export function requiresCsrf(issued: string, answer: Answer): Answer {
  return (req) => {
    const sent = req.headers.get("X-CSRF-Token");
    if (!sent) return errorWith(403, "CSRF_TOKEN_MISSING", "CSRF token is required. Include X-CSRF-Token header.")();
    if (sent !== issued) return errorWith(403, "CSRF_TOKEN_INVALID", "CSRF token is invalid or expired. Refresh and retry.")();
    return answer(req);
  };
}

/** One campaign as `GET /api/v1/campaigns` lists it (a `CampaignLifecycle`). */
export const testCampaign = {
  id: "cmp_test_1",
  state: "active",
  businessId: "biz_usr_test_1",
  budget: { allocated: 200, spent: 45, type: "dol" },
  completions: { current: 7, max: 50 },
  expiry: { launchedAt: "2026-03-01T15:00:00.000Z", expiresAt: "2026-03-31T15:00:00.000Z" },
  transitions: [
    { from: "draft", to: "active", triggeredBy: "usr_test_1", reason: "Launched", timestamp: "2026-03-01T15:00:00.000Z" },
  ],
  actions: ["ig_st"],
  name: "Test Coffee Story Tag",
};

/** One submission as `GET /api/v1/submissions` lists it (a `Submission`). */
export const testSubmission = {
  id: "sub_test_1",
  campaignId: "cmp_test_1",
  userId: "usr_test_2",
  actionId: "ig_st",
  proofUrl: "https://example.test/proof/1",
  proofType: "url",
  status: "approved",
  submittedAt: "2026-03-01T16:30:00.000Z",
  reviewedAt: "2026-03-01T17:00:00.000Z",
  reviewedBy: "usr_test_1",
  reviewNote: null,
  perkAwarded: true,
  metadata: {},
};

/** A list route's answer: the items plus the paging fields every list route adds. */
export function listOf(key: string, items: unknown[]): FixedAnswer {
  return okWith({ [key]: items, total: items.length, page: 1, perPage: 20, totalPages: 1 });
}

/** A promise the test settles by hand, to hold an answer back. */
export function heldAnswer(): { answer: Answer; release: (res: Response) => void } {
  let release!: (res: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    release = resolve;
  });
  return { answer: () => pending, release };
}

export function fakeApi(routes: Record<string, Answer[]>) {
  const queues = new Map(Object.entries(routes).map(([route, answers]) => [route, [...answers]]));
  const requests: SentRequest[] = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init.method ?? "GET").toUpperCase();
    const path = new URL(url, "http://localhost").pathname;
    let body: unknown = init.body;
    if (typeof init.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    const sent: SentRequest = { method, path, url, headers: new Headers(init.headers), body, credentials: init.credentials };
    requests.push(sent);

    // Like the browser: a request whose signal has already fired never leaves.
    if (init.signal?.aborted) throw new DOMException("The operation was aborted.", "AbortError");

    const next = queues.get(`${method} ${path}`)?.shift();
    if (!next) throw new Error(`fake API: nothing queued for ${method} ${path}`);
    return next(sent);
  });

  vi.stubGlobal("fetch", fetchMock);

  return {
    requests,
    /** The requests sent to one route, e.g. `sent("POST /api/v1/auth")`. */
    sent: (route: string) => requests.filter((r) => `${r.method} ${r.path}` === route),
  };
}
