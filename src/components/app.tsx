"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";

// ── Portals ──────────────────────────────────────────────────────────────
import { AuthForm } from "@/components/auth/auth-form";
import { BusinessPortal } from "@/components/business/portal";
import { InfluencerPortal } from "@/components/influencer/portal";
import { EnterprisePortal } from "@/components/enterprise/portal";

// ── Landing Components ───────────────────────────────────────────────────
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { Hero } from "@/components/landing/hero";
import dynamic from "next/dynamic";

const HowItWorks = dynamic(() => import("@/components/landing/how-it-works").then(m => m.HowItWorks));
const AudienceSections = dynamic(() => import("@/components/landing/audience-sections").then(m => m.AudienceSections));
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

// ─── Initial seed data ────────────────────────────────────────────────────
//
// Demo data (Maria's Coffee, Sunrise Yoga, Priya the influencer, etc.) is
// useful for UX testing and screenshots, but harmful when a real customer
// signs up — they shouldn't see fake businesses pollute the marketplace.
//
// Gate behind ?demo=1 (or the persisted "sp-demo-mode" flag from a
// previous demo session) so the seed is opt-in. Real users get empty
// initial state; the discover/marketplace will populate as real
// campaigns launch.
const EMPTY_SEED_DATA: SeedData = {
  businesses: [],
  influencers: [],
  campaigns: [],
  stats: {
    businessesActive: 0,
    influencersActive: 0,
    reviewsGenerated: 0,
    socialPostsCreated: 0,
    referralsMade: 0,
    totalPerksEarned: 0,
    totalMarketingValue: 0,
    actionsCompleted: 0,
    platformsConnected: 0,
    campaignsRunning: 0,
  },
};

function resolveInitialData() {
  if (typeof window === "undefined") return EMPTY_SEED_DATA;
  const url = new URL(window.location.href);
  const wantsDemo = url.searchParams.get("demo") === "1";
  if (wantsDemo) {
    try { window.localStorage.setItem("sp-demo-mode", "1"); } catch { /* ignore */ }
    return createSeedData();
  }
  try {
    if (window.localStorage.getItem("sp-demo-mode") === "1") {
      return createSeedData();
    }
  } catch { /* ignore */ }
  return EMPTY_SEED_DATA;
}

const INITIAL_SEED_DATA = resolveInitialData();

// ─── Session restore timeout ─────────────────────────────────────────────

const SESSION_RESTORE_TIMEOUT = 5000;

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

const Landing = React.memo(function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <Hero />
      <div className="relative">
        <HowItWorks />
        <AudienceSections />
        <SocialProof />
        <PricingSection />
        <CtaSection />
      </div>
      <Footer />
    </div>
  );
});

// ═══════════════ Main App ═══════════════

export function SocialPerksApp() {
  const { value: data, setValue: setData, ready } = useLocalStorage<SeedData>(
    "sp-v2",
    INITIAL_SEED_DATA
  );
  const [screen, setScreen] = useState<"landing" | "auth" | "business" | "influencer" | "enterprise">("landing");
  const [currentUser, setCurrentUser] = useState<SeedBusiness | SeedInfluencer | null>(null);
  const [userRole, setUserRole] = useState<"business" | "influencer" | null>(null);
  const [restoring, setRestoring] = useState(true);

  const save = useCallback(
    (next: SeedData) => {
      setData(next);
    },
    [setData]
  );

  // Session restoration — attempt to validate an existing session cookie
  // on mount. 5-second timeout prevents slow networks from leaving users
  // stuck on the loading screen.
  //
  // Fast-path: cold visitors arriving from marketing have no auth cookie.
  // Skip the network round-trip entirely so they see the landing screen
  // immediately instead of waiting for the timeout.
  useEffect(() => {
    // Previously this checked `document.cookie` for `sp-access-token=` as a
    // fast path to skip the network call for cold visitors. That doesn't
    // work — the access cookie is HttpOnly, so JS can never see it, and the
    // check always returned false. Result: every refresh dumped logged-in
    // users back to the landing page. Fall back to a non-HttpOnly marker
    // cookie (`sp-session`) that the server sets alongside the real token.
    const hasSessionMarker =
      typeof document !== "undefined" &&
      /(^|;\s*)sp-session=1/.test(document.cookie);
    if (!hasSessionMarker) {
      setRestoring(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SESSION_RESTORE_TIMEOUT);
    async function restoreSession() {
      try {
        const res = await fetch("/api/v1/auth", {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        if (json.success && json.data?.user) {
          const role = json.data.user.role === "influencer" ? "influencer" : "business";
          // The portal render is gated on currentBusiness / currentInfluencer
          // which derive from currentUser. Without restoring this, a valid
          // session would set the screen to "business" but the portal would
          // render nothing (the gating returned null). Build a minimal user
          // shape from the JWT claims; the portal hydrates the rest itself.
          const u = json.data.user as { id: string; email: string; role: string; businessId?: string | null };
          const fallback = u.email.split("@")[0] ?? "User";
          // When demo mode is off (default in production), data.businesses
          // is empty by design — real users shouldn't see seed accounts
          // pollute the marketplace. But the demo-login *itself* still
          // works because the JWT issuance happens on the server, so the
          // user lands on the dashboard with no matching business in the
          // local seed → name falls back to the email prefix ("yoga"
          // instead of "Sunrise Yoga DC"). Look the business up against
          // the full seed file as a secondary source so demo accounts
          // restore with their real names.
          const knownBiz = data.businesses.find((b) => b.id === (u.businessId ?? u.id));
          const knownInf = data.influencers.find((i) => i.id === u.id);
          const seedBiz = knownBiz ?? createSeedData().businesses.find((b) => b.id === (u.businessId ?? u.id));
          const seedInf = knownInf ?? createSeedData().influencers.find((i) => i.id === u.id);
          const restored: Partial<SeedBusiness> & Partial<SeedInfluencer> = {
            id: u.businessId ?? u.id,
            email: u.email,
            ...(role === "business"
              ? {
                  name: seedBiz?.name ?? fallback,
                  avatar: seedBiz?.avatar,
                  type: seedBiz?.type,
                  location: seedBiz?.location,
                  industry: seedBiz?.industry,
                }
              : {
                  displayName: seedInf?.displayName ?? fallback,
                  avatar: seedInf?.avatar,
                }),
          };
          setCurrentUser(restored as SeedBusiness | SeedInfluencer);
          setUserRole(role);
          setScreen(role);
        }
      } catch {
        // Timeout or network error — fall through to landing page
      } finally {
        clearTimeout(timeout);
        if (!cancelled) {
          setRestoring(false);
        }
      }
    }
    restoreSession();
    return () => { cancelled = true; controller.abort(); };
  }, []);

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

  const handleAuth = useCallback((user: SeedBusiness | SeedInfluencer, role: "business" | "influencer") => {
    setCurrentUser(user);
    setUserRole(role);
    setScreen(role);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/v1/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {
      // Best-effort — clear local state regardless
    }
    setCurrentUser(null);
    setUserRole(null);
    setScreen("landing");
  }, []);

  const handleBackToLanding = useCallback(() => setScreen("landing"), []);

  const handleEnterpriseDemo = useCallback(() => setScreen("enterprise"), []);

  // Memoize the current business user cast to avoid re-casting every render
  const currentBusiness = useMemo(
    () => (currentUser && userRole === "business" ? currentUser as SeedBusiness : null),
    [currentUser, userRole]
  );

  const currentInfluencer = useMemo(
    () => (currentUser && userRole === "influencer" ? currentUser as SeedInfluencer : null),
    [currentUser, userRole]
  );

  if (!ready || restoring) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" role="status" aria-label="Loading">
        <div className="text-center">
          <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-gradient-to-br from-brand-cyan to-brand-cyan/60 mb-4 animate-pulse-slow" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <path d="M10 2L18 10L10 18L2 10L10 2Z" fill="currentColor" className="text-brand-bg" />
              <path d="M10 5L15 10L10 15L5 10L10 5Z" fill="currentColor" className="text-brand-bg/60" />
            </svg>
          </div>
          <div className="text-sm text-brand-dim font-medium">Loading Social Perks...</div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <main id="main-content">
        {screen === "landing" && <Landing />}
        {screen === "auth" && (
          <AuthForm
            data={data}
            save={save}
            onBack={handleBackToLanding}
            onAuth={handleAuth}
            onEnterpriseDemo={handleEnterpriseDemo}
          />
        )}
        {screen === "business" && currentBusiness && (
          <BusinessPortal
            biz={currentBusiness}
            data={data}
            save={save}
            onLogout={handleLogout}
          />
        )}
        {screen === "influencer" && currentInfluencer && (
          <InfluencerPortal
            influencer={currentInfluencer}
            data={data}
            save={save}
            onLogout={handleLogout}
          />
        )}
        {screen === "enterprise" && (
          <EnterprisePortal
            onLogout={handleLogout}
            businessId={currentBusiness?.id ?? null}
          />
        )}
      </main>
    </ErrorBoundary>
  );
}
