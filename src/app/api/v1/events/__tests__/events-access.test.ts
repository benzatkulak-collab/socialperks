/**
 * GET /api/v1/events streams realtime events. Who receives what:
 *   - a business: only events for its own business; asking for another
 *     business's stream is refused
 *   - the founder (role "admin", no business): every event, or one
 *     business's if it asks
 *   - any other account (an influencer): no business's events, so no stream
 *     at all (204 No Content). It used to get EVERY business's events, and
 *     asking for one business by ?businessId= used to work for anyone
 * Events that name no business (a new sign-up's `user.created`, which carries
 * the new account's email) go to the founder only.
 *
 * All ids and emails here are made up.
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import { signJWT, createTokenPair } from "@/lib/auth";
import { eventPublisher } from "@/lib/realtime/publisher";

const BIZ_A = "biz_test_alpha";
const BIZ_B = "biz_test_beta";
const NEW_SIGNUP_EMAIL = "new.signup@example.test";

function token(sub: string, role: string, businessId: string | null): string {
  return signJWT({ sub, role, email: `${sub}@example.test`, businessId, type: "access" });
}

/**
 * Open the stream, publish `events` while it is open, close it, and return
 * everything the stream sent.
 */
async function streamWhile(query: string, publish: () => void): Promise<{ status: number; text: string }> {
  const abort = new AbortController();
  const res = await GET(new NextRequest(`http://localhost/api/v1/events?${query}`, { signal: abort.signal }));
  if (res.status !== 200 || !res.body) return { status: res.status, text: await res.text() };
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
  return { status: res.status, text };
}

function publishAll(): void {
  eventPublisher.publish("submission.created", { submissionId: "sub_test_for_a" }, BIZ_A);
  eventPublisher.publish("submission.created", { submissionId: "sub_test_for_b" }, BIZ_B);
  eventPublisher.publish("user.created", { userId: "usr_test_new", email: NEW_SIGNUP_EMAIL, role: "influencer" });
}

describe("GET /api/v1/events — asking for a business", () => {
  it("refuses a business asking for another business (403)", async () => {
    const { status } = await streamWhile(`token=${token("usr_test_owner_a", "business", BIZ_A)}&businessId=${BIZ_B}`, publishAll);
    expect(status).toBe(403);
  });

  it("refuses an account with no business asking for one (403)", async () => {
    const { status } = await streamWhile(`token=${token("usr_test_influencer", "influencer", null)}&businessId=${BIZ_B}`, publishAll);
    expect(status).toBe(403);
  });

  it("lets a business name itself", async () => {
    const { status, text } = await streamWhile(`token=${token("usr_test_owner_a", "business", BIZ_A)}&businessId=${BIZ_A}`, publishAll);
    expect(status).toBe(200);
    expect(text).toContain("sub_test_for_a");
  });
});

describe("GET /api/v1/events — what is forwarded", () => {
  it("gives a business its own events only, and no sign-up emails", async () => {
    const { text } = await streamWhile(`token=${token("usr_test_owner_a", "business", BIZ_A)}`, publishAll);
    expect(text).toContain("sub_test_for_a");
    expect(text).not.toContain("sub_test_for_b");
    expect(text).not.toContain(NEW_SIGNUP_EMAIL);
  });

  it("opens no stream for an account with no business (204): it would receive no business's events and no sign-up emails", async () => {
    const { status, text } = await streamWhile(`token=${token("usr_test_influencer", "influencer", null)}`, publishAll);
    expect(status).toBe(204);
    expect(text).toBe("");
  });

  it("gives the founder every event", async () => {
    const { text } = await streamWhile(`token=${token("usr_admin_root", "admin", null)}`, publishAll);
    expect(text).toContain("sub_test_for_a");
    expect(text).toContain("sub_test_for_b");
    expect(text).toContain(NEW_SIGNUP_EMAIL);
  });

  it("gives the founder one business's events when it asks", async () => {
    const { text } = await streamWhile(`token=${token("usr_admin_root", "admin", null)}&businessId=${BIZ_B}`, publishAll);
    expect(text).toContain("sub_test_for_b");
    expect(text).not.toContain("sub_test_for_a");
  });
});

describe("GET /api/v1/events — token type", () => {
  it("refuses a refresh token (401)", async () => {
    const { refreshToken } = createTokenPair("usr_test_owner_a", "business", "usr_test_owner_a@example.test", BIZ_A);
    const { status } = await streamWhile(`token=${refreshToken}`, () => {});
    expect(status).toBe(401);
  });
});
