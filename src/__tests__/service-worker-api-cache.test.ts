/**
 * public/sw.js, the service worker every visitor gets, and the API answers it
 * keeps in the browser.
 *
 * Until now the worker answered every same-origin /api/v1/* GET network first
 * and kept a copy of every good answer in Cache Storage (`sp-v1-api`), the
 * signed-in ones too: a business's campaigns and submissions, the referrals
 * summary, the session check. When the network failed it answered from that
 * copy, however old, to whoever was using the browser by then, and nothing
 * emptied it at sign-out. On a shared device the next person could read the
 * last account's data offline.
 *
 * The rule now:
 * - The worker keeps a copy only of API reads that answer the same for
 *   everyone and whose address says nothing about who is asking:
 *   GET /api/v1/stats/public and GET /api/v1/search. Offline it answers those
 *   from the copy.
 * - Every other API read goes to the network only, and answers 503 offline.
 * - A write to the sign-in routes (/api/v1/auth, /api/v1/admin/impersonate)
 *   can change who is signed in, so it empties the copies the worker kept.
 * - New cache names make the activate step delete every cache an earlier
 *   worker kept.
 * - Writes go to the network only and answer 503 offline. The old worker
 *   kept a write it could not send in IndexedDB (`social-perks-sw`): its
 *   address and headers, the CSRF token among them. The failed fetch had
 *   already used the body, so that was saved as null. It answered 202 "will
 *   sync" and never sent it: nothing in the app asked it to. Activating the
 *   new worker deletes that database.
 *
 * The test runs sw.js in a sandbox with a stand-in `self`, network and Cache
 * Storage, and fires install, activate and fetch events at it. All data is
 * made up.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ORIGIN, json, settled, startWorker } from "@/__tests__/helpers/service-worker-sandbox";

const API_DIR = path.join(process.cwd(), "src", "app", "api", "v1");

/** Every API route on disk, as the path a browser asks for. */
function apiRoutes(): { path: string; file: string }[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "route.ts") files.push(full);
    }
  };
  walk(API_DIR);
  return files
    .map((file) => {
      const segments = path
        .relative(API_DIR, path.dirname(file))
        .split(path.sep)
        .filter(Boolean)
        .map((segment) => (segment.startsWith("[") ? "test_param" : segment));
      return { path: ["/api/v1", ...segments].join("/"), file };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Sends a GET for every API route through one worker, and returns the routes it kept a copy of. */
async function routesKeptAfterReadingEveryRoute() {
  const routes = apiRoutes();
  const worker = startWorker();
  for (const route of routes) await worker.send(route.path);
  const kept = new Set(worker.storage.urls().map((url) => new URL(url).pathname));
  return { routes, kept: routes.filter((route) => kept.has(route.path)) };
}

function post(body: unknown): RequestInit {
  return { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

const SIGNED_IN_READS: [string, string][] = [
  ["a business's campaigns", "/api/v1/campaigns?businessId=biz_test_alpha"],
  ["a business's submissions", "/api/v1/submissions?businessId=biz_test_alpha"],
  ["the referrals summary", "/api/v1/referrals/me"],
  ["the session check", "/api/v1/auth"],
  ["an influencer's Discover feed, which names the influencer", "/api/v1/discover?influencerId=inf_test_beta"],
  ["the flags, which are worked out for the caller", "/api/v1/flags"],
];

describe("public/sw.js — which API answers it keeps", () => {
  it("keeps a copy of the public reads and of no other API read", async () => {
    const { routes, kept } = await routesKeptAfterReadingEveryRoute();
    expect(routes.length).toBeGreaterThan(50); // the walk found the API
    expect(kept.map((route) => route.path)).toEqual(["/api/v1/search", "/api/v1/stats/public"]);
  });

  // A route on the worker's list must not look at the caller, or its answer
  // is not the same for everyone. This catches a route that starts to.
  it("keeps only routes that never look at who is calling", async () => {
    const lookAtTheCaller = [
      /\bgetUser\(/,
      /\brequireAuth\(/,
      /\bisApiKeyAuth\(/,
      /\bwithTenant\(/,
      /\bcheckResourceAccess\(/,
      /\brequireOwnership\(/,
      /\bverifyJWT\(/,
      /\.cookies\b/,
      /authorization/i,
      /x-api-key/i,
    ];
    const { kept } = await routesKeptAfterReadingEveryRoute();
    expect(kept.length).toBeGreaterThan(0);
    for (const route of kept) {
      const source = readFileSync(route.file, "utf8");
      const found = lookAtTheCaller.filter((pattern) => pattern.test(source)).map(String);
      expect({ route: route.path, found }).toEqual({ route: route.path, found: [] });
    }
  });

  it.each(SIGNED_IN_READS)("never keeps %s", async (_name, url) => {
    const worker = startWorker();
    const answer = await worker.send(url);
    expect(answer?.status).toBe(200);
    expect(worker.storage.urls()).toEqual([]);
  });

  it.each(SIGNED_IN_READS)(
    "answers %s with 503 offline, even when an earlier worker left a copy in the browser",
    async (_name, url) => {
      const worker = startWorker({ "sp-v1-api": { [url]: { success: true, data: { owner: "usr_test_previous" } } } });
      worker.network.online = false;
      const answer = await worker.send(url);
      expect(answer?.status).toBe(503);
    }
  );

  it("hands over a signed-in answer at once, without reading it to the end first", async () => {
    const worker = startWorker();
    const neverEnds = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"success":true,'));
      },
    });
    worker.network.answer = () => new Response(neverEnds, { status: 200, headers: { "content-type": "application/json" } });
    const { answer } = worker.dispatch("/api/v1/submissions?businessId=biz_test_alpha");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stillWaiting = new Promise<string>((resolve) => {
      timer = setTimeout(() => resolve("still waiting"), 1000);
    });
    const first = await Promise.race([answer, stillWaiting]);
    clearTimeout(timer);
    expect(first).toBeInstanceOf(Response);
    await (first as Response).body?.cancel();
  });
});

describe("public/sw.js — public reads offline", () => {
  it("answers a public read from its copy while offline", async () => {
    const worker = startWorker();
    worker.network.answer = () => json({ success: true, data: { show: true, campaigns: 15, businesses: 5 } });
    await worker.send("/api/v1/stats/public");
    worker.network.online = false;
    const answer = await worker.send("/api/v1/stats/public");
    expect(answer?.status).toBe(200);
    expect(await answer?.json()).toEqual({ success: true, data: { show: true, campaigns: 15, businesses: 5 } });
  });

  it("keeps each search under its own query", async () => {
    const worker = startWorker();
    await worker.send("/api/v1/search?q=coffee");
    worker.network.online = false;
    expect((await worker.send("/api/v1/search?q=coffee"))?.status).toBe(200);
    expect((await worker.send("/api/v1/search?q=tea"))?.status).toBe(503);
  });
});

describe("public/sw.js — a change of who is signed in", () => {
  const changes: [string, string, RequestInit][] = [
    ["a sign-in", "/api/v1/auth", post({ action: "login" })],
    ["a sign-out", "/api/v1/auth", post({ action: "logout" })],
    ["a sign-out sent to /api/v1/auth/", "/api/v1/auth/", post({ action: "logout" })],
    ["a renewal of the access cookie", "/api/v1/auth", post({ action: "refresh" })],
    ["the start of an impersonation", "/api/v1/admin/impersonate", post({ email: "owner@example.test" })],
    ["the end of an impersonation", "/api/v1/admin/impersonate", { method: "DELETE" }],
  ];

  it.each(changes)("empties the copies it kept on %s", async (_name, url, init) => {
    const worker = startWorker();
    await worker.send("/api/v1/stats/public");
    await worker.send("/api/v1/search?q=coffee");
    expect(worker.storage.urls()).toHaveLength(2);
    await worker.send(url, init);
    expect(worker.storage.urls()).toEqual([]);
  });

  it("keeps them through a session check, which is only a read", async () => {
    const worker = startWorker();
    await worker.send("/api/v1/stats/public");
    await worker.send("/api/v1/auth");
    expect(worker.storage.urls()).toEqual([`${ORIGIN}/api/v1/stats/public`]);
  });
});

describe("public/sw.js — the caches earlier workers kept", () => {
  it("deletes every cache an earlier worker kept when it activates", async () => {
    const worker = startWorker({
      "sp-v1-api": { "/api/v1/referrals/me": { success: true, data: { code: "TESTCODE" } } },
      "sp-v1-static": {},
      "sp-v1-pages": {},
      "sp-v2-api": { "/api/v1/campaigns?businessId=biz_test_alpha": { success: true, data: [] } },
      "sp-v2-static": {},
      "sp-v2-pages": {},
      "another-app-cache": {},
    });
    await worker.activate();
    expect(worker.storage.names()).toEqual(["another-app-cache"]);
  });

  it("keeps its own caches when it activates", async () => {
    const worker = startWorker();
    await worker.install();
    await worker.send("/api/v1/stats/public");
    const own = worker.storage.names();
    expect(own).toHaveLength(2); // the app shell and the public reads
    await worker.activate();
    expect(worker.storage.names()).toEqual(own);
  });

  it("deletes the database where the old worker kept unsent writes when it activates", async () => {
    const worker = startWorker();
    await worker.activate();
    expect(worker.idb.deleted).toEqual(["social-perks-sw"]);
  });

  // A worker stuck in "activating" would hold back every request the site makes.
  it("finishes activating even when an open connection blocks that delete", async () => {
    const worker = startWorker();
    worker.idb.blockDelete = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stillActivating = new Promise<string>((resolve) => {
      timer = setTimeout(() => resolve("still activating"), 1000);
    });
    const outcome = await Promise.race([worker.activate().then(() => "activated"), stillActivating]);
    clearTimeout(timer);
    expect(outcome).toBe("activated");
  });
});

describe("public/sw.js — writes while offline", () => {
  it("answers a write with 503 while offline, and keeps nothing of it", async () => {
    const worker = startWorker();
    worker.network.online = false;
    const answer = await worker.answerWithin("/api/v1/campaigns", post({ businessId: "biz_test_alpha", name: "Test campaign" }));
    expect(answer).toBeInstanceOf(Response);
    expect((answer as Response).status).toBe(503);
    expect(worker.idb.opened).toEqual([]);
  });

  it("sends a write to the network and hands back the server's answer", async () => {
    const worker = startWorker();
    worker.network.answer = () => json({ success: true, data: { id: "cmp_test_one" } }, 201);
    const answer = await worker.send("/api/v1/campaigns", post({ businessId: "biz_test_alpha", name: "Test campaign" }));
    expect(answer?.status).toBe(201);
    expect(worker.idb.opened).toEqual([]);
  });

  it("empties the copies it kept on a sign-out sent while offline, and answers it with 503", async () => {
    const worker = startWorker();
    await worker.send("/api/v1/stats/public");
    worker.network.online = false;
    const answer = await worker.answerWithin("/api/v1/auth", post({ action: "logout" }));
    await settled();
    expect(answer).toBeInstanceOf(Response);
    expect((answer as Response).status).toBe(503);
    expect(worker.storage.urls()).toEqual([]);
  });

  it("sends nothing on its own: no sync event or message replays a write", async () => {
    const worker = startWorker();
    worker.fireIfListening("sync", { tag: "replay-mutations", waitUntil: () => {} });
    worker.fireIfListening("message", { data: { type: "DRAIN_MUTATIONS" }, waitUntil: () => {} });
    await settled();
    expect(worker.idb.opened).toEqual([]);
    expect(worker.network.requests).toEqual([]);
  });
});
