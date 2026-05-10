"use client";

import { useState, type FormEvent } from "react";

export interface NewsletterFormProps {
  /** Where the form is rendered (used for source tracking). */
  source?: string;
  /**
   * Layout variant.
   * - inline : input + button on one row (default)
   * - card   : self-contained bordered card with heading
   * - footer : compact variant tuned for the site footer
   * - stacked: input above button (legacy)
   */
  variant?: "inline" | "card" | "footer" | "stacked";
  /** Label for the submit button. */
  submitLabel?: string;
  /** Optional heading shown above the form (or used inside card variant). */
  heading?: string;
  /** Optional description shown above the form (or used inside card variant). */
  description?: string;
  /** Show a small helper text below the form. */
  showTooltip?: boolean;
  /** Override placeholder. */
  placeholder?: string;
  /** Optional className for the wrapper. */
  className?: string;
}

type Status = "idle" | "loading" | "success" | "error";

interface ApiResponse {
  success?: boolean;
  data?: { duplicate?: boolean };
  error?: { code?: string; message?: string };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function postSubscription(
  email: string,
  source: string,
): Promise<{ ok: boolean; duplicate: boolean; message?: string }> {
  try {
    const res = await fetch("/api/v1/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source }),
    });
    const json = (await res.json().catch(() => null)) as ApiResponse | null;
    if (res.ok && json?.success) {
      return { ok: true, duplicate: Boolean(json.data?.duplicate) };
    }
    return {
      ok: false,
      duplicate: false,
      message: json?.error?.message,
    };
  } catch {
    return { ok: false, duplicate: false };
  }
}

export function NewsletterForm({
  source = "site",
  variant = "inline",
  submitLabel = "Subscribe",
  heading,
  description,
  showTooltip = false,
  placeholder = "you@business.com",
  className,
}: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    setStatus("loading");
    setMessage("");
    const result = await postSubscription(email.trim(), source);
    if (result.ok) {
      setStatus("success");
      setMessage(
        result.duplicate
          ? "You're already on the list \u2014 thanks!"
          : "\u2713 Thanks! Check your inbox.",
      );
      setEmail("");
    } else {
      setStatus("error");
      setMessage(result.message ?? "Something went wrong. Please try again.");
    }
  }

  // Layout: stacked goes column, everything else goes row on sm+.
  const isStacked = variant === "stacked";

  const inputId = `newsletter-email-${source}`;

  const formInner = (
    <form
      onSubmit={onSubmit}
      className={
        isStacked
          ? "flex flex-col gap-3"
          : "flex flex-col gap-2 sm:flex-row sm:items-center"
      }
      noValidate
    >
      <label htmlFor={inputId} className="sr-only">
        Email address
      </label>
      <input
        id={inputId}
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder={placeholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === "loading" || status === "success"}
        aria-invalid={status === "error"}
        className="flex-1 rounded-lg border border-brand-border/60 bg-brand-bg/60 px-4 py-2.5 text-sm text-brand-white placeholder:text-brand-muted focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={status === "loading" || status === "success"}
        className="rounded-lg bg-brand-cyan px-5 py-2.5 font-mono text-sm font-semibold text-brand-bg transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "\u2026" : submitLabel}
      </button>
    </form>
  );

  const feedback =
    message || showTooltip ? (
      <p
        role={status === "error" ? "alert" : "status"}
        className={`mt-2 text-xs ${
          status === "error"
            ? "text-orange-400"
            : status === "success"
              ? "text-brand-green"
              : "text-brand-muted"
        }`}
      >
        {message || "One short email a week. Unsubscribe anytime."}
      </p>
    ) : null;

  // Card variant: self-contained bordered block with its own heading.
  if (variant === "card") {
    return (
      <div
        className={
          className ??
          "rounded-xl border border-brand-border/60 bg-brand-card/40 p-6 sm:p-8"
        }
      >
        <p className="font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
          Free Newsletter
        </p>
        <h3 className="mt-2 font-heading text-2xl italic text-brand-white">
          {heading ?? "Get weekly small business marketing tips."}
        </h3>
        <p className="mt-2 text-sm text-brand-dim">
          {description ??
            "One short email a week with one tactic you can run. No fluff, unsubscribe whenever."}
        </p>
        <div className="mt-5">{formInner}</div>
        {feedback}
      </div>
    );
  }

  // Inline, footer, stacked all share the same shell. Footer + inline differ
  // only in spacing of optional heading/description above the form.
  return (
    <div className={className}>
      {heading && (
        <h3 className="mb-2 font-heading text-xl italic text-brand-white">
          {heading}
        </h3>
      )}
      {description && (
        <p className="mb-4 text-sm text-brand-dim">{description}</p>
      )}
      {formInner}
      {feedback}
    </div>
  );
}

export default NewsletterForm;
