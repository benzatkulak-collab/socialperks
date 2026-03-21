"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Logo } from "@/components/ui/logo";
import { Tabs } from "@/components/ui/tabs";
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
  const [mode, setMode] = useState<"login" | "signup-business" | "signup-influencer">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const isSignup = mode !== "login";
  const passwordStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? 4 : 3;
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["", "text-brand-red", "text-brand-amber", "text-brand-cyan", "text-brand-green"];

  async function handleSubmit() {
    setError("");
    if (!email) { setError("Email is required."); return; }
    if (!password) { setError("Password is required."); return; }
    if (isSignup && !name) { setError("Name is required."); return; }
    if (isSignup && mode === "signup-business" && !type) { setError("Business type is required."); return; }
    if (isSignup && password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (isSignup && !acceptedTerms) { setError("You must accept the Terms of Service."); return; }

    setLoading(true);
    try {
      if (isSignup) {
        const res = await fetch("/api/v1/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "signup",
            email,
            password,
            name,
            role: mode === "signup-business" ? "business" : "influencer",
          }),
        });
        const json = await res.json();
        if (!json.success) { setError(json.error?.message ?? "Signup failed."); setLoading(false); return; }

        if (mode === "signup-business") {
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
      } else {
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
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const authTabs = [
    { id: "login", label: "Log In" },
    { id: "signup-business", label: "Business" },
    { id: "signup-influencer", label: "Creator" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-md animate-fade-up">
        <button
          onClick={onBack}
          className="text-xs text-brand-dim hover:text-brand-text mb-4 transition-colors"
          aria-label="Back to home page"
        >
          &larr; Back to Home
        </button>

        <Card className="p-7">
          <div className="text-center mb-6">
            <Logo size="md" />
            <p className="text-xs text-brand-dim mt-2">
              {isSignup ? "Create your free account" : "Welcome back"}
            </p>
            <div className="mt-4">
              <Tabs
                tabs={authTabs}
                activeTab={mode}
                onChange={(id) => { setMode(id as typeof mode); setError(""); }}
              />
            </div>
          </div>

          {isSignup && (
            <Field
              label={mode === "signup-business" ? "Business Name" : "Display Name"}
              value={name}
              onChange={setName}
              placeholder={mode === "signup-business" ? "Your Business Name" : "Your Creator Name"}
            />
          )}
          {mode === "signup-business" && (
            <Field
              label="Business Type"
              value={type}
              onChange={setType}
              placeholder="Coffee Shop, Yoga Studio, Tattoo Parlor..."
            />
          )}
          <Field label="Email" value={email} onChange={setEmail} placeholder="you@business.com" />
          <Field label="Password" value={password} onChange={setPassword} type="password" placeholder={isSignup ? "Min. 8 characters" : "Your password"} />

          {isSignup && password.length > 0 && (
            <div className="flex items-center gap-2 mb-3 -mt-1">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors ${level <= passwordStrength ? (passwordStrength <= 1 ? "bg-brand-red" : passwordStrength === 2 ? "bg-brand-amber" : passwordStrength === 3 ? "bg-brand-cyan" : "bg-brand-green") : "bg-brand-elevated"}`}
                  />
                ))}
              </div>
              <span className={`text-3xs font-medium ${strengthColors[passwordStrength]}`}>
                {strengthLabels[passwordStrength]}
              </span>
            </div>
          )}

          {isSignup && (
            <label className="flex items-start gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 rounded border-brand-border bg-brand-bg text-brand-cyan focus:ring-brand-cyan"
              />
              <span className="text-3xs text-brand-dim leading-relaxed">
                I agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand-cyan hover:underline">Terms of Service</a>
                {" "}and{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-cyan hover:underline">Privacy Policy</a>
              </span>
            </label>
          )}

          {error && <div className="text-xs text-brand-red mb-3" role="alert">{error}</div>}

          <Button
            fullWidth
            onClick={handleSubmit}
            className="py-3 text-sm rounded-lg mt-2"
            disabled={loading}
          >
            {loading ? "Please wait..." : isSignup ? (mode === "signup-business" ? "Create Business Account" : "Join as Creator") : "Log In"}
          </Button>

          {mode === "login" && (
            <div className="mt-4 pt-4 border-t border-brand-border">
              <button
                type="button"
                onClick={() => setShowDemo(!showDemo)}
                className="w-full text-3xs text-brand-muted hover:text-brand-dim text-center transition-colors"
              >
                {showDemo ? "Hide demo accounts" : "Try with demo accounts"} {showDemo ? "\u25B2" : "\u25BC"}
              </button>
              {showDemo && (
                <div className="text-3xs text-brand-muted mt-2 text-center leading-relaxed animate-fade-up">
                  <span className="text-brand-dim">Password for all demos:</span> 1234<br />
                  <span className="text-brand-dim">Business:</span> yoga@ &middot; sol@ &middot; glow@ &middot; iron@ &middot; baked@ demo.com<br />
                  <span className="text-brand-dim">Creator:</span> priya@ &middot; marcus@ &middot; style@ demo.com
                </div>
              )}
              <Button
                variant="ghost"
                fullWidth
                onClick={onEnterpriseDemo}
                className="text-xs text-brand-purple hover:text-brand-purple mt-2"
              >
                Enterprise Demo &rarr;
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
