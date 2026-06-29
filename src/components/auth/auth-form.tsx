"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Logo } from "@/components/ui/logo";
import type { SeedData, SeedBusiness, SeedInfluencer } from "@/lib/seed";
import { track, identify } from "@/lib/analytics";

// ─── Constants (outside component to avoid re-creation) ──────────────────────

const DEFAULT_BUSINESS_AVATAR = "\uD83C\uDFEA";
const DEFAULT_INFLUENCER_AVATAR = "\uD83C\uDFA4";
export interface AuthFormProps {
  data: SeedData;
  save: (d: SeedData) => void;
  /**
   * The auth intent captured from the landing hash before it was cleared, e.g.
   * "signup", "login", or "signup?plan=professional&period=annual". Used to pick
   * the initial screen (so `#signup` opens signup, not login) and to recover plan
   * intent — window.location.hash is no longer readable here (app.tsx strips it).
   */
  initialHash?: string;
  onBack: () => void;
  onAuth: (
    user: SeedBusiness | SeedInfluencer,
    role: "business" | "influencer" | "enterprise"
  ) => void;
  onEnterpriseDemo: () => void;
}

export function AuthForm({
  data,
  save,
  initialHash = "",
  onBack,
  onAuth,
  onEnterpriseDemo,
}: AuthFormProps) {
  // Default to the signup screen when the visitor arrived via a "#signup" CTA
  // (the primary hero/landing CTAs). Previously this always opened on "login",
  // so first-time visitors saw "Welcome back" and had to hunt for "Sign up free".
  const [screen, setScreen] = useState<"login" | "signup" | "signup-form" | "forgot" | "forgot-success">(
    initialHash.startsWith("signup") ? "signup" : "login"
  );
  const [signupRole, setSignupRole] = useState<"business" | "influencer">("business");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Plan intent — captured from the pricing page CTAs which encode
  //   /dashboard#signup?plan=professional&period=annual
  // Persisted to localStorage so it survives the navigation. Used to:
  //   1. Show a confirmation banner ("You picked the Pro plan...")
  //   2. After signup completes, hand off directly to /api/v1/billing
  //      with the right plan/period so the user lands in checkout.
  const [planIntent, setPlanIntent] = useState<{
    plan: "starter" | "professional" | "enterprise";
    period: "monthly" | "annual";
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // initialHash is "signup?plan=professional&period=annual" (captured by app.tsx
    // before it cleared the URL hash) so we parse it ourselves — URL.searchParams
    // only reads the query portion.
    const hash = initialHash;
    const [, queryString] = hash.split("?");
    if (!queryString) {
      // Fall back to any persisted intent so a refresh doesn't lose it.
      try {
        const stored = window.localStorage.getItem("sp:planIntent");
        if (stored) setPlanIntent(JSON.parse(stored));
      } catch { /* ignore */ }
      return;
    }
    const params = new URLSearchParams(queryString);
    const plan = params.get("plan");
    const period = params.get("period") ?? "monthly";
    if (
      (plan === "starter" || plan === "professional" || plan === "enterprise") &&
      (period === "monthly" || period === "annual")
    ) {
      const intent: {
        plan: "starter" | "professional" | "enterprise";
        period: "monthly" | "annual";
      } = { plan, period };
      setPlanIntent(intent);
      try {
        window.localStorage.setItem("sp:planIntent", JSON.stringify(intent));
      } catch { /* ignore */ }
      // 30-second fast path: when plan intent is present, the user has
      // already self-identified as a business buyer. Skip the role
      // picker entirely and drop them on the business signup form.
      setSignupRole("business");
      setScreen("signup-form");
    }
  }, [initialHash]);

  const handleLogin = useCallback(async () => {
    setError("");
    if (!email) { setError("Email is required."); return; }
    if (!password) { setError("Password is required."); return; }

    setLoading(true);
    try {
      // Try password login
      const res = await fetch("/api/v1/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "login", email, password }),
      });
      const json = await res.json();

      if (json.success) {
        // Previously collapsed any non-influencer role to "business",
        // so enterprise@demo.com landed in the regular business portal
        // with no multi-location / brand-manager / reports UI. Map
        // enterprise as its own role.
        const rawRole = json.data.user.role;
        const role: "business" | "influencer" | "enterprise" =
          rawRole === "influencer" ? "influencer" :
          rawRole === "enterprise" ? "enterprise" :
          "business";
        if (role === "influencer") {
          const inf = json.data.influencer ?? {
            id: json.data.user.id, displayName: json.data.user.name,
            email: json.data.user.email, pin: "", avatar: DEFAULT_INFLUENCER_AVATAR,
            bio: "", tier: "micro", niches: [], followerCount: 0, engagementRate: 0, platforms: [], location: "",
          };
          onAuth(inf as SeedInfluencer, "influencer");
        } else {
          // Business + enterprise both use the SeedBusiness shape.
          const biz = json.data.business ?? {
            id: json.data.user.businessId ?? json.data.user.id,
            name: json.data.user.name, type: "", email: json.data.user.email,
            pin: "", avatar: DEFAULT_BUSINESS_AVATAR, size: "small", location: "", industry: "",
          };
          onAuth(biz as SeedBusiness, role);
        }
        return;
      }

      // Fall back to PIN for demo accounts
      const pinRes = await fetch("/api/v1/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "login", email, pin: password }),
      });
      const pinJson = await pinRes.json();

      if (pinJson.success) {
        if (pinJson.data.business) {
          onAuth(pinJson.data.business as SeedBusiness, "business");
        } else if (pinJson.data.influencer) {
          onAuth(pinJson.data.influencer as SeedInfluencer, "influencer");
        }
        return;
      }

      setError("Invalid email or password.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email, password, onAuth]);

  const handleSignup = useCallback(async () => {
    setError("");
    if (!name) { setError("Name is required."); return; }
    if (signupRole === "business" && !type) { setError("Business type is required."); return; }
    if (!email) { setError("Email is required."); return; }
    if (!password || password.length < 8) { setError("Password must be at least 8 characters."); return; }

    // Funnel: signup_started fires once validation passes and we're
    // about to hit the auth endpoint. Captures the pre-decided plan
    // intent so we can correlate pricing CTA clicks → signup attempts.
    track("signup_started", {
      role: signupRole,
      planIntent: planIntent?.plan ?? null,
      planPeriod: planIntent?.period ?? null,
    });

    setLoading(true);
    try {
      // Referral attribution: read the sp-ref code captured on a ?ref= visit
      // (ref-capture.tsx persists it to both a cookie and localStorage). Without
      // forwarding it here the captured code never reached signup, so the auth
      // route's trackReferralSignup never fired and referrers were never
      // credited — the referral channel was a no-op end-to-end despite the
      // tables, capture, and webhook crediting all being built.
      const refMatch = document.cookie.match(/(?:^|;\s*)sp-ref=([^;]+)/);
      const referralCode = refMatch
        ? decodeURIComponent(refMatch[1])
        : window.localStorage.getItem("sp-ref");

      const res = await fetch("/api/v1/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "signup", email, password, name,
          role: signupRole === "business" ? "business" : "influencer",
          ...(referralCode ? { referralCode } : {}),
        }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message ?? "Signup failed."); setLoading(false); return; }

      if (signupRole === "business") {
        const biz: SeedBusiness = {
          id: json.data.user.businessId ?? json.data.user.id,
          name, type, email, pin: "", avatar: DEFAULT_BUSINESS_AVATAR,
          size: "small", location: "", industry: type,
        };
        save({ ...data, businesses: [...(data.businesses ?? []), biz] });

        // ── Plan-intent handoff to Stripe checkout ─────────────────────
        // The user picked a paid plan on the pricing page before signing
        // up. Hand them off directly to Stripe checkout instead of dropping
        // them on the dashboard — the funnel was previously broken here
        // and we'd lose the conversion. Free and enterprise tiers skip
        // checkout (free needs no payment; enterprise routes via /contact).
        if (
          planIntent &&
          (planIntent.plan === "starter" || planIntent.plan === "professional")
        ) {
          try {
            const origin = window.location.origin;
            const checkoutRes = await fetch("/api/v1/billing", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                action: "create_checkout",
                plan: planIntent.plan,
                billingPeriod: planIntent.period,
                businessId: biz.id,
                successUrl: `${origin}/dashboard?welcome=1&checkout=success`,
                cancelUrl: `${origin}/dashboard?checkout=cancelled`,
              }),
            });
            const checkoutJson: {
              success: boolean;
              data?: { url?: string; mock?: boolean };
              error?: { code: string; message: string };
            } = await checkoutRes.json();

            if (checkoutJson.success && checkoutJson.data?.url) {
              // Clear the intent so a back-button doesn't re-trigger.
              try {
                window.localStorage.removeItem("sp:planIntent");
              } catch { /* ignore */ }
              // For mock URLs in dev/staging, still surface the URL but
              // log a warning so the developer knows it's not real.
              if (checkoutJson.data.mock) {
                console.warn(
                  "[billing] redirecting to mock Stripe URL — Stripe is not configured on this server"
                );
              }
              // Funnel: fire checkout_started right before the redirect.
              // checkout_completed fires on the success page (read by
              // the dashboard via ?checkout=success).
              track("checkout_started", {
                plan: planIntent.plan,
                period: planIntent.period,
                mock: checkoutJson.data.mock ?? false,
              });
              window.location.href = checkoutJson.data.url;
              return;
            }

            // Checkout failed: don't block the signup. The user is fully
            // authenticated; surface the message and drop them on the
            // dashboard where they can retry from /dashboard/billing.
            const billingMessage =
              checkoutJson.error?.code === "BILLING_UNAVAILABLE"
                ? "Your account is created. Billing isn't quite set up yet — we'll email you when it's live."
                : `Your account is created. We couldn't start checkout (${checkoutJson.error?.message ?? "unknown error"}). You can retry from your dashboard.`;
            setError(billingMessage);
          } catch (e) {
            // Network error mid-checkout. Same recovery: signup succeeded,
            // just couldn't redirect.
            console.error("[billing] checkout handoff failed", e);
            setError(
              "Your account is created, but we couldn't start checkout. You can retry from your dashboard."
            );
          }
        }

        // Funnel: signup_completed fires once the account is fully
        // created and the user is about to be transitioned into the
        // authenticated portal. We also identify() with the stable
        // userId so future events on this device tie back to this
        // account. NEVER pass email here — identify() is for IDs only.
        identify(biz.id, { role: "business" });
        track("signup_completed", {
          role: "business",
          planIntent: planIntent?.plan ?? null,
        });

        onAuth(biz, "business");
      } else {
        const inf: SeedInfluencer = {
          id: json.data.user.id,
          displayName: name, email, pin: "", avatar: DEFAULT_INFLUENCER_AVATAR,
          bio: "", tier: "micro", niches: [],
          followerCount: 0, engagementRate: 0, platforms: [], location: "",
        };
        save({ ...data, influencers: [...(data.influencers ?? []), inf] });
        identify(inf.id, { role: "influencer" });
        track("signup_completed", { role: "influencer" });
        onAuth(inf, "influencer");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [name, signupRole, type, email, password, data, save, onAuth, planIntent]);

  const handleForgotPassword = useCallback(async () => {
    setError("");
    if (!resetEmail) { setError("Email is required."); return; }
    setLoading(true);
    try {
      await fetch("/api/v1/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "reset-password", email: resetEmail }),
      });
      // Always show success to prevent email enumeration
      setScreen("forgot-success");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [resetEmail]);

  const handleGoToForgot = useCallback(() => {
    setScreen("forgot");
    setError("");
    setResetEmail(email);
  }, [email]);

  const handleGoToSignup = useCallback(() => {
    setScreen("signup");
    setError("");
  }, []);

  const handleGoToLogin = useCallback(() => {
    setScreen("login");
    setError("");
  }, []);

  const handleGoToLoginFromSuccess = useCallback(() => {
    setScreen("login");
    setError("");
    setResetEmail("");
  }, []);

  const handleGoToSignupForm = useCallback((role: "business" | "influencer") => {
    setSignupRole(role);
    setScreen("signup-form");
  }, []);

  const handleBackToSignup = useCallback(() => {
    setScreen("signup");
    setError("");
  }, []);

  const handleToggleDemo = useCallback(() => setShowDemo((prev) => !prev), []);

  const inputSection = (
    <>
      {error && (
        <div
          className="text-xs text-brand-red mb-3 rounded-md bg-brand-red/5 border border-brand-red/20 px-3 py-2"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
    </>
  );

  // ─── Login Screen ───
  if (screen === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-sm animate-fade-up">
          <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-brand-dim hover:text-brand-text mb-6 py-2 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40">
            &larr; Back
          </button>

          <Card className="p-8">
            <div className="text-center mb-8">
              <Logo size="md" />
              <h1 className="mt-4 font-heading text-xl italic text-brand-white sm:text-2xl">Welcome back</h1>
              <p className="text-sm text-brand-dim mt-1">Log in to your account</p>
            </div>

            <div className="space-y-4">
              <Field label="Email" value={email} onChange={setEmail} placeholder="you@yourbusiness.com" type="email" required />
              <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="At least 8 characters" required />
            </div>

            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleGoToForgot}
                className="text-xs text-brand-cyan hover:underline rounded-sm py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
              >
                Forgot password?
              </button>
            </div>

            {inputSection}

            <Button fullWidth onClick={handleLogin} className="py-3 text-sm rounded-lg mt-4" disabled={loading} aria-busy={loading}>
              {loading ? "Logging in..." : "Log In"}
            </Button>

            <p className="text-center text-sm text-brand-dim mt-6">
              Don&apos;t have an account?{" "}
              <button onClick={handleGoToSignup} className="text-brand-cyan hover:underline font-medium rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40">
                Sign up free
              </button>
            </p>

            {/* Demo accounts */}
            <div className="mt-6 pt-5 border-t border-brand-border">
              <button
                type="button"
                onClick={handleToggleDemo}
                className="w-full text-xs text-brand-muted hover:text-brand-dim text-center transition-colors py-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
              >
                {showDemo ? "Hide demo accounts" : "Try a demo account"} {showDemo ? "\u25B2" : "\u25BC"}
              </button>
              {showDemo && (
                <div className="text-xs text-brand-muted mt-3 text-center leading-relaxed animate-fade-up bg-brand-elevated/50 rounded-lg p-3">
                  <p className="text-brand-dim font-medium mb-1">Password for all: 1234</p>
                  <p>yoga@demo.com &middot; sol@demo.com &middot; glow@demo.com</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Forgot Password ───
  if (screen === "forgot") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-sm animate-fade-up">
          <button onClick={handleGoToLogin} className="inline-flex items-center gap-1 text-xs text-brand-dim hover:text-brand-text mb-6 py-2 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40">
            &larr; Back to login
          </button>

          <Card className="p-8">
            <div className="text-center mb-8">
              <Logo size="md" />
              <h1 className="mt-4 font-heading text-xl italic text-brand-white sm:text-2xl">Reset your password</h1>
              <p className="text-sm text-brand-dim mt-1">Enter your email and we&apos;ll send a reset link</p>
            </div>

            <div className="space-y-4">
              <Field label="Email" value={resetEmail} onChange={setResetEmail} placeholder="you@yourbusiness.com" type="email" required />
            </div>

            {inputSection}

            <Button fullWidth onClick={handleForgotPassword} className="py-3 text-sm rounded-lg mt-4" disabled={loading} aria-busy={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Forgot Password Success ───
  if (screen === "forgot-success") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-sm animate-fade-up">
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">&#x2709;&#xFE0F;</div>
              <h1 className="font-heading text-xl italic text-brand-white sm:text-2xl">Check your email</h1>
              <p className="text-sm text-brand-dim mt-2">
                We sent a password reset link to <span className="text-brand-cyan font-medium">{resetEmail}</span>
              </p>
              <p className="text-xs text-brand-muted mt-3">
                Didn&apos;t receive it? Check your spam folder or try again.
              </p>
            </div>

            <Button fullWidth onClick={handleGoToLoginFromSuccess} className="py-3 text-sm rounded-lg">
              Back to Login
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Signup: Choose Role ───
  if (screen === "signup") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-sm animate-fade-up">
          <button onClick={handleGoToLogin} className="inline-flex items-center gap-1 text-xs text-brand-dim hover:text-brand-text mb-6 py-2 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40">
            &larr; Back to login
          </button>

          <Card className="p-8">
            <div className="text-center mb-8">
              <Logo size="md" />
              <h1 className="mt-4 font-heading text-xl italic text-brand-white sm:text-2xl">Create your account</h1>
              <p className="text-sm text-brand-dim mt-1">What describes you best?</p>
            </div>

            {/* Plan intent banner — shows the plan/period the user picked
                on the pricing page so they know it carried through. After
                signup completes we'll route them to checkout with the
                same selection. If the user picked monthly, surface the
                annual upsell inline — switching costs nothing here and
                the savings are typically ~17% (2 months free at our
                price points). */}
            {planIntent && (
              <div
                className="mb-6 rounded-xl border border-brand-cyan/30 bg-brand-cyan/5 px-4 py-3 text-sm"
                role="status"
                aria-live="polite"
              >
                <p className="text-brand-text">
                  After signup we&apos;ll set you up with the{" "}
                  <strong className="text-brand-cyan">
                    {planIntent.plan === "professional"
                      ? "Pro"
                      : planIntent.plan === "starter"
                        ? "Starter"
                        : "Enterprise"}
                  </strong>{" "}
                  plan, billed{" "}
                  <strong>{planIntent.period === "annual" ? "annually" : "monthly"}</strong>
                  .
                </p>
                {planIntent.period === "monthly" && planIntent.plan !== "enterprise" && (
                  <div className="mt-3 pt-3 border-t border-brand-cyan/20 flex items-start justify-between gap-3">
                    <p className="text-xs text-brand-text-dim">
                      <strong className="text-brand-text">Save ~17%</strong> on annual billing —
                      that&apos;s {planIntent.plan === "professional" ? "$98" : "$58"} off per
                      year (two months free).
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...planIntent, period: "annual" as const };
                        setPlanIntent(next);
                        try {
                          window.localStorage.setItem("sp:planIntent", JSON.stringify(next));
                        } catch {
                          /* ignore */
                        }
                      }}
                      className="shrink-0 px-3 py-1.5 bg-brand-cyan text-black text-xs font-medium rounded hover:bg-brand-cyan/90"
                    >
                      Switch to annual
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => handleGoToSignupForm("business")}
                className="w-full rounded-xl border border-brand-border bg-brand-surface/50 p-5 text-left transition-all hover:border-brand-cyan hover:bg-brand-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏪</span>
                  <div>
                    <p className="text-sm font-semibold text-brand-white">I&apos;m a business</p>
                    <p className="text-xs text-brand-dim mt-0.5">I want customers to promote my business for a discount</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleGoToSignupForm("influencer")}
                className="w-full rounded-xl border border-brand-border bg-brand-surface/50 p-5 text-left transition-all hover:border-brand-pink hover:bg-brand-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎨</span>
                  <div>
                    <p className="text-sm font-semibold text-brand-white">I&apos;m a creator</p>
                    <p className="text-xs text-brand-dim mt-0.5">I want to earn rewards by posting about local businesses</p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={onEnterpriseDemo}
              className="w-full mt-4 text-xs text-brand-purple hover:text-brand-purple/80 text-center transition-colors py-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/40"
            >
              Enterprise? See a demo &rarr;
            </button>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Signup: Form ───
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-sm animate-fade-up">
        <button onClick={handleBackToSignup} className="inline-flex items-center gap-1 text-xs text-brand-dim hover:text-brand-text mb-6 py-2 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40">
          &larr; Back
        </button>

        <Card className="p-8">
          <div className="text-center mb-8">
            <span className="text-3xl">{signupRole === "business" ? "🏪" : "🎨"}</span>
            <h1 className="mt-3 font-heading text-xl italic text-brand-white sm:text-2xl">
              {signupRole === "business" ? "Set up your business" : "Create your creator profile"}
            </h1>
          </div>

          <div className="space-y-4">
            <Field
              label={signupRole === "business" ? "Business Name" : "Display Name"}
              value={name}
              onChange={setName}
              placeholder={signupRole === "business" ? "Maria's Coffee Shop" : "Your creator name"}
              required
            />
            {signupRole === "business" && (
              <Field label="Business Type" value={type} onChange={setType} placeholder="Coffee Shop, Yoga Studio, Salon..." required />
            )}
            <Field label="Email" value={email} onChange={setEmail} placeholder="you@email.com" type="email" required />
            <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="At least 8 characters" required minLength={8} />
          </div>

          {inputSection}

          <Button fullWidth onClick={handleSignup} className="py-3 text-sm rounded-lg mt-4" disabled={loading} aria-busy={loading}>
            {loading ? "Creating account..." : "Create Free Account"}
          </Button>

          <p className="text-center text-xs text-brand-dim mt-4">
            By signing up you agree to our{" "}
            <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand-cyan hover:underline">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-cyan hover:underline">Privacy Policy</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
