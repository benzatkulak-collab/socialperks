"use client";

/**
 * Next.js 15 global error boundary.
 *
 * This is the top-level fallback when an unhandled error escapes every other
 * boundary — including the root layout. It MUST render its own <html> and
 * <body> tags. Keep dependencies minimal; if globals.css fails to load, this
 * page should still render readable text.
 *
 * Side effects:
 *   - Reports the error to /api/v1/log/error so it's captured in server logs.
 *   - Wires up window.onerror and unhandledrejection on mount so subsequent
 *     uncaught client errors are also reported (without needing this page to
 *     trigger).
 */

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

async function reportError(payload: Record<string, unknown>): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/v1/log/error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // keepalive lets the request survive page unload during a hard crash
      keepalive: true,
      body: JSON.stringify(payload),
    });
  } catch {
    // Last-resort: never let the error reporter itself throw.
  }
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    void reportError({
      message: error.message,
      name: error.name,
      stack: error.stack,
      digest: error.digest,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      context: { source: "global-error-boundary" },
    });

    // Also install global handlers so future uncaught client errors get
    // reported even when this page isn't the active fallback.
    function onError(e: ErrorEvent): void {
      void reportError({
        message: e.message,
        stack: e.error instanceof Error ? e.error.stack : undefined,
        name: e.error instanceof Error ? e.error.name : "ErrorEvent",
        url: typeof window !== "undefined" ? window.location.href : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        context: { source: "window.onerror", filename: e.filename, lineno: e.lineno, colno: e.colno },
      });
    }
    function onRejection(e: PromiseRejectionEvent): void {
      const reason = e.reason;
      void reportError({
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        name: reason instanceof Error ? reason.name : "UnhandledRejection",
        url: typeof window !== "undefined" ? window.location.href : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        context: { source: "unhandledrejection" },
      });
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: "#0C0F1A",
          color: "#E5E7EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1
            style={{
              fontSize: "2rem",
              fontStyle: "italic",
              marginBottom: "0.5rem",
              fontFamily: "'Instrument Serif', Georgia, serif",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#9CA3AF", marginBottom: "1.5rem" }}>
            We hit an unexpected error and our team has been notified. You can
            try again or head back to the homepage.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: "0.6875rem",
                color: "#6B7280",
                marginBottom: "1.5rem",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "0.625rem 1.25rem",
                backgroundColor: "#22D3EE",
                color: "#0C0F1A",
                fontWeight: 600,
                fontSize: "0.875rem",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: "0.625rem 1.25rem",
                backgroundColor: "rgba(255,255,255,0.05)",
                color: "#E5E7EB",
                fontWeight: 500,
                fontSize: "0.875rem",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.375rem",
                textDecoration: "none",
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
