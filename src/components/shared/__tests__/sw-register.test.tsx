/**
 * The service worker runs in production builds only.
 *
 * It answers files under /_next/static/ from its copy, because in a
 * production build their names carry a hash of their content. Under
 * `next dev` they do not (`chunks/app/admin/page.js` keeps its name from one
 * edit to the next), so a worker there would run code that is no longer
 * there. In development the component registers nothing, and removes a worker
 * left from an earlier visit together with the copies it kept.
 *
 * All registrations and cache names here are made up.
 */
import { render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SWRegister } from "../sw-register";

const SITE = "http://localhost:3000";

type FakeRegistration = {
  active: { scriptURL: string } | null;
  waiting: null;
  installing: null;
  unregister: ReturnType<typeof vi.fn>;
};

function registrationOf(scriptPath: string): FakeRegistration {
  return { active: { scriptURL: `${SITE}${scriptPath}` }, waiting: null, installing: null, unregister: vi.fn(async () => true) };
}

/** A browser with these worker registrations and these caches. */
function browserWith(registrations: FakeRegistration[], cacheNames: string[]) {
  const container = {
    register: vi.fn(async () => ({ update: vi.fn() })),
    getRegistrations: vi.fn(async () => registrations),
  };
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: container });
  const names = [...cacheNames];
  vi.stubGlobal("caches", {
    keys: vi.fn(async () => [...names]),
    delete: vi.fn(async (name: string) => {
      const at = names.indexOf(name);
      if (at >= 0) names.splice(at, 1);
      return at >= 0;
    }),
  });
  return { container, names };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
});

it("registers /sw.js in a production build", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const { container } = browserWith([], []);

  render(<SWRegister />);

  await waitFor(() => expect(container.register).toHaveBeenCalledWith("/sw.js", { scope: "/" }));
  expect(container.getRegistrations).not.toHaveBeenCalled();
});

it("registers no worker under next dev, and removes one left from an earlier visit with its copies", async () => {
  vi.stubEnv("NODE_ENV", "development");
  const ours = registrationOf("/sw.js");
  const another = registrationOf("/another-worker.js");
  const { container, names } = browserWith([ours, another], ["sp-v3-static", "sp-v4-pages", "another-app-cache"]);

  render(<SWRegister />);

  await waitFor(() => expect(ours.unregister).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(names).toEqual(["another-app-cache"]));
  expect(another.unregister).not.toHaveBeenCalled();
  expect(container.register).not.toHaveBeenCalled();
});
