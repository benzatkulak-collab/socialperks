"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Surface the error so it shows up in Vercel runtime logs and any
    // future error tracker (Sentry etc). The `digest` is the only
    // identifier we should expose to users.
    console.error("[app/error] unhandled route error:", error);
  }, [error]);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-brand-bg px-4 text-center"
      role="main"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-amber">
        Something broke
      </p>
      <h1 className="mt-4 font-heading text-4xl italic text-brand-white sm:text-5xl">
        We&apos;ll get this fixed.
      </h1>
      <p className="mt-4 max-w-md text-base text-brand-dim">
        An unexpected error happened on this page. We&apos;ve logged it. You can
        retry, or head home.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-brand-muted">
          Reference: {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-brand-cyan px-6 py-3 font-body text-sm font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-xl border border-brand-border bg-brand-surface/50 px-6 py-3 font-body text-sm font-medium text-brand-text transition-all hover:border-brand-subtle hover:bg-brand-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/30"
        >
          Back to home
        </a>
      </div>
    </main>
  );
}
