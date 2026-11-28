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
 * - A page goes to the network, and the server's answer is shown, an error
 *   too. The copy is only for when the network fails: the page's latest copy,
 *   or for `/` and `/dashboard` the one kept at install.
 * - A built file under /_next/static/ is answered from the worker's copy:
 *   its name carries a hash of its content, so a new build means a new name.
 * - Any other public file goes to the network, the copy only for offline.
 * - An answer the server marks `private` or `no-store` is never kept. A perk
 *   link's page carries a person's codes, and the copy would be shown,
 *   offline, to whoever uses the browser next.
 * - A copy that cannot be written costs nothing: the answer still goes out.
 * - New cache names, so activating this worker deletes the copies the
 *   previous one kept.
 *
 * All pages, files, links and builds here are made up.
 */
import { describe, expect, it } from "vitest";
import { ORIGIN, startWorker } from "@/__tests__/helpers/service-worker-sandbox";

type Worker = ReturnType<typeof startWorker>;

/** A made-up page or file of one build, with the `Cache-Control` the live site sends for its public pages. */
function fromBuild(build: string, pathname: string): Response {
  const isPage = !/\.[a-z0-9]+$/i.test(pathname);
  return new Response(`${build} ${pathname}`, {
    status: 200,
    headers: {
      "content-type": isPage ? "text/html" : "application/javascript",
      "cache-control": "public, max-age=0, must-revalidate",
    },
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
    const worker = startWorker();
    deploy(worker, "build-1");
    await worker.install();

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

  it("keeps / and /dashboard at install, and answers them from those copies when the network fails", async () => {
    const worker = startWorker();
    deploy(worker, "build-1");
    await worker.install();

    worker.network.online = false;

    expect(await visit(worker, "/")).toBe("build-1 /");
    expect(await visit(worker, "/dashboard")).toBe("build-1 /dashboard");
  });

  it("answers / and /dashboard offline from their latest visit, not from the older copies kept at install", async () => {
    const worker = startWorker();
    deploy(worker, "build-1");
    await worker.install();
    deploy(worker, "build-2");
    await visit(worker, "/");
    await visit(worker, "/dashboard");

    worker.network.online = false;

    expect(await visit(worker, "/")).toBe("build-2 /");
    expect(await visit(worker, "/dashboard")).toBe("build-2 /dashboard");
  });

  it("answers the offline page when the network fails and it kept no copy", async () => {
    const worker = startWorker();
    worker.network.online = false;

    const response = await worker.send("/admin/users");

    expect(response?.status).toBe(503);
    expect(await response?.text()).toContain("You are offline");
  });

  it("shows the server's error answer, and keeps the copy it had for when the network fails", async () => {
    const worker = startWorker();
    deploy(worker, "build-1");
    await visit(worker, "/admin");
    worker.network.answer = () => new Response("server error", { status: 500, headers: { "content-type": "text/html" } });

    const error = await worker.send("/admin");
    expect(error?.status).toBe(500);
    expect(await error?.text()).toBe("server error");

    worker.network.online = false;
    expect(await visit(worker, "/admin")).toBe("build-1 /admin");
  });

  // The live site answers a perk link's page (it lists a person's perks and
  // codes, found by the token in the address) with the first of these.
  it.each([
    "private, no-cache, no-store, max-age=0, must-revalidate",
    "no-store",
    "private",
  ])("never keeps a page answered with Cache-Control: %s", async (cacheControl) => {
    const worker = startWorker();
    const link = "/perk/tok_made_up_7f3a";
    worker.network.answer = () =>
      new Response("perks and codes of a made-up person", {
        status: 200,
        headers: { "content-type": "text/html", "cache-control": cacheControl },
      });
    expect(await visit(worker, link)).toBe("perks and codes of a made-up person");

    worker.network.online = false;
    const offline = await worker.send(link);

    expect(offline?.status).toBe(503);
    expect(await offline?.text()).toContain("You are offline");
    expect(worker.storage.urls()).not.toContain(`${ORIGIN}${link}`);
  });

  it.each(["POST", "HEAD"])("passes a %s to a page's address to the network, and keeps nothing", async (method) => {
    const worker = startWorker();
    deploy(worker, "build-1");

    const response = await worker.send("/admin", { method, body: method === "POST" ? "note=made-up" : undefined });

    expect(response?.status).toBe(200);
    expect(worker.network.requests).toEqual([`${method} /admin`]);
    expect(worker.storage.urls()).toEqual([]);
  });
});

describe("public/sw.js — files", () => {
  const BUILT_FILE = "/_next/static/chunks/app/admin/page-1a2b3c4d.js";

  it.each([
    BUILT_FILE,
    "/_next/static/css/app-5e6f7a8b.css",
    "/_next/static/media/font-9c0d1e2f.woff2",
  ])("answers the built file %s from its copy, without asking the network again", async (file) => {
    const worker = startWorker();
    deploy(worker, "build-1");
    await visit(worker, file);
    deploy(worker, "build-2");
    const asked = worker.network.requests.length;

    expect(await visit(worker, file)).toBe(`build-1 ${file}`);
    expect(worker.network.requests.length).toBe(asked);
  });

  it("answers other /_next/ addresses from the network, such as an image resized on request", async () => {
    const worker = startWorker();
    const image = "/_next/image?url=%2Flogo.png&w=64&q=75";
    deploy(worker, "build-1");
    expect(await visit(worker, image)).toBe("build-1 /_next/image");

    deploy(worker, "build-2");

    expect(await visit(worker, image)).toBe("build-2 /_next/image");
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

  it("keeps /manifest.json and /favicon.svg at install, for when the network fails", async () => {
    const worker = startWorker();
    deploy(worker, "build-1");
    await worker.install();

    worker.network.online = false;

    expect(await visit(worker, "/manifest.json")).toBe("build-1 /manifest.json");
    expect(await visit(worker, "/favicon.svg")).toBe("build-1 /favicon.svg");
  });
});

describe("public/sw.js — when nothing can be kept", () => {
  it.each(["/_next/static/chunks/app/admin/page-1a2b3c4d.js", "/manifest.json", "/admin"])(
    "still answers %s from the network",
    async (pathname) => {
      const worker = startWorker();
      deploy(worker, "build-1");
      worker.storage.refuseWrites();

      const response = await worker.send(pathname);

      expect(response?.status).toBe(200);
      expect(await response?.text()).toBe(`build-1 ${pathname}`);
    }
  );
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
