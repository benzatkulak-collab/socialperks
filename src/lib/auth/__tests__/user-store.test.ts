import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

// We mock the DB connection so that:
//   1. `db` is a plain object — NOT an instance of this `InMemoryConnection`
//      — which makes user-store's `usingDb` check true, so persistUser
//      actually issues a `db.query(...)` write instead of no-opping.
//   2. We control that query's promise to simulate an in-flight Postgres
//      write that hasn't committed yet — the exact serverless-freeze window
//      where a fire-and-forget write would be lost.
// The default impl resolves a valid result so the fire-and-forget session
// hydrate that auth/index.ts kicks off at import (it shares this same db)
// settles quietly instead of throwing.
const QUERY_OK = { rows: [], rowCount: 0, duration: 0 };
const { queryMock } = vi.hoisted(() => {
  const fn = vi.fn();
  fn.mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });
  return { queryMock: fn };
});

vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return {
    db: { query: queryMock },
    InMemoryConnection,
    getInMemoryStore: () => null,
  };
});

import {
  putUser,
  updateUser,
  getUserByEmail,
  type UserRecord,
} from "../user-store";

/** A promise whose settlement we control externally. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeUser(email: string): UserRecord {
  return {
    id: `usr_${email}`,
    email,
    name: "Test User",
    passwordHash: "salt:hash",
    role: "business",
    businessId: "biz_1",
    suspendedAt: null,
    suspensionReason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("updateUser durability (serverless freeze fix, cf. #102)", () => {
  beforeAll(async () => {
    // auth/index.ts fires a one-time, fire-and-forget session hydrate at
    // import that touches this same mocked db. Drain it (macrotask boundary
    // flushes all pending microtasks) so its single stray query can't
    // interleave with — and consume the controlled promise of — the tests.
    await new Promise((r) => setTimeout(r, 0));
  });

  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue(QUERY_OK);
  });

  it("does not resolve until the persist write completes — a caller that awaits it waits for the DB", async () => {
    // Seed a user with an immediately-resolving persist.
    const email = "suspend-target@test.com";
    await putUser(makeUser(email));

    // The suspend write hangs until we release it: this models an in-flight
    // Postgres UPDATE that has not committed yet.
    const pendingWrite = deferred<typeof QUERY_OK>();
    queryMock.mockReturnValueOnce(pendingWrite.promise);

    // Simulate the admin route handler: await updateUser, THEN respond.
    let responded = false;
    const handler = (async () => {
      const result = await updateUser(email, {
        suspendedAt: "2026-05-29T12:00:00.000Z",
        suspensionReason: "abuse",
      });
      responded = true;
      return result;
    })();

    // The in-memory map reflects the suspension synchronously (hot-path reads
    // stay correct in-process)...
    expect(getUserByEmail(email)?.suspendedAt).toBe("2026-05-29T12:00:00.000Z");

    // ...but the handler has NOT responded: it is awaiting the persist write.
    // Draining the microtask queue must not be enough to let it through,
    // because the DB write is still pending. If updateUser were
    // fire-and-forget (`void persistUser(...)`), `responded` would already be
    // true here and the suspension could be lost on a serverless cold start.
    await Promise.resolve();
    await Promise.resolve();
    expect(responded).toBe(false);

    // The persist write was actually attempted (setup write + suspend write).
    expect(queryMock).toHaveBeenCalledTimes(2);

    // Release the DB write; only now does the handler complete and "respond".
    pendingWrite.resolve(QUERY_OK);
    const result = await handler;

    expect(responded).toBe(true);
    expect(result?.suspendedAt).toBe("2026-05-29T12:00:00.000Z");
    expect(result?.suspensionReason).toBe("abuse");
  });

  it("returns null and skips the persist write when the user does not exist", async () => {
    const result = await updateUser("ghost@test.com", { suspendedAt: "x" });
    expect(result).toBeNull();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("resolves to the patched record once persisted", async () => {
    const email = "role-change@test.com";
    await putUser(makeUser(email));

    const updated = await updateUser(email, { role: "enterprise" });
    expect(updated?.role).toBe("enterprise");
    expect(getUserByEmail(email)?.role).toBe("enterprise");
  });
});
