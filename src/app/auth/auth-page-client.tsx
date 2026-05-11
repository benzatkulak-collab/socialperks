"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { createSeedData } from "@/lib/seed";
import type { SeedData } from "@/lib/seed";

/**
 * Dedicated /auth route — renders the existing AuthForm with the props it
 * requires. On successful auth we hand off to /dashboard, where the main
 * SocialPerksApp resumes the session via the useAuth hook. On "Back" we
 * return to the marketing homepage where the signup CTA also lives.
 */
export function AuthPageClient() {
  const router = useRouter();
  const [data, setData] = useState<SeedData>(() => createSeedData());

  const save = useCallback((next: SeedData) => {
    setData(next);
  }, []);

  const handleAuth = useCallback(() => {
    // After login/signup, persist current-user is handled by /api/v1/auth
    // (httpOnly cookie). The dashboard page picks up the session via useAuth.
    router.push("/dashboard");
  }, [router]);

  const handleBack = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleEnterpriseDemo = useCallback(() => {
    router.push("/demo");
  }, [router]);

  // Memoize so AuthForm doesn't re-render unnecessarily on parent state churn.
  const seedData = useMemo(() => data, [data]);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <AuthForm
        data={seedData}
        save={save}
        onBack={handleBack}
        onAuth={handleAuth}
        onEnterpriseDemo={handleEnterpriseDemo}
      />
    </div>
  );
}
