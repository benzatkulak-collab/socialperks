/**
 * public/sw.js and the site's own pages and files: a deploy has to reach the
 * next page load.
 *
 * Until now the worker answered every page stale-while-revalidate: from the
 * copy it kept, fetching the new page in the background for next time. So
 * the first visit after a deploy ran the build before it. On 2026-11-27 that
 * was the founder console without its CSRF tokens, whose Approve the server
 * refused although the fix was live. And `/` and `/dashboard`, which the
 * worker keeps at install for offline use, stayed on the build it was
 * installed with: `caches.match` finds that copy before the newer one. Other
 * public files (`/manifest.json`, icons) were answered from the first copy
 * kept, for good.
 *
 * The rule now:
 * - A page goes to the network. The copy is only for when the network fails.
 * - A built file under /_next/static/ is answered from the worker's copy:
 *   its name carries a hash of its content, so a new build means a new name.
 * - Any other public file goes to the network, the copy only for offline.
 * - New cache names, so activating this worker deletes the copies the
 *   previous one kept.
 *
 * All pages, files and builds here are made up.
 */
import { describe, expect, it } from "vitest";
import { startWorker, WORKER_SOURCE } from "@/__tests__/helpers/service-worker-sandbox";

/** The worker's own cache names start with this (`${CACHE_VERSION}-static`, `-pages`). */
const CACHE_VERSION = /const CACHE_VERSION = "([^"]+)"/.exec(WORKER_SOURCE)![1];

type Worker = ReturnType<typeof startWorker>;

/** A made-up page or file of one build. */
function fromBuild(build: string, pathname: string): Response {
  const isPage = !/\.[a-z0-9]+$/i.test(pathname);
  return new Response(`${build} ${pathname}`, {
    status: 200,
    headers: { "content-type": isPage ? "text/html" : "application/javascript" },
  });
}

/** The site now serves this build: every page and file the network answers is from it. */
function deploy(worker: Worker, build: string): void {
  worker.network.answer = (request: Request) => fromBuild(build, new URL(request.url).pathname);
}

/** What the worker answers for one path, as text. */
async function visit(worker: Worker, pathname: string): Promise<string> {
  const response = await worker.send(pathname);
  if (!response) throw new Error(`the worker left ${pathname} to the browser`);
  return response.text();
}

describe("public/sw.js — pages", () => {
  it("answers a page from the network while online, not from the copy of an earlier visit", async () => {
    const worker = startWorker();
    deploy(worker, "build-1");
    expect(await visit(worker, "/admin")).toBe("build-1 /admin");

    deploy(worker, "build-2");

    expect(await visit(worker, "/admin")).toBe("build-2 /admin");
  });

  it("answers / and /dashboard from the network while online, not from the copies kept at install", async () => {
    const worker = startWorker({
      [`${CACHE_VERSION}-static`]: {
        "/": fromBuild("build-1", "/"),
        "/dashboard": fromBuild("build-1", "/dashboard"),
      },
    });
    deploy(worker, "build-2");

    expect(await visit(worker, "/")).toBe("build-2 /");
    expect(await visit(worker, "/dashboard")).toBe("build-2 /dashboard");
  });

  it("answers a page from the copy it kept when the network fails", async () => {
    const worker = startWorker();
    deploy(worker, "build-1");
    await visit(worker, "/admin/submissions");

    worker.network.online = false;

    expect(await visit(worker, "/admin/submissions")).toBe("build-1 /admin/submissions");
  });

  it("answers / from the copy kept at install when the network fails", async () => {
    const worker = startWorker({ [`${CACHE_VERSION}-static`]: { "/": fromBuild("build-1", "/") } });
    worker.network.online = false;

    expect(await visit(worker, "/")).toBe("build-1 /");
  });

  it("answers the offline page when the network fails and it kept no copy", async () => {
    const worker = startWorker();
    worker.network.online = false;

    const response = await worker.send("/admin/users");

    expect(response?.status).toBe(503);
    expect(await response?.text()).toContain("You are offline");
  });
});

describe("public/sw.js — files", () => {
  const BUILT_FILE = "/_next/static/chunks/app/admin/page-1a2b3c4d.js";

  it("answers a built file under /_next/static/ from its copy, without asking the network again", async () => {
    const worker = startWorker();
    deploy(worker, "build-1");
    await visit(worker, BUILT_FILE);
    deploy(worker, "build-2");
    const asked = worker.network.requests.length;

    expect(await visit(worker, BUILT_FILE)).toBe(`build-1 ${BUILT_FILE}`);
    expect(worker.network.requests.length).toBe(asked);
  });

  it("answers any other public file from the network while online", async () => {
    const worker = startWorker();
    deploy(worker, "build-1");
    expect(await visit(worker, "/manifest.json")).toBe("build-1 /manifest.json");

    deploy(worker, "build-2");

    expect(await visit(worker, "/manifest.json")).toBe("build-2 /manifest.json");
  });

  it("answers another public file from its copy when the network fails", async () => {
    const worker = startWorker();
    deploy(worker, "build-1");
    await visit(worker, "/favicon.svg");

    worker.network.online = false;

    expect(await visit(worker, "/favicon.svg")).toBe("build-1 /favicon.svg");
  });
});

describe("public/sw.js — the copies the previous worker kept", () => {
  it("deletes the caches of sp-v3, the worker that kept stale pages, when it activates", async () => {
    const worker = startWorker({
      "sp-v3-static": { "/": fromBuild("build-0", "/") },
      "sp-v3-pages": { "/admin": fromBuild("build-0", "/admin") },
      "sp-v3-api": {},
      "another-app-cache": {},
    });

    await worker.activate();

    expect(worker.storage.names()).toEqual(["another-app-cache"]);
  });
});
