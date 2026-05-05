"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type State =
  | { kind: "verifying" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export function VerifyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const [state, setState] = useState<State>({ kind: "verifying" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        setState({
          kind: "error",
          message: "No sign-in token in the link. Request a new one.",
        });
        return;
      }

      try {
        const res = await fetch("/api/v1/auth/magic-link/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });
        const json = await res.json();
        if (cancelled) return;

        if (json?.success) {
          setState({ kind: "success" });
          // Brief hold so the user sees the success state
          setTimeout(() => router.replace("/dashboard"), 600);
        } else {
          setState({
            kind: "error",
            message:
              json?.error?.message ??
              "Sign-in link is invalid or expired. Request a new one.",
          });
        }
      } catch {
        if (cancelled) return;
        setState({
          kind: "error",
          message: "We couldn't reach the server. Please try again.",
        });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center bg-brand-bg text-brand-text px-4 py-8 sm:px-6">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-brand-border bg-brand-surface/50 p-8 text-center">
          {state.kind === "verifying" && (
            <>
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
              <h1 className="font-heading text-xl italic text-brand-white">
                Signing you in&hellip;
              </h1>
              <p className="mt-2 text-sm text-brand-dim">
                One moment while we verify your link.
              </p>
            </>
          )}

          {state.kind === "success" && (
            <>
              <div className="text-3xl mb-3" aria-hidden="true">✓</div>
              <h1 className="font-heading text-xl italic text-brand-white">
                Signed in
              </h1>
              <p className="mt-2 text-sm text-brand-dim">
                Redirecting to your dashboard&hellip;
              </p>
            </>
          )}

          {state.kind === "error" && (
            <>
              <div className="text-3xl mb-3" aria-hidden="true">⚠</div>
              <h1 className="font-heading text-xl italic text-brand-white">
                Sign-in link not valid
              </h1>
              <p className="mt-2 text-sm text-brand-dim">{state.message}</p>
              <Link
                href="/dashboard"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-brand-cyan px-5 py-2.5 text-sm font-semibold text-brand-bg transition-colors hover:bg-brand-cyan/90"
              >
                Send a new link
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
