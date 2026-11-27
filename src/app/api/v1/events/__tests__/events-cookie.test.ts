/**
 * A browser opens GET /api/v1/events with EventSource, which cannot set a
 * header, and the access token is an HttpOnly cookie that page scripts cannot
 * read. So the stream must take its caller from the `sp-access-token` cookie.
 * Until now it read only `?token=`, which no page sends, and answered every
 * browser 401 MISSING_TOKEN.
 *
 * The rules of events-access.test.ts hold whichever way the caller signs in:
 * access tokens only, and a business streams its own business's events only.
 *
 * HEAD /api/v1/events makes the same checks and opens no stream. The browser
 * client asks it, through apiFetch, before each connection: EventSource never
 * shows the status of a refused connection, and apiFetch can renew an expired
 * cookie.
 *
 * All ids and emails here are made up.
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET, HEAD } from "../route";
import { signJWT, createTokenPair } from "@/lib/auth";
import { eventPublisher } from "@/lib/realtime/publisher";
import { createApiKey } from "@/lib/auth/api-keys";

const BIZ_A = "biz_test_alpha";
const BIZ_B = "biz_test_beta";
const NEW_SIGNUP_EMAIL = "new.signup@example.test";

function accessToken(sub: string, role: string, businessId: string | null): string {
  return signJWT({ sub, role, email: `${sub}@example.test`, businessId, type: "access" });
}

interface Credentials {
  cookie?: string;
  bearer?: string;
  apiKey?: string;
}

function request(query: string, creds: Credentials, init: { method?: string; signal?: AbortSignal } = {}): NextRequest {
  const headers = new Headers();
  if (creds.cookie) headers.set("cookie", `sp-access-token=${creds.cookie}`);
  if (creds.bearer) headers.set("authorization", `Bearer ${creds.bearer}`);
  if (creds.apiKey) headers.set("x-api-key", creds.apiKey);
  return new NextRequest(`http://localhost/api/v1/events${query ? `?${query}` : ""}`, {
    method: init.method ?? "GET",
    headers,
    signal: init.signal,
  });
}

/** Open the stream, publish while it is open, close it, and return what it sent. */
async function streamWhile(
  query: string,
  creds: Credentials,
  publish: () => void,
): Promise<{ status: number; contentType: string | null; text: string }> {
  const abort = new AbortController();
  const res = await GET(request(query, creds, { signal: abort.signal }));
  const contentType = res.headers.get("content-type");
  if (res.status !== 200 || !res.body) return { status: res.status, contentType, text: await res.text() };
  publish();
  abort.abort();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value);
  }
  return { status: res.status, contentType, text };
}

function publishAll(): void {
  eventPublisher.publish("submission.created", { submissionId: "sub_test_for_a" }, BIZ_A);
  eventPublisher.publish("submission.created", { submissionId: "sub_test_for_b" }, BIZ_B);
  eventPublisher.publish("user.created", { userId: "usr_test_new", email: NEW_SIGNUP_EMAIL, role: "influencer" });
}

describe("GET /api/v1/events — signed in by the sp-access-token cookie", () => {
  it("streams a business its own business's events and nothing else", async () => {
    const { status, contentType, text } = await streamWhile(
      "",
      { cookie: accessToken("usr_test_owner_a", "business", BIZ_A) },
      publishAll,
    );
    expect(status).toBe(200);
    expect(contentType).toBe("text/event-stream");
    expect(text).toContain("event: connected");
    expect(text).toContain("sub_test_for_a");
    expect(text).not.toContain("sub_test_for_b");
    expect(text).not.toContain(NEW_SIGNUP_EMAIL);
  });

  it("lets a business name itself, as the portal does", async () => {
    const { status, text } = await streamWhile(
      `businessId=${BIZ_A}`,
      { cookie: accessToken("usr_test_owner_a", "business", BIZ_A) },
      publishAll,
    );
    expect(status).toBe(200);
    expect(text).toContain("sub_test_for_a");
    expect(text).not.toContain("sub_test_for_b");
  });

  it("refuses a business asking for another business (403)", async () => {
    const { status } = await streamWhile(
      `businessId=${BIZ_B}`,
      { cookie: accessToken("usr_test_owner_a", "business", BIZ_A) },
      publishAll,
    );
    expect(status).toBe(403);
  });

  it("gives the founder every event", async () => {
    const { text } = await streamWhile("", { cookie: accessToken("usr_admin_root", "admin", null) }, publishAll);
    expect(text).toContain("sub_test_for_a");
    expect(text).toContain("sub_test_for_b");
    expect(text).toContain(NEW_SIGNUP_EMAIL);
  });

  it("refuses a cookie holding the 7-day refresh token (401)", async () => {
    const { refreshToken } = createTokenPair("usr_test_owner_a", "business", "usr_test_owner_a@example.test", BIZ_A);
    const { status } = await streamWhile("", { cookie: refreshToken }, publishAll);
    expect(status).toBe(401);
  });

  it("refuses a request that carries no credential (401)", async () => {
    const { status } = await streamWhile("", {}, publishAll);
    expect(status).toBe(401);
  });
});

describe("GET /api/v1/events — other ways to sign in", () => {
  it("accepts an access token in the Authorization header", async () => {
    const { status, text } = await streamWhile(
      "",
      { bearer: accessToken("usr_test_owner_a", "business", BIZ_A) },
      publishAll,
    );
    expect(status).toBe(200);
    expect(text).toContain("sub_test_for_a");
    expect(text).not.toContain("sub_test_for_b");
  });

  it("accepts a business's API key in x-api-key, for that business's events only", async () => {
    const key = createApiKey({ businessId: BIZ_A, agentName: "test agent realtime", permissions: ["read"] }).plaintext;
    const { status, text } = await streamWhile("", { apiKey: key }, publishAll);
    expect(status).toBe(200);
    expect(text).toContain("sub_test_for_a");
    expect(text).not.toContain("sub_test_for_b");
    expect(text).not.toContain(NEW_SIGNUP_EMAIL);
  });

  it("goes by ?token= when a request carries both it and a cookie", async () => {
    const { text } = await streamWhile(
      `token=${accessToken("usr_test_owner_b", "business", BIZ_B)}`,
      { cookie: accessToken("usr_test_owner_a", "business", BIZ_A) },
      publishAll,
    );
    expect(text).toContain("sub_test_for_b");
    expect(text).not.toContain("sub_test_for_a");
  });
});

describe("HEAD /api/v1/events — what GET would answer, with no stream", () => {
  async function head(query: string, creds: Credentials): Promise<{ status: number; body: string; listenersAdded: number }> {
    const before = eventPublisher.listenerCount;
    const res = await HEAD(request(query, creds, { method: "HEAD" }));
    return { status: res.status, body: await res.text(), listenersAdded: eventPublisher.listenerCount - before };
  }

  it("answers 200 for a business signed in by cookie, and opens nothing", async () => {
    const { status, body, listenersAdded } = await head("", { cookie: accessToken("usr_test_owner_a", "business", BIZ_A) });
    expect(status).toBe(200);
    expect(body).toBe("");
    expect(listenersAdded).toBe(0);
  });

  it("answers 401 with no credential, and 401 for a refresh-token cookie", async () => {
    const { refreshToken } = createTokenPair("usr_test_owner_a", "business", "usr_test_owner_a@example.test", BIZ_A);
    expect((await head("", {})).status).toBe(401);
    expect((await head("", { cookie: refreshToken })).status).toBe(401);
  });

  it("answers 403 for a business asking for another business", async () => {
    const { status } = await head(`businessId=${BIZ_B}`, { cookie: accessToken("usr_test_owner_a", "business", BIZ_A) });
    expect(status).toBe(403);
  });

  it("goes by ?token= too: 200 for an access token, 401 for a refresh token", async () => {
    const { refreshToken } = createTokenPair("usr_test_owner_a", "business", "usr_test_owner_a@example.test", BIZ_A);
    expect((await head(`token=${accessToken("usr_test_owner_a", "business", BIZ_A)}`, {})).status).toBe(200);
    expect((await head(`token=${refreshToken}`, {})).status).toBe(401);
  });

  it("answers 200 for a business's API key", async () => {
    const key = createApiKey({ businessId: BIZ_A, agentName: "test agent realtime head", permissions: ["read"] }).plaintext;
    expect((await head("", { apiKey: key })).status).toBe(200);
  });

  it("answers 204 for an account with no business, which has no events to receive", async () => {
    const { status, listenersAdded } = await head("", { cookie: accessToken("usr_test_influencer", "influencer", null) });
    expect(status).toBe(204);
    expect(listenersAdded).toBe(0);
  });
});

describe("GET /api/v1/events — the response", () => {
  it("is private to the caller and never stored by a cache", async () => {
    const abort = new AbortController();
    const res = await GET(request("", { cookie: accessToken("usr_test_owner_a", "business", BIZ_A) }, { signal: abort.signal }));
    const cacheControl = res.headers.get("cache-control") ?? "";
    abort.abort();
    expect(cacheControl).toContain("private");
    expect(cacheControl).toContain("no-store");
    expect(cacheControl).toContain("no-transform");
  });

  it("stops forwarding events once the reader cancels the stream", async () => {
    const before = eventPublisher.listenerCount;
    const res = await GET(request("", { cookie: accessToken("usr_test_owner_a", "business", BIZ_A) }));
    expect(eventPublisher.listenerCount).toBe(before + 1);
    await res.body!.cancel();
    expect(eventPublisher.listenerCount).toBe(before);
  });
});
