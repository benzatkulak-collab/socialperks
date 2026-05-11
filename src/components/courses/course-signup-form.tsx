"use client";

import { useState, type FormEvent } from "react";

interface CourseSignupFormProps {
  courseSlug: string;
  source: string;
}

type Status = "idle" | "submitting" | "success" | "error";

export function CourseSignupForm({
  courseSlug,
  source,
}: CourseSignupFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMessage("Enter a valid email address.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/v1/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source,
          courseSlug,
        }),
      });
      if (!res.ok && res.status !== 409) {
        // 409 = already subscribed; we treat that as success for UX.
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Could not subscribe. Try again.");
      }
      setStatus("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-[var(--accent-green)]/40 bg-[var(--accent-green)]/10 p-5">
        <p className="font-serif text-lg italic text-[var(--accent-green)]">
          Day 1 is in your inbox.
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Check your email (and your spam folder, just in case). If Day 1 hasn't
          arrived in 5 minutes, reply to any of our emails and we'll resend.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <label className="block">
        <span className="sr-only">Email address</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@yourbusiness.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") {
              setStatus("idle");
              setErrorMessage(null);
            }
          }}
          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] px-4 py-3 text-base text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-cyan)]"
          aria-invalid={status === "error"}
          aria-describedby={
            status === "error" ? "course-signup-error" : undefined
          }
        />
      </label>
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-xl bg-[var(--accent-cyan)] px-4 py-3 font-mono text-sm uppercase tracking-[0.14em] text-[var(--bg-base)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "Sending..." : "Get the course free"}
      </button>
      {status === "error" && errorMessage && (
        <p
          id="course-signup-error"
          className="text-sm text-[var(--accent-red,#ef4444)]"
        >
          {errorMessage}
        </p>
      )}
    </form>
  );
}
