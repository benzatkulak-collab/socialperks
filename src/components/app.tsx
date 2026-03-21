"use client";

import React, { useState, useCallback, useEffect } from "react";

// ── Portals ──────────────────────────────────────────────────────────────
import { AuthForm } from "@/components/auth/auth-form";
import { BusinessPortal } from "@/components/business/portal";
import { InfluencerPortal } from "@/components/influencer/portal";
import { EnterprisePortal } from "@/components/enterprise/portal";

// ── Landing Components ───────────────────────────────────────────────────
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { AgentTicker } from "@/components/shared/agent-ticker";
import { Hero } from "@/components/landing/hero";
import dynamic from "next/dynamic";

const HowItWorks = dynamic(() => import("@/components/landing/how-it-works").then(m => m.HowItWorks));
const AudienceSections = dynamic(() => import("@/components/landing/audience-sections").then(m => m.AudienceSections));
const PlatformShowcase = dynamic(() => import("@/components/landing/platform-showcase").then(m => m.PlatformShowcase));
const PricingSection = dynamic(() => import("@/components/landing/pricing-section").then(m => m.PricingSection));
const SocialProof = dynamic(() => import("@/components/landing/social-proof").then(m => m.SocialProof));
const CtaSection = dynamic(() => import("@/components/landing/cta-section").then(m => m.CtaSection));

// ── UI & Data ────────────────────────────────────────────────────────────
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocalStorage } from "@/lib/hooks/use-store";
import { createSeedData } from "@/lib/seed";
import type { SeedData, SeedBusiness, SeedInfluencer } from "@/lib/seed";

/*  ═══════════════════════════════════════════════════════════════════
    SOCIAL PERKS — The Marketing Value Protocol

    Architecture: Frontend displays, backend thinks.
    AI logic lives in /api/v1/ai/* routes — never runs client-side.
    ═══════════════════════════════════════════════════════════════════ */

// ═══════════════ Error Boundary ═══════════════

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-5">
          <Card className="max-w-md w-full text-center p-8">
            <div className="text-3xl mb-4">&#9888;</div>
            <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
            <p className="text-xs text-brand-dim mb-4">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <Button
              size="sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </Button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════ Landing ═══════════════

function Landing() {
  return (
    <div className="min-h-screen">
      <Nav />
      <Hero />
      <AgentTicker />
      <HowItWorks />
      <AudienceSections />
      <PlatformShowcase />
      <PricingSection />
      <SocialProof />
      <CtaSection />
      <Footer />
    </div>
  );
}

// ═══════════════ Main App ═══════════════

export function SocialPerksApp() {
  const { value: data, setValue: setData, ready } = useLocalStorage<SeedData>(
    "sp-v2",
    createSeedData()
  );
  const [screen, setScreen] = useState<"landing" | "auth" | "business" | "influencer" | "enterprise">("landing");
  const [currentUser, setCurrentUser] = useState<SeedBusiness | SeedInfluencer | null>(null);
  const [userRole, setUserRole] = useState<"business" | "influencer" | null>(null);

  const save = useCallback(
    (next: SeedData) => {
      setData(next);
    },
    [setData]
  );

  // Listen for hash-based navigation from landing page components
  // Nav, Hero, and CTA buttons use href="#login" / href="#signup"
  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash;
      if (hash === "#login" || hash === "#signup") {
        setScreen("auth");
        // Clear hash so back button works naturally
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
    window.addEventListener("hashchange", handleHashChange);
    // Also check on mount in case the page loaded with a hash
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading">
        <div className="text-center">
          <div className="text-2xl mb-2 animate-pulse-slow" aria-hidden="true">&#9670;</div>
          <div className="text-sm text-brand-dim">Loading Social Perks...</div>
        </div>
      </div>
    );
  }

  function handleAuth(user: SeedBusiness | SeedInfluencer, role: "business" | "influencer") {
    setCurrentUser(user);
    setUserRole(role);
    setScreen(role);
  }

  function handleLogout() {
    setCurrentUser(null);
    setUserRole(null);
    setScreen("landing");
  }

  return (
    <ErrorBoundary>
      {screen === "landing" && <Landing />}
      {screen === "auth" && (
        <AuthForm
          data={data}
          save={save}
          onBack={() => setScreen("landing")}
          onAuth={handleAuth}
          onEnterpriseDemo={() => setScreen("enterprise")}
        />
      )}
      {screen === "business" && currentUser && userRole === "business" && (
        <BusinessPortal
          biz={currentUser as SeedBusiness}
          data={data}
          save={save}
          onLogout={handleLogout}
        />
      )}
      {screen === "influencer" && currentUser && userRole === "influencer" && (
        <InfluencerPortal
          influencer={currentUser as SeedInfluencer}
          data={data}
          onLogout={handleLogout}
        />
      )}
      {screen === "enterprise" && (
        <EnterprisePortal onLogout={handleLogout} />
      )}
    </ErrorBoundary>
  );
}
