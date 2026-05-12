"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Logo } from "@/components/ui/logo";
import { trackSignup, trackSignupStarted } from "@/lib/analytics/plausible";
import type { SeedData, SeedBusiness, SeedInfluencer } from "@/lib/seed";

// ─── Constants (outside component to avoid re-creation) ──────────────────────

const DEFAULT_BUSINESS_AVATAR = "\uD83C\uDFEA";
const DEFAULT_INFLUENCER_AVATAR = "\uD83C\uDFA4";
export interface AuthFormProps {
  data: SeedData;
  save: (d: SeedData) => void;
  onBack: () => void;
  onAuth: (user: SeedBusiness | SeedInfluencer, role: "business" | "influencer") => void;
  onEnterpriseDemo: () => void;
}

export function AuthForm({
  data,
  save,
  onBack,
  onAuth,
  onEnterpriseDemo,
}: AuthFormProps) {
  const [screen, setScreen] = useState<"login" | "signup" | "signup-form" | "forgot" | "forgot-success">("login");
  const [signupRole, setSignupRole] = useState<"business" | "influencer">("business");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

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
        const role = json.data.user.role === "influencer" ? "influencer" : "business";
        if (role === "business") {
          const biz = json.data.business ?? {
            id: json.data.user.businessId ?? json.data.user.id,
            name: json.data.user.name, type: "", email: json.data.user.email,
            pin: "", avatar: DEFAULT_BUSINESS_AVATAR, size: "small", location: "", industry: "",
          };
          onAuth(biz as SeedBusiness, "business");
        } else {
          const inf = json.data.influencer ?? {
            id: json.data.user.id, displayName: json.data.user.name,
            email: json.data.user.email, pin: "", avatar: DEFAULT_INFLUENCER_AVATAR,
            bio: "", tier: "micro", niches: [], followerCount: 0, engagementRate: 0, platforms: [], location: "",
          };
          onAuth(inf as SeedInfluencer, "influencer");
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

    setLoading(true);
    try {
      // Pull the affiliate code from the cookie set by /api/v1/affiliate/track,
      // so the signup is attributed to the right affiliate. Non-fatal — if the
      // cookie isn't set we just signup normally.
      let affiliateCode: string | undefined;
      if (typeof document !== "undefined") {
        const match = document.cookie.match(/(?:^|;\s*)sp_affiliate=([^;]+)/);
        if (match) affiliateCode = decodeURIComponent(match[1]).slice(0, 16);
      }

      const res = await fetch("/api/v1/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "signup", email, password, name,
          role: signupRole === "business" ? "business" : "influencer",
          ...(affiliateCode ? { affiliateCode, referralCode: affiliateCode } : {}),
        }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message ?? "Signup failed."); setLoading(false); return; }

      trackSignup("free");

      if (signupRole === "business") {
        const biz: SeedBusiness = {
          id: json.data.user.businessId ?? json.data.user.id,
          name, type, email, pin: "", avatar: DEFAULT_BUSINESS_AVATAR,
          size: "small", location: "", industry: type,
        };
        save({ ...data, businesses: [...(data.businesses ?? []), biz] });
        onAuth(biz, "business");
      } else {
        const inf: SeedInfluencer = {
          id: json.data.user.id,
          displayName: name, email, pin: "", avatar: DEFAULT_INFLUENCER_AVATAR,
          bio: "", tier: "micro", niches: [],
          followerCount: 0, engagementRate: 0, platforms: [], location: "",
        };
        save({ ...data, influencers: [...(data.influencers ?? []), inf] });
        onAuth(inf, "influencer");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [name, signupRole, type, email, password, data, save, onAuth]);

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
    trackSignupStarted(role);
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
              <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="Your password" required />
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
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand-cyan hover:underline">Terms</a>
            {" "}and{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-cyan hover:underline">Privacy Policy</a>
          </p>
        </Card>
      </div>
    </div>
  );
}
