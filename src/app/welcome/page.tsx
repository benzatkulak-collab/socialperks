"use client";

// ══════════════════════════════════════════════════════════════════════════════
// /welcome — Post-signup onboarding entry point.
//
// New users land here after signup. If they've already completed onboarding
// (sp-onboarded set in localStorage), we redirect to /dashboard so they don't
// re-run the wizard.
//
// Auth note: this codebase uses client-side auth (localStorage tokens). A
// server-component `requireAuth()` pattern would require refactoring the auth
// system; instead we mirror the existing /dashboard page, which is also a
// thin client component over a shared client tree.
// ══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export default function WelcomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // If the user has already finished onboarding, send them straight to the
    // dashboard. The "Go through onboarding again" link in dashboard settings
    // can clear sp-onboarded to bring them back here.
    try {
      const onboardedAt = window.localStorage.getItem("sp-onboarded");
      if (onboardedAt) {
        router.replace("/dashboard");
        return;
      }
    } catch {
      // localStorage unavailable — just show the wizard.
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-brand-dim text-sm">Loading…</div>
      </div>
    );
  }

  return <OnboardingWizard />;
}
