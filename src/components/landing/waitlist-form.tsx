"use client";

import { useState, type FormEvent } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; alreadyOnList: boolean }
  | { kind: "error"; message: string };

interface WaitlistFormProps {
  /** Vertical to tag the entry with. Lets one form serve multiple landing pages. */
  vertical?: "coffee_shops" | "other";
  /** Compact one-line layout (for inline placements). Defaults to stacked. */
  variant?: "stacked" | "inline";
}

export function WaitlistForm({ vertical = "coffee_shops", variant = "stacked" }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status.kind === "submitting") return;

    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          businessName: businessName.trim() || undefined,
          city: city.trim() || undefined,
          vertical,
          referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const message = json?.error?.message ?? `Request failed (${res.status})`;
        setStatus({ kind: "error", message });
        return;
      }
      setStatus({ kind: "success", alreadyOnList: Boolean(json.data?.alreadyOnList) });
    } catch {
      setStatus({ kind: "error", message: "Couldn't reach the server. Try again?" });
    }
  }

  if (status.kind === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-brand-green/30 bg-brand-green/5 p-6 text-center"
      >
        <p className="font-heading text-xl italic text-brand-green">
          {status.alreadyOnList ? "You're already on the list." : "You're in."}
        </p>
        <p className="mt-2 text-sm text-brand-dim">
          Check your inbox for a confirmation. We&apos;ll reach out as soon as we have a slot for you.
        </p>
      </div>
    );
  }

  const isCompact = variant === "inline";

  return (
    <form
      onSubmit={handleSubmit}
      className={
        isCompact
          ? "flex flex-col gap-3 sm:flex-row sm:items-end"
          : "flex flex-col gap-4"
      }
      noValidate
    >
      <div className={isCompact ? "flex-1" : ""}>
        <label htmlFor="waitlist-email" className="mb-1.5 block text-xs font-medium text-brand-dim">
          Email
        </label>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourbusiness.com"
          className="w-full rounded-xl border border-brand-border bg-brand-surface/60 px-4 py-2.5 text-sm text-brand-white placeholder:text-brand-muted focus:border-brand-cyan/50 focus:outline-none focus:ring-2 focus:ring-brand-cyan/20"
          disabled={status.kind === "submitting"}
        />
      </div>

      {!isCompact && (
        <>
          <div>
            <label htmlFor="waitlist-business" className="mb-1.5 block text-xs font-medium text-brand-dim">
              Business name <span className="text-brand-muted">(optional)</span>
            </label>
            <input
              id="waitlist-business"
              name="businessName"
              type="text"
              autoComplete="organization"
              maxLength={200}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Maria's Coffee Shop"
              className="w-full rounded-xl border border-brand-border bg-brand-surface/60 px-4 py-2.5 text-sm text-brand-white placeholder:text-brand-muted focus:border-brand-cyan/50 focus:outline-none focus:ring-2 focus:ring-brand-cyan/20"
              disabled={status.kind === "submitting"}
            />
          </div>
          <div>
            <label htmlFor="waitlist-city" className="mb-1.5 block text-xs font-medium text-brand-dim">
              City <span className="text-brand-muted">(optional)</span>
            </label>
            <input
              id="waitlist-city"
              name="city"
              type="text"
              autoComplete="address-level2"
              maxLength={100}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Washington, DC"
              className="w-full rounded-xl border border-brand-border bg-brand-surface/60 px-4 py-2.5 text-sm text-brand-white placeholder:text-brand-muted focus:border-brand-cyan/50 focus:outline-none focus:ring-2 focus:ring-brand-cyan/20"
              disabled={status.kind === "submitting"}
            />
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={status.kind === "submitting" || email.trim().length === 0}
        className={`rounded-xl bg-brand-cyan px-6 py-3 font-body text-sm font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${isCompact ? "" : "mt-2"}`}
      >
        {status.kind === "submitting" ? "Joining…" : "Join the early-access list"}
      </button>

      {status.kind === "error" && (
        <p role="alert" className="text-sm text-brand-amber">
          {status.message}
        </p>
      )}
    </form>
  );
}
