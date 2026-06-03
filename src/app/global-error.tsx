"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/monitoring";

// Catches errors thrown during root layout rendering (rare but real).
// Must include its own <html> and <body> because the layout itself failed.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { source: "app/global-error", digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          background: "#0C0F1A",
          color: "#E2E8F0",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'DM Sans', sans-serif",
          padding: "1rem",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: "#FBBF24",
          }}
        >
          Critical error
        </p>
        <h1
          style={{
            marginTop: "1rem",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: "2.25rem",
            color: "#FFFFFF",
          }}
        >
          The app couldn&apos;t load.
        </h1>
        <p
          style={{
            marginTop: "1rem",
            maxWidth: "28rem",
            color: "#94A3B8",
          }}
        >
          A critical error prevented the page from rendering. We&apos;ve logged
          it. Please try again or refresh.
        </p>
        {error.digest && (
          <p
            style={{
              marginTop: "0.75rem",
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.75rem",
              color: "#64748B",
            }}
          >
            Reference: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "2rem",
            background: "#22D3EE",
            color: "#0C0F1A",
            border: "none",
            borderRadius: "0.75rem",
            padding: "0.75rem 1.5rem",
            fontWeight: 600,
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
