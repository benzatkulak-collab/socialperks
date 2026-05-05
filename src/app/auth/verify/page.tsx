/**
 * /auth/verify — Magic-link consumption page.
 *
 * Reads ?token= from the URL, posts it to the verify API, and on
 * success redirects to /dashboard. On failure shows a clean error
 * card with a "Send a new link" CTA.
 *
 * Wrapped in Suspense at the page level so useSearchParams works
 * inside the static-shell render path Next.js prefers.
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import { VerifyClient } from "./verify-client";

export const metadata: Metadata = {
  title: "Verifying sign-in · Social Perks",
  robots: { index: false, follow: false },
  alternates: { canonical: "/auth/verify" },
};

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main id="main-content" className="min-h-screen flex items-center justify-center bg-brand-bg text-brand-text px-4">
          <div className="text-sm text-brand-dim">Verifying&hellip;</div>
        </main>
      }
    >
      <VerifyClient />
    </Suspense>
  );
}
