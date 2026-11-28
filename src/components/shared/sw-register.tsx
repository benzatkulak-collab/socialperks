"use client";

import { useEffect } from "react";

/**
 * SWRegister — Client component that registers the service worker.
 *
 * Placed in the root layout so it runs once on app startup.
 * Renders nothing visible.
 *
 * Production builds only. The worker answers files under /_next/static/ from
 * its copy, because a production build names them by a hash of their content.
 * `next dev` does not (`chunks/app/admin/page.js` keeps its name from one edit
 * to the next), so a worker there would run code that is no longer there. In
 * development this removes a worker left from an earlier visit, with its copies.
 */
export function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      removeWorker();
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Check for updates periodically (every 60 minutes)
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });
  }, []);

  return null;
}

/** Unregisters this site's /sw.js, if a visit before registered it, and deletes the caches it kept (`sp-*`). */
function removeWorker() {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      Promise.all(registrations.filter(isThisSitesWorker).map((registration) => registration.unregister()))
    )
    .catch(() => {});

  if (typeof caches === "undefined") return;
  caches
    .keys()
    .then((names) => Promise.all(names.filter((name) => name.startsWith("sp-")).map((name) => caches.delete(name))))
    .catch(() => {});
}

function isThisSitesWorker(registration: ServiceWorkerRegistration): boolean {
  const worker = registration.active ?? registration.waiting ?? registration.installing;
  if (!worker) return false;
  try {
    return new URL(worker.scriptURL).pathname === "/sw.js";
  } catch {
    return false;
  }
}
