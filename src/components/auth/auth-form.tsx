"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Logo } from "@/components/ui/logo";
import type { SeedData, SeedBusiness, SeedInfluencer } from "@/lib/seed";

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
  const [screen, setScreen] = useState<"login" | "signup" | "signup-form">("login");
  const [signupRole, setSignupRole] = useState<"business" | "influencer">("business");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  async function handleLogin() {
    setError("");
    if (!email) { setError("Email is required."); return; }
    if (!password) { setError("Password is required."); return; }

    setLoading(true);
    try {
      // Try password login
      const res = await fetch("/api/v1/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const json = await res.json();

      if (json.success) {
        const role = json.data.user.role === "influencer" ? "influencer" : "business";
        if (role === "business") {
          const biz = json.data.business ?? {
            id: json.data.user.businessId ?? json.data.user.id,
            name: json.data.user.name, type: "", email: json.data.user.email,
            pin: "", avatar: "\uD83C\uDFEA", size: "small", location: "", industry: "",
          };
          onAuth(biz as SeedBusiness, "business");
        } else {
          const inf = json.data.influencer ?? {
            id: json.data.user.id, displayName: json.data.user.name,
            email: json.data.user.email, pin: "", avatar: "\uD83C\uDFA4",
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
  }

  async function handleSignup() {
    setError("");
    if (!name) { setError("Name is required."); return; }
    if (signupRole === "business" && !type) { setError("Business type is required."); return; }
    if (!email) { setError("Email is required."); return; }
    if (!password || password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "signup", email, password, name,
          role: signupRole === "business" ? "business" : "influencer",
        }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message ?? "Signup failed."); setLoading(false); return; }

      if (signupRole === "business") {
        const biz: SeedBusiness = {
          id: json.data.user.businessId ?? json.data.user.id,
          name, type, email, pin: "", avatar: "\uD83C\uDFEA",
          size: "small", location: "", industry: type,
        };
        save({ ...data, businesses: [...(data.businesses ?? []), biz] });
        onAuth(biz, "business");
      } else {
        const inf: SeedInfluencer = {
          id: json.data.user.id,
          displayName: name, email, pin: "", avatar: "\uD83C\uDFA4",
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
  }

  const inputSection = (
    <>
      {error && <div className="text-xs text-brand-red mb-3 rounded-md bg-brand-red/5 border border-brand-red/20 px-3 py-2" role="alert">{error}</div>}
    </>
  );

  // ─── Login Screen ───
  if (screen === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="w-full max-w-sm animate-fade-up">
          <button onClick={onBack} className="text-xs text-brand-dim hover:text-brand-text mb-6 transition-colors">
            &larr; Back
          </button>

          <Card className="p-8">
            <div className="text-center mb-8">
              <Logo size="md" />
              <h1 className="mt-4 text-xl font-semibold text-brand-white">Welcome back</h1>
              <p className="text-sm text-brand-dim mt-1">Log in to your account</p>
            </div>

            <div className="space-y-4">
              <Field label="Email" value={email} onChange={setEmail} placeholder="you@yourbusiness.com" />
              <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="Your password" />
            </div>

            {inputSection}

            <Button fullWidth onClick={handleLogin} className="py-3 text-sm rounded-lg mt-4" disabled={loading}>
              {loading ? "Logging in..." : "Log In"}
            </Button>

            <p className="text-center text-sm text-brand-dim mt-6">
              Don&apos;t have an account?{" "}
              <button onClick={() => { setScreen("signup"); setError(""); }} className="text-brand-cyan hover:underline font-medium">
                Sign up free
              </button>
            </p>

            {/* Demo accounts */}
            <div className="mt-6 pt-5 border-t border-brand-border">
              <button
                type="button"
                onClick={() => setShowDemo(!showDemo)}
                className="w-full text-xs text-brand-muted hover:text-brand-dim text-center transition-colors"
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

  // ─── Signup: Choose Role ───
  if (screen === "signup") {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="w-full max-w-sm animate-fade-up">
          <button onClick={() => { setScreen("login"); setError(""); }} className="text-xs text-brand-dim hover:text-brand-text mb-6 transition-colors">
            &larr; Back to login
          </button>

          <Card className="p-8">
            <div className="text-center mb-8">
              <Logo size="md" />
              <h1 className="mt-4 text-xl font-semibold text-brand-white">Create your account</h1>
              <p className="text-sm text-brand-dim mt-1">What describes you best?</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setSignupRole("business"); setScreen("signup-form"); }}
                className="w-full rounded-xl border border-brand-border bg-brand-surface/50 p-5 text-left transition-all hover:border-brand-cyan hover:bg-brand-surface"
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
                onClick={() => { setSignupRole("influencer"); setScreen("signup-form"); }}
                className="w-full rounded-xl border border-brand-border bg-brand-surface/50 p-5 text-left transition-all hover:border-brand-pink hover:bg-brand-surface"
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
              className="w-full mt-4 text-xs text-brand-purple hover:text-brand-purple/80 text-center transition-colors py-2"
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
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-sm animate-fade-up">
        <button onClick={() => { setScreen("signup"); setError(""); }} className="text-xs text-brand-dim hover:text-brand-text mb-6 transition-colors">
          &larr; Back
        </button>

        <Card className="p-8">
          <div className="text-center mb-8">
            <span className="text-3xl">{signupRole === "business" ? "🏪" : "🎨"}</span>
            <h1 className="mt-3 text-xl font-semibold text-brand-white">
              {signupRole === "business" ? "Set up your business" : "Create your creator profile"}
            </h1>
          </div>

          <div className="space-y-4">
            <Field
              label={signupRole === "business" ? "Business Name" : "Display Name"}
              value={name}
              onChange={setName}
              placeholder={signupRole === "business" ? "Maria's Coffee Shop" : "Your creator name"}
            />
            {signupRole === "business" && (
              <Field label="Business Type" value={type} onChange={setType} placeholder="Coffee Shop, Yoga Studio, Salon..." />
            )}
            <Field label="Email" value={email} onChange={setEmail} placeholder="you@email.com" />
            <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="At least 8 characters" />
          </div>

          {inputSection}

          <Button fullWidth onClick={handleSignup} className="py-3 text-sm rounded-lg mt-4" disabled={loading}>
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
