/**
 * A stream is checked once, when it opens. Left open, it would keep carrying
 * a business's events to whoever opened it after their 15-minute access token
 * had expired: a suspended account, a demoted admin, an impersonation that
 * has ended. So a stream ends when the credential that opened it expires, and
 * after 15 minutes whatever the credential. The browser client then checks
 * again (and renews the cookie) before it reconnects.
 *
 * All ids and emails here are made up.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import { signJWT } from "@/lib/auth";
import { eventPublisher } from "@/lib/realtime/publisher";

const BIZ_A = "biz_test_alpha";
const MINUTE = 60_000;

function cookieToken(expiresInSeconds: number): string {
  return signJWT(
    { sub: "usr_test_owner_a", role: "business", email: "usr_test_owner_a@example.test", businessId: BIZ_A, type: "access" },
    expiresInSeconds,
  );
}

/** Read the stream in the background, so the test can move the clock and look. */
function drain(body: ReadableStream<Uint8Array>): { text: string; ended: boolean } {
  const state = { text: "", ended: false };
  const reader = body.getReader();
  const decoder = new TextDecoder();
  void (async () => {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) {
        state.ended = true;
        return;
      }
      state.text += decoder.decode(value);
    }
  })();
  return state;
}

async function open(token: string) {
  const abort = new AbortController();
  const req = new NextRequest("http://localhost/api/v1/events", {
    headers: { cookie: `sp-access-token=${token}` },
    signal: abort.signal,
  });
  const res = await GET(req);
  expect(res.status).toBe(200);
  const stream = drain(res.body!);
  await vi.advanceTimersByTimeAsync(0);
  return { stream, abort };
}

let listenersBefore = 0;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
  vi.setSystemTime(new Date("2026-11-26T12:00:00.000Z"));
  listenersBefore = eventPublisher.listenerCount;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/v1/events — how long a stream lasts", () => {
  it("ends the stream when the access token that opened it expires", async () => {
    const { stream, abort } = await open(cookieToken(10 * 60));
    expect(stream.text).toContain("event: connected");

    await vi.advanceTimersByTimeAsync(10 * MINUTE - 1_000);
    expect(stream.ended).toBe(false);
    eventPublisher.publish("submission.created", { submissionId: "sub_test_before_expiry" }, BIZ_A);
    await vi.advanceTimersByTimeAsync(0);
    expect(stream.text).toContain("sub_test_before_expiry");

    await vi.advanceTimersByTimeAsync(1_000);
    expect(stream.ended).toBe(true);
    expect(eventPublisher.listenerCount).toBe(listenersBefore);

    eventPublisher.publish("submission.created", { submissionId: "sub_test_after_expiry" }, BIZ_A);
    await vi.advanceTimersByTimeAsync(0);
    expect(stream.text).not.toContain("sub_test_after_expiry");
    abort.abort();
  });

  it("ends any stream after 15 minutes, even when its credential is good for longer", async () => {
    const { stream, abort } = await open(cookieToken(60 * 60));

    await vi.advanceTimersByTimeAsync(15 * MINUTE - 1_000);
    expect(stream.ended).toBe(false);
    expect(stream.text).toContain("event: heartbeat");

    await vi.advanceTimersByTimeAsync(1_000);
    expect(stream.ended).toBe(true);
    expect(eventPublisher.listenerCount).toBe(listenersBefore);
    abort.abort();
  });

  it("stops forwarding and heartbeats once the caller goes away", async () => {
    const { stream, abort } = await open(cookieToken(10 * 60));
    abort.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(stream.ended).toBe(true);
    expect(eventPublisher.listenerCount).toBe(listenersBefore);
    expect(vi.getTimerCount()).toBe(0);
  });
});
