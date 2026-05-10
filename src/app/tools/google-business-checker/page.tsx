import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { GoogleBusinessChecker } from "./google-business-checker";

export const metadata: Metadata = {
  title: "Free Google Business Profile Checker · Social Perks",
  description:
    "12-point audit of your Google Business Profile. See what's missing and how to fix it. Saves your progress automatically.",
  openGraph: {
    title: "Free Google Business Profile Checker",
    description:
      "12 things to verify on your Google Business Profile. Saves locally so you can come back.",
    url: "https://socialperks.onrender.com/tools/google-business-checker",
    siteName: "Social Perks",
    type: "website",
  },
};

export default function GoogleBusinessCheckerPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <Nav />
      <main id="main-content">
        <section className="relative pt-32 pb-12 sm:pt-40">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.05),transparent_60%)]"
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <Link
              href="/tools"
              className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted transition-colors hover:text-brand-cyan"
            >
              ← All free tools
            </Link>
            <h1 className="mt-5 font-heading text-[clamp(2rem,4.5vw,3.5rem)] italic leading-[1.05] tracking-tight text-brand-white">
              Google Business{" "}
              <span className="bg-gradient-to-r from-brand-cyan to-brand-green bg-clip-text text-transparent">
                Profile Checker
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
              A 12-point audit of your Google Business Profile. We&apos;ll
              walk you through what to check and how to fix each one.
              Progress saves locally.
            </p>
          </div>
        </section>

        <GoogleBusinessChecker />

        <div className="h-16" />
      </main>
      <Footer />
    </div>
  );
}
