"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";

// ── Portals (lazy-loaded for code splitting) ─────────────────────────────
import { AuthForm } from "@/components/auth/auth-form";
import dynamic from "next/dynamic";
import { DashboardSkeleton, InfluencerDashboardSkeleton, EnterpriseDashboardSkeleton } from "@/components/ui/portal-skeletons";

const BusinessPortal = dynamic(
  () => import("@/components/business/portal").then(m => ({ default: m.BusinessPortal })),
  { loading: () => <DashboardSkeleton /> }
);

const InfluencerPortal = dynamic(
  () => import("@/components/influencer/portal").then(m => ({ default: m.InfluencerPortal })),
  { loading: () => <InfluencerDashboardSkeleton /> }
);

const EnterprisePortal = dynamic(
  () => import("@/components/enterprise/portal").then(m => ({ default: m.EnterprisePortal })),
  { loading: () => <EnterpriseDashboardSkeleton /> }
);

// ── Landing Components ───────────────────────────────────────────────────
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { Hero } from "@/components/landing/hero";

const HowItWorks = dynamic(() => import("@/components/landing/how-it-works").then(m => m.HowItWorks));
const AudienceSections = dynamic(() => import("@/components/landing/audience-sections").then(m => m.AudienceSections));
const Testimonials = dynamic(() => import("@/components/landing/testimonials").then(m => m.Testimonials));
const PricingTable = dynamic(() => import("@/components/landing/pricing-table").then(m => m.PricingTable));
const PricingSection = dynamic(() => import("@/components/landing/pricing-section").then(m => m.PricingSection));
const SocialProof = dynamic(() => import("@/components/landing/social-proof").then(m => m.SocialProof));
const CtaSection = dynamic(() => import("@/components/landing/cta-section").then(m => m.CtaSection));

// ── UI & Data ────────────────────────────────────────────────────────────
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocalStorage } from "@/lib/hooks/use-store";
import { useAuth } from "@/lib/hooks/use-auth";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { AppProvider, useAppContext } from "@/lib/context/app-context";
import { createSeedData } from "@/lib/seed";
import type { SeedData, SeedBusiness, SeedInfluencer } from "@/lib/seed";

/*  ═══════════════════════════════════════════════════════════════════
    SOCIAL PERKS — The Marketing Value Protocol

    Architecture: Frontend displays, backend thinks.
    AI logic lives in /api/v1/ai/* routes — never runs client-side.
    ═══════════════════════════════════════════════════════════════════ */

// ─── Constant seed data (created once, outside component) ────────────────

const INITIAL_SEED_DATA = createSeedData();

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
        <Testimonials />
        <PricingTable />
        <PricingSection />
        <CtaSection />
      </div>
      <Footer />
    </div>
  );
});

// ═══════════════ App Content (inside AppProvider) ═══════════════

function SocialPerksAppContent() {
  const { value: data, setValue: setData, ready } = useLocalStorage<SeedData>(
    "sp-v2",
    INITIAL_SEED_DATA
  );

  // Auth state managed by useAuth hook (handles session restore + API logout)
  const { user: authUser, logout: authLogout, restoring } = useAuth();

  // App-wide state from context (screen, userRole, theme)
  const { state: appState, dispatch } = useAppContext();
  const screen = appState.screen;
  const userRole = appState.userRole;

  // currentUser tracks the rich SeedBusiness/SeedInfluencer object for portals
  const [currentUser, setCurrentUser] = React.useState<SeedBusiness | SeedInfluencer | null>(null);

  const save = useCallback(
    (next: SeedData) => {
      setData(next);
    },
    [setData]
  );

  // When the auth hook restores a session, update screen & role AND derive currentUser from seed data
  useEffect(() => {
    if (restoring) return;
    if (authUser && !currentUser) {
      const role = authUser.role === "influencer" ? "influencer" as const : "business" as const;
      dispatch({ type: 'SET_AUTH', payload: { screen: role, userRole: role } });

      // Try to restore currentUser from localStorage first (persisted on login)
      try {
        const stored = localStorage.getItem("sp-current-user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.email === authUser.email) {
            setCurrentUser(parsed);
            return;
          }
        }
      } catch {
        // Ignore parse errors
      }

      // Fall back to deriving from seed data
      if (role === "business") {
        const biz = data.businesses.find(b => b.email === authUser.email || b.id === authUser.id);
        if (biz) {
          setCurrentUser(biz);
          try { localStorage.setItem("sp-current-user", JSON.stringify(biz)); } catch { /* ignore */ }
        } else {
          // User signed up (not in seed data) — construct a minimal SeedBusiness
          const fallbackBiz: SeedBusiness = {
            id: (authUser as unknown as Record<string, string>).businessId ?? authUser.id,
            name: authUser.name,
            type: "",
            email: authUser.email,
            pin: "",
            avatar: "\uD83C\uDFEA",
            size: "small",
            location: "",
            industry: "",
          };
          setCurrentUser(fallbackBiz);
          try { localStorage.setItem("sp-current-user", JSON.stringify(fallbackBiz)); } catch { /* ignore */ }
        }
      } else {
        const inf = data.influencers.find(i => i.email === authUser.email || i.id === authUser.id);
        if (inf) {
          setCurrentUser(inf);
          try { localStorage.setItem("sp-current-user", JSON.stringify(inf)); } catch { /* ignore */ }
        } else {
          // User signed up (not in seed data) — construct a minimal SeedInfluencer
          const fallbackInf: SeedInfluencer = {
            id: authUser.id,
            displayName: authUser.name,
            email: authUser.email,
            pin: "",
            avatar: "\uD83C\uDFA4",
            bio: "",
            tier: "micro",
            niches: [],
            followerCount: 0,
            engagementRate: 0,
            platforms: [],
            location: "",
          };
          setCurrentUser(fallbackInf);
          try { localStorage.setItem("sp-current-user", JSON.stringify(fallbackInf)); } catch { /* ignore */ }
        }
      }
    }
  }, [restoring, authUser, currentUser, data, dispatch]);

  // Listen for hash-based navigation from landing page components
  // Nav, Hero, and CTA buttons use href="#login" / href="#signup"
  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash;
      if (hash === "#login" || hash === "#signup") {
        dispatch({ type: 'SET_SCREEN', payload: 'auth' });
        // Clear hash so back button works naturally
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
    window.addEventListener("hashchange", handleHashChange);
    // Also check on mount in case the page loaded with a hash
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [dispatch]);

  const handleAuth = useCallback((user: SeedBusiness | SeedInfluencer, role: "business" | "influencer") => {
    setCurrentUser(user);
    dispatch({ type: 'SET_AUTH', payload: { screen: role, userRole: role } });
    try { localStorage.setItem("sp-current-user", JSON.stringify(user)); } catch { /* ignore */ }
  }, [dispatch]);

  const handleLogout = useCallback(async () => {
    await authLogout();
    setCurrentUser(null);
    dispatch({ type: 'LOGOUT' });
    try { localStorage.removeItem("sp-current-user"); } catch { /* ignore */ }
  }, [authLogout, dispatch]);

  const handleBackToLanding = useCallback(() => {
    dispatch({ type: 'SET_SCREEN', payload: 'landing' });
  }, [dispatch]);

  const handleEnterpriseDemo = useCallback(() => {
    dispatch({ type: 'SET_SCREEN', payload: 'enterprise' });
  }, [dispatch]);

  // ── Keyboard Shortcuts ───────────────────────────────────────────────────
  // Escape: return to previous screen (auth -> landing, portal -> landing)
  // Cmd+K / Ctrl+K: focus search (future) — placeholder for extensibility
  const shortcutsRef = useRef(screen);
  shortcutsRef.current = screen;
  const shortcuts = useMemo(() => [
    {
      key: "Escape",
      handler: () => {
        const current = shortcutsRef.current;
        if (current === "auth") {
          dispatch({ type: 'SET_SCREEN', payload: 'landing' });
        }
      },
    },
  ], [dispatch]);
  useKeyboardShortcuts(shortcuts);

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
      <main id="main-content" role="main">
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

// ═══════════════ Main App (wraps with AppProvider) ═══════════════

export function SocialPerksApp() {
  return (
    <AppProvider>
      <SocialPerksAppContent />
    </AppProvider>
  );
}
