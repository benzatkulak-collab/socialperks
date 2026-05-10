import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { CacCalculator } from "./cac-calculator";

export const metadata: Metadata = {
  title: "Free CAC Calculator for Small Business · Social Perks",
  description:
    "Calculate your Customer Acquisition Cost (CAC) and benchmark it against your industry. Free, instant, no signup.",
  openGraph: {
    title: "Free CAC Calculator for Small Business",
    description:
      "Find out what it costs you to acquire a customer — and how it compares to your industry.",
    url: "https://socialperks.onrender.com/tools/cac-calculator",
    siteName: "Social Perks",
    type: "website",
  },
};

export default function CacCalculatorPage() {
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
              CAC{" "}
              <span className="bg-gradient-to-r from-brand-cyan to-brand-green bg-clip-text text-transparent">
                Calculator
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
              How much does it cost to land one new customer? Find out in 5
              seconds — and see how you stack up against your industry.
            </p>
          </div>
        </section>

        <CacCalculator />

        <div className="h-16" />
      </main>
      <Footer />
    </div>
  );
}
