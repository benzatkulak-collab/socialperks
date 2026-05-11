"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SocialPerksApp } from "@/components/app";
import { useAuth } from "@/lib/hooks/use-auth";

export default function DashboardPage() {
  const { user, restoring } = useAuth();
  const router = useRouter();

  // While the session is restoring, show a loading spinner instead of
  // letting downstream portals try to render data for a user that
  // doesn't exist yet.
  useEffect(() => {
    if (!restoring && !user) {
      router.replace("/auth");
    }
  }, [restoring, user, router]);

  if (restoring) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        role="status"
        aria-label="Loading dashboard"
      >
        <div className="text-center">
          <div
            className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-gradient-to-br from-brand-cyan to-brand-cyan/60 mb-4 animate-pulse-slow"
            aria-hidden="true"
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <path
                d="M10 2L18 10L10 18L2 10L10 2Z"
                fill="currentColor"
                className="text-brand-bg"
              />
            </svg>
          </div>
          <div className="text-sm text-brand-dim font-medium">
            Loading your dashboard&hellip;
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated — redirect is firing in the effect above.
  // Render a quiet placeholder while the navigation completes so we
  // never feed a null user into downstream portal components.
  if (!user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        role="status"
        aria-label="Redirecting to sign in"
      >
        <div className="text-sm text-brand-dim">Redirecting to sign in&hellip;</div>
      </div>
    );
  }

  return <SocialPerksApp />;
}
