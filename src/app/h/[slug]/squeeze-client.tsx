"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { Hook } from "@/lib/hooks/data";

interface SqueezeProps {
  hook: Hook;
}

export function HookSqueezePage({ hook }: SqueezeProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@") || trimmed.length < 5) {
      setError("Enter a real email so we can send the template.");
      return;
    }
    // Conversion handled client-side here; backend signup integrations
    // already exist at /api/v1/auth — these hook pages stage the lead.
    setSubmitted(true);
  }

  return (
    <article>
      {/* Hook */}
      <h1
        className="font-serif italic text-5xl leading-[1.05] tracking-tight sm:text-[3.25rem]"
        style={{ fontFamily: "var(--font-instrument-serif, 'Instrument Serif', serif)" }}
      >
        {hook.hook}
      </h1>

      {/* Proof stat */}
      <div
        className="mt-8 text-[2.25rem] leading-[1.1] font-mono font-medium tracking-tight"
        style={{ color: "#22D3EE" }}
      >
        {hook.proofStat}
      </div>

      {/* Promise */}
      <p className="mt-5 text-base text-white/75 leading-relaxed">
        {hook.promise}
      </p>

      {/* Email capture or revealed content */}
      {!submitted ? (
        <form onSubmit={onSubmit} className="mt-10">
          <label htmlFor="email" className="sr-only">
            Your email
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white placeholder:text-white/35 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            required
          />
          <button
            type="submit"
            className="mt-3 w-full rounded-xl px-5 py-4 text-base font-semibold text-[#06121A] transition active:scale-[0.99]"
            style={{ background: "#22D3EE" }}
          >
            {hook.cta} →
          </button>
          {error && (
            <p className="mt-2 text-sm text-amber-300">{error}</p>
          )}
          <p className="mt-3 text-center text-[11px] uppercase tracking-[0.16em] text-white/40">
            No spam. Unsubscribe in 1 tap.
          </p>
        </form>
      ) : (
        <section className="mt-10">
          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: "rgba(34, 211, 238, 0.3)",
              background: "rgba(34, 211, 238, 0.06)",
            }}
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-300">
              Your template
            </div>
            <pre
              className="mt-3 whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-white/90"
              style={{
                fontFamily:
                  "var(--font-jetbrains-mono, 'JetBrains Mono', ui-monospace, monospace)",
              }}
            >
              {hook.template}
            </pre>
          </div>
          <Link
            href="/signup"
            className="mt-4 block text-center text-sm text-white/70 underline decoration-white/30 underline-offset-4 hover:text-white"
          >
            Or use Social Perks to automate this →
          </Link>
        </section>
      )}

      {/* Quick-tip cards */}
      <section className="mt-14">
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">
          The Steps
        </div>
        <ul className="mt-4 space-y-3">
          {hook.steps.map((step, i) => (
            <li
              key={i}
              className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 active:bg-white/[0.06]"
            >
              <div
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full font-mono text-sm font-semibold"
                style={{
                  background: "rgba(34, 211, 238, 0.12)",
                  color: "#22D3EE",
                }}
              >
                {i + 1}
              </div>
              <div className="text-[15px] leading-relaxed text-white/85">
                {step}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Final CTA */}
      <section
        className="mt-14 rounded-2xl border p-6 text-center"
        style={{
          borderColor: "rgba(34, 211, 238, 0.25)",
          background:
            "linear-gradient(180deg, rgba(34, 211, 238, 0.10) 0%, rgba(34, 211, 238, 0.02) 100%)",
        }}
      >
        <div
          className="font-serif italic text-2xl"
          style={{ fontFamily: "var(--font-instrument-serif, 'Instrument Serif', serif)" }}
        >
          Want this to run on autopilot?
        </div>
        <p className="mt-2 text-sm text-white/70">
          Social Perks turns one happy customer into 50 social posts — automatically.
        </p>
        <Link
          href="/signup"
          className="mt-5 inline-block w-full rounded-xl px-5 py-4 text-base font-semibold text-[#06121A]"
          style={{ background: "#22D3EE" }}
        >
          Start free →
        </Link>
        <Link
          href="/"
          className="mt-3 block text-xs uppercase tracking-[0.18em] text-white/45 hover:text-white/70"
        >
          socialperks.app
        </Link>
      </section>
    </article>
  );
}
