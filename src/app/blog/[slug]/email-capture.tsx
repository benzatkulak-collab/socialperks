"use client";

import { useState } from "react";

export function EmailCapture() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    // In production, post to your email API endpoint.
    // We keep this client-only for a graceful experience without backend coupling.
    try {
      if (typeof window !== "undefined") {
        const stored = JSON.parse(localStorage.getItem("sp_blog_subs") ?? "[]");
        if (!stored.includes(email)) stored.push(email);
        localStorage.setItem("sp_blog_subs", JSON.stringify(stored));
      }
    } catch {
      // ignore
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="my-10 rounded-xl border border-brand-cyan/40 bg-brand-cyan/5 p-6 sm:p-8">
        <p className="font-heading text-2xl italic text-brand-white">You&rsquo;re in.</p>
        <p className="mt-2 text-brand-dim">
          Look for the first weekly tip in your inbox in the next few days.
        </p>
      </div>
    );
  }

  return (
    <div className="my-10 rounded-xl border border-brand-border/60 bg-brand-card/40 p-6 sm:p-8">
      <p className="font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
        Free Newsletter
      </p>
      <h3 className="mt-2 font-heading text-2xl italic text-brand-white">
        Get weekly small business marketing tips.
      </h3>
      <p className="mt-2 text-sm text-brand-dim">
        One short email a week with one tactic you can run. No fluff, unsubscribe whenever.
      </p>
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          className="flex-1 rounded-lg border border-brand-border/60 bg-brand-bg px-4 py-3 text-sm text-brand-text placeholder-brand-muted/70 focus:border-brand-cyan/60 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-cyan px-5 py-3 text-sm font-medium text-brand-bg transition-transform hover:-translate-y-0.5"
        >
          Subscribe
        </button>
      </form>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </div>
  );
}
