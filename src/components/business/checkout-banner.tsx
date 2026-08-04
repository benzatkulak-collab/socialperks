"use client";

/**
 * Checkout banner — shown on the dashboard right after the user returns
 * from Stripe checkout. Reads ?checkout=success or ?checkout=cancelled
 * from the URL and renders a one-time confirmation banner.
 *
 * Why this exists: without an explicit confirmation, a paying customer
 * who's just handed over a credit card has no signal that anything
 * happened — and no signal is the worst signal. Users email support
 * asking "did my payment go through?" which is bad for retention.
 *
 * The banner clears its own query params on dismiss so a refresh doesn't
 * show it again.
 */

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";

type Status = "success" | "cancelled" | null;

/**
 * Fire a Purchase conversion on the ad retargeting pixels (Meta / Google) when
 * a checkout completes. Without this, the pixels only ever see PageView, so ad
 * platforms can neither optimize delivery toward payers nor report ROAS. No-op
 * when a pixel isn't loaded (its env var is unset). Value is intentionally
 * omitted — we don't have a trustworthy amount client-side, and a Purchase
 * event still lets the platforms count and optimize for the conversion.
 */
function firePurchasePixels(): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    fbq?: (action: string, event: string, props?: Record<string, unknown>) => void;
    gtag?: (command: string, event: string, props?: Record<string, unknown>) => void;
  };
  try {
    w.fbq?.("track", "Purchase", { currency: "USD" });
  } catch {
    /* pixel not ready — ignore */
  }
  try {
    w.gtag?.("event", "purchase", { currency: "USD" });
  } catch {
    /* pixel not ready — ignore */
  }
}

export function CheckoutBanner() {
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success" || checkout === "cancelled") {
      setStatus(checkout);

      // Conversion events must fire AT MOST ONCE per checkout. Gating on the
      // query param alone re-fired the Purchase pixel (and the funnel event)
      // on every reload, back-navigation or client-side re-mount of this URL,
      // inflating reported revenue and ad-platform conversion counts.
      // Two guards: a per-session flag, and stripping the param from the URL
      // immediately so a reload has nothing to re-trigger on. The banner
      // itself stays visible because its state lives in React, not the URL.
      let alreadyFired = false;
      try {
        const key = `sp:checkout-reported:${checkout}`;
        alreadyFired = window.sessionStorage.getItem(key) === "1";
        window.sessionStorage.setItem(key, "1");
      } catch {
        /* storage blocked — fall back to the URL-strip guard below */
      }

      if (!alreadyFired) {
        // Funnel: fire the terminal funnel event when Stripe redirects
        // back. checkout_completed closes the loop opened by
        // checkout_started in auth-form. Cancelled redirects are also
        // valuable signal — they tell us where checkout is leaking.
        track(
          checkout === "success" ? "checkout_completed" : "checkout_started",
          { outcome: checkout }
        );
        if (checkout === "success") firePurchasePixels();
      }

      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("checkout");
        window.history.replaceState({}, "", url.toString());
      } catch {
        /* history unavailable — the sessionStorage guard still holds */
      }
    }
  }, []);

  function dismiss() {
    setStatus(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      url.searchParams.delete("welcome");
      window.history.replaceState({}, "", url.toString());
    }
  }

  if (status === null) return null;

  if (status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mx-auto max-w-5xl my-4 rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-5 py-4 flex items-start justify-between gap-4"
      >
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-2xl leading-none" aria-hidden>✓</span>
          <div className="min-w-0">
            <p className="font-medium text-emerald-200">
              Payment received — your subscription is active.
            </p>
            <p className="text-sm text-emerald-200/80 mt-0.5">
              You&apos;ll get a Stripe receipt by email. Your first campaign is
              ready to launch — start with the recommended one below.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-sm text-emerald-200/60 hover:text-emerald-100 shrink-0"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </div>
    );
  }

  // cancelled
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto max-w-5xl my-4 rounded-lg border border-amber-500/40 bg-amber-500/5 px-5 py-4 flex items-start justify-between gap-4"
    >
      <div className="flex items-start gap-3 min-w-0">
        <span className="text-2xl leading-none" aria-hidden>↩︎</span>
        <div className="min-w-0">
          <p className="font-medium text-amber-200">
            Checkout cancelled — your account is free for now.
          </p>
          <p className="text-sm text-amber-200/80 mt-0.5">
            You can keep using the free tier or upgrade any time from{" "}
            <a href="/pricing" className="underline hover:text-amber-100">
              pricing
            </a>
            .
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="text-sm text-amber-200/60 hover:text-amber-100 shrink-0"
        aria-label="Dismiss"
      >
        Dismiss
      </button>
    </div>
  );
}
