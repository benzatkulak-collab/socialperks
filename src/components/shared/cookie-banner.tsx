"use client";

/**
 * Cookie consent banner — minimal viable GDPR/CCPA banner.
 *
 * Design philosophy: this is the lightest-weight consent UX that's
 * still defensible. We collect only:
 *   - "essential" cookies (always on, includes auth + CSRF)
 *   - "analytics" (Vercel Analytics — opt-in)
 *   - "marketing" (tracking pixels — opt-in)
 *
 * Choice is stored in localStorage under `sp_consent` and broadcast
 * via a `consent-changed` window event so other components (the
 * tracking-pixel emitter, the analytics provider) can react.
 *
 * We do NOT use a third-party CMP. This is ~150 lines and gives us
 * everything we need for the first 10 customers. When we hit
 * GDPR-strict markets we swap in a proper CMP (e.g. cookieyes).
 */

import { useEffect, useState } from "react";

type ConsentScope = "essential" | "analytics" | "marketing";

interface ConsentState {
  version: 1;
  decidedAt: string;
  scopes: Record<ConsentScope, boolean>;
}

const STORAGE_KEY = "sp_consent";
const CURRENT_VERSION = 1;

function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.version !== CURRENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(scopes: ConsentState["scopes"]): void {
  const state: ConsentState = {
    version: CURRENT_VERSION,
    decidedAt: new Date().toISOString(),
    scopes,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("consent-changed", { detail: state }));
}

export function CookieBanner() {
  const [state, setState] = useState<"hidden" | "banner" | "details">("hidden");
  const [scopes, setScopes] = useState<ConsentState["scopes"]>({
    essential: true,
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    const existing = readConsent();
    if (!existing) setState("banner");
  }, []);

  function acceptAll() {
    const all = { essential: true, analytics: true, marketing: true };
    setScopes(all);
    writeConsent(all);
    setState("hidden");
  }

  function rejectNonEssential() {
    const min = { essential: true, analytics: false, marketing: false };
    setScopes(min);
    writeConsent(min);
    setState("hidden");
  }

  function saveSelection() {
    writeConsent({ ...scopes, essential: true });
    setState("hidden");
  }

  if (state === "hidden") return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-brand-border/60 bg-brand-bg/95 backdrop-blur-xl shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.6)]"
    >
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
        {state === "banner" ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-brand-dim sm:max-w-2xl">
              <p className="font-semibold text-brand-white mb-1">We use cookies.</p>
              <p>
                Essential cookies keep you signed in and the site running. Optional
                analytics cookies help us see what's working. You can change this
                anytime — your choice persists across visits.{" "}
                <button
                  type="button"
                  onClick={() => setState("details")}
                  className="text-brand-cyan underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 rounded-sm"
                >
                  Customize
                </button>
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={rejectNonEssential}
                className="rounded-lg border border-brand-border bg-brand-surface/50 px-4 py-2 text-sm font-semibold text-brand-text transition-all hover:bg-brand-surface hover:border-brand-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
              >
                Essential only
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50"
              >
                Accept all
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="font-heading text-xl italic text-brand-white">Cookie preferences</p>
              <button
                type="button"
                onClick={() => setState("banner")}
                className="text-xs text-brand-muted hover:text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 rounded-sm"
              >
                Back
              </button>
            </div>
            <div className="space-y-3">
              <ScopeRow
                label="Essential"
                description="Required for sign-in, CSRF protection, and basic site function. Cannot be disabled."
                value={true}
                disabled
                onChange={() => {}}
              />
              <ScopeRow
                label="Analytics"
                description="Anonymous usage data via Vercel Analytics. Helps us understand what's working."
                value={scopes.analytics}
                disabled={false}
                onChange={(v) => setScopes((s) => ({ ...s, analytics: v }))}
              />
              <ScopeRow
                label="Marketing"
                description="Tracking pixels (Meta, Google) used to measure ad performance. Off by default."
                value={scopes.marketing}
                disabled={false}
                onChange={(v) => setScopes((s) => ({ ...s, marketing: v }))}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={rejectNonEssential}
                className="rounded-lg border border-brand-border bg-brand-surface/50 px-4 py-2 text-sm font-semibold text-brand-text transition-all hover:bg-brand-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
              >
                Essential only
              </button>
              <button
                type="button"
                onClick={saveSelection}
                className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50"
              >
                Save preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ScopeRowProps {
  label: string;
  description: string;
  value: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}

function ScopeRow({ label, description, value, disabled, onChange }: ScopeRowProps) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border border-brand-border/60 bg-brand-surface/30 p-4 ${
        disabled ? "opacity-70" : "cursor-pointer hover:border-brand-cyan/40"
      }`}
    >
      <input
        type="checkbox"
        checked={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-brand-border bg-brand-bg text-brand-cyan focus:ring-2 focus:ring-brand-cyan/40 focus:ring-offset-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-white">{label}</p>
        <p className="mt-0.5 text-xs text-brand-dim">{description}</p>
      </div>
    </label>
  );
}

/**
 * Helper for other components: read current consent. Server-safe (returns
 * null on the server). Components that need consent-aware behavior should
 * call this AND listen to the `consent-changed` window event for live updates.
 */
export function useConsent(): ConsentState["scopes"] | null {
  const [scopes, setScopes] = useState<ConsentState["scopes"] | null>(() => {
    const c = readConsent();
    return c?.scopes ?? null;
  });

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<ConsentState>).detail;
      setScopes(detail.scopes);
    }
    window.addEventListener("consent-changed", handler);
    return () => window.removeEventListener("consent-changed", handler);
  }, []);

  return scopes;
}
