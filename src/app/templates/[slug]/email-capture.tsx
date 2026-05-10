"use client";

import { useState } from "react";

interface EmailCaptureProps {
  slug: string;
  title: string;
  content: string;
}

export function EmailCapture({ slug, title, content }: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      const key = "sp_template_leads";
      const existing = JSON.parse(localStorage.getItem(key) ?? "[]") as Array<{
        email: string;
        slug: string;
        timestamp: number;
      }>;
      existing.push({ email: trimmed, slug, timestamp: Date.now() });
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {
      // localStorage may be unavailable — non-blocking
    }

    setSubmitted(true);
  }

  function handleDownload() {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-brand-green/40 bg-brand-green/5 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-green/20 text-brand-green">
            ✓
          </div>
          <div className="flex-1">
            <h3 className="font-heading text-xl italic text-brand-white">
              You&apos;re in. Here&apos;s your template.
            </h3>
            <p className="mt-2 text-sm text-brand-dim">
              Click below to download <strong>{title}</strong>.
            </p>
            <button
              type="button"
              onClick={handleDownload}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-cyan px-6 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20"
            >
              Download {slug}.txt
              <span aria-hidden="true">↓</span>
            </button>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
              Plain text · Open in any editor
            </p>
          </div>
        </div>

        <details className="mt-6 border-t border-brand-border pt-5">
          <summary className="cursor-pointer text-sm text-brand-cyan hover:text-cyan-300">
            Or preview the template inline
          </summary>
          <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-brand-border bg-brand-bg/60 p-4 font-mono text-[11px] text-brand-text">
            {content}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-brand-cyan/40 bg-gradient-to-br from-brand-cyan/5 to-transparent p-6 sm:p-8"
    >
      <h3 className="font-heading text-xl italic text-brand-white sm:text-2xl">
        Get the template →
      </h3>
      <p className="mt-2 text-sm text-brand-dim">
        Drop your email and we&apos;ll send you {title} as a plain-text file
        you can edit anywhere. No spam — unsubscribe anytime.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@business.com"
          required
          className="flex-1 rounded-xl border border-brand-border bg-brand-bg/60 px-4 py-3 text-sm text-brand-white placeholder:text-brand-muted focus:border-brand-cyan/60 focus:outline-none focus:ring-2 focus:ring-brand-cyan/20"
          aria-label="Email address"
        />
        <button
          type="submit"
          className="rounded-xl bg-brand-cyan px-6 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20"
        >
          Get the template →
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-brand-amber" role="alert">
          {error}
        </p>
      )}

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
        Free · Plain text · Edit anywhere
      </p>
    </form>
  );
}
