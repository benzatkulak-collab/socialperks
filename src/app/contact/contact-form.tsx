"use client";

import { useState, type FormEvent } from "react";

const SUBJECTS = [
  "General Question",
  "Technical Support",
  "Billing",
  "Partnership",
  "Bug Report",
  "Feature Request",
] as const;

type FormState = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setState("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(
          data.error?.message || "Something went wrong. Please try again."
        );
        setState("error");
        return;
      }

      setState("success");
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-lg border border-brand-green/30 bg-brand-green/5 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10">
          <svg
            className="h-6 w-6 text-brand-green"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="font-heading text-xl italic text-brand-white">
          Thanks! We&apos;ll get back to you within 24 hours.
        </h2>
        <p className="mt-2 text-sm text-brand-dim">
          We sent a confirmation to{" "}
          <span className="text-brand-text">{email}</span>. Check your inbox
          for updates.
        </p>
        <button
          onClick={() => {
            setName("");
            setEmail("");
            setSubject(SUBJECTS[0]);
            setMessage("");
            setState("idle");
          }}
          className="mt-6 rounded-lg border border-brand-border bg-brand-surface/50 px-4 py-2 text-sm text-brand-text transition-colors hover:bg-brand-surface"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6"
    >
      {/* Name */}
      <div>
        <label
          htmlFor="contact-name"
          className="mb-1.5 block text-sm font-medium text-brand-text"
        >
          Name <span className="text-brand-red">*</span>
        </label>
        <input
          id="contact-name"
          type="text"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-lg border border-brand-border bg-brand-bg/60 px-4 py-2.5 text-sm text-brand-text placeholder-brand-subtle transition-colors focus:border-brand-cyan/50 focus:outline-none focus:ring-2 focus:ring-brand-cyan/20"
        />
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="contact-email"
          className="mb-1.5 block text-sm font-medium text-brand-text"
        >
          Email <span className="text-brand-red">*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-brand-border bg-brand-bg/60 px-4 py-2.5 text-sm text-brand-text placeholder-brand-subtle transition-colors focus:border-brand-cyan/50 focus:outline-none focus:ring-2 focus:ring-brand-cyan/20"
        />
      </div>

      {/* Subject */}
      <div>
        <label
          htmlFor="contact-subject"
          className="mb-1.5 block text-sm font-medium text-brand-text"
        >
          Subject
        </label>
        <select
          id="contact-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-lg border border-brand-border bg-brand-bg/60 px-4 py-2.5 text-sm text-brand-text transition-colors focus:border-brand-cyan/50 focus:outline-none focus:ring-2 focus:ring-brand-cyan/20"
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="contact-message"
          className="mb-1.5 block text-sm font-medium text-brand-text"
        >
          Message <span className="text-brand-red">*</span>
        </label>
        <textarea
          id="contact-message"
          required
          minLength={20}
          maxLength={5000}
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us how we can help (minimum 20 characters)..."
          className="w-full resize-y rounded-lg border border-brand-border bg-brand-bg/60 px-4 py-2.5 text-sm text-brand-text placeholder-brand-subtle transition-colors focus:border-brand-cyan/50 focus:outline-none focus:ring-2 focus:ring-brand-cyan/20"
        />
        <p className="mt-1 text-xs text-brand-subtle">
          {message.length}/5000 characters
        </p>
      </div>

      {/* Error state */}
      {state === "error" && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={state === "submitting"}
        className="w-full rounded-xl bg-brand-cyan px-5 py-3 text-sm font-semibold text-brand-bg transition-all duration-fast ease-smooth hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/15 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand-cyan disabled:hover:shadow-none disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
      >
        {state === "submitting" ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Sending...
          </span>
        ) : (
          "Send Message"
        )}
      </button>
    </form>
  );
}
