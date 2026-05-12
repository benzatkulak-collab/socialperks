import type { Metadata } from "next";
import Link from "next/link";
import { HOOKS } from "@/lib/hooks/data";

export const metadata: Metadata = {
  title: "Hooks — Social Perks",
  description:
    "Bite-sized playbooks for small businesses, creators, and brands. One hook, one template, one win.",
  alternates: { canonical: "https://socialperks.app/h" },
};

export default function HookIndexPage() {
  return (
    <main
      className="min-h-screen text-white"
      style={{
        background:
          "radial-gradient(ellipse at top, #0F1729 0%, #0C0F1A 50%, #060810 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-3xl px-5 py-16">
        <div className="text-center">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.18em] text-white/50 hover:text-white/80"
          >
            Social Perks
          </Link>
          <h1
            className="mt-6 font-serif italic text-5xl leading-[1.05] tracking-tight sm:text-6xl"
            style={{ fontFamily: "var(--font-instrument-serif, 'Instrument Serif', serif)" }}
          >
            Hooks.
          </h1>
          <p className="mt-4 text-base text-white/70">
            One claim. One template. One win. Built for the link in your bio.
          </p>
        </div>

        <ul className="mt-14 space-y-4">
          {HOOKS.map((h) => (
            <li key={h.slug}>
              <Link
                href={`/h/${h.slug}`}
                className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/40 hover:bg-white/[0.06]"
              >
                <div
                  className="font-mono text-sm font-medium tracking-tight"
                  style={{ color: "#22D3EE" }}
                >
                  {h.proofStat}
                </div>
                <div
                  className="mt-2 font-serif italic text-2xl leading-snug"
                  style={{ fontFamily: "var(--font-instrument-serif, 'Instrument Serif', serif)" }}
                >
                  {h.hook}
                </div>
                <p className="mt-2 text-sm text-white/65">{h.promise}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
