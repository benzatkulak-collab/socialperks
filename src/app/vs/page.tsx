import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { COMPETITORS } from "@/lib/comparison/competitors";

export const metadata: Metadata = {
  title: "Social Perks Comparisons · vs Yotpo, Brandbassador, Loox & more",
  description:
    "Honest comparisons between Social Perks and the leading review, ambassador, and influencer marketing tools. Pricing, features, target audience, and ideal fit.",
  alternates: { canonical: "https://socialperks.io/vs" },
  openGraph: {
    title: "Social Perks vs Yotpo, Brandbassador, Loox, AspireIQ, and more",
    description:
      "Side-by-side honest comparisons of 10 leading customer marketing platforms.",
    url: "https://socialperks.io/vs",
    siteName: "Social Perks",
    type: "website",
  },
};

export default function VsIndexPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <main id="main-content" className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <header className="mb-12 text-center">
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl">
            How Social Perks compares
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-text/80">
            Honest, side-by-side comparisons of Social Perks against ten of the
            most popular review, ambassador, and influencer marketing tools.
            We&apos;ll tell you when the other tool is a better fit.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {COMPETITORS.map((c) => (
            <Link
              key={c.slug}
              href={`/vs/${c.slug}`}
              className="group rounded-xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
            >
              <div className="mb-2 text-xs uppercase tracking-wider text-brand-text/50">
                Social Perks vs
              </div>
              <div className="font-serif text-2xl italic text-brand-white group-hover:text-brand-cyan">
                {c.name}
              </div>
              <p className="mt-2 text-sm text-brand-text/70">{c.tagline}</p>
              <div className="mt-4 text-sm text-brand-cyan opacity-0 transition group-hover:opacity-100">
                Read comparison →
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-transparent p-8 text-center">
          <h2 className="font-serif text-2xl italic text-brand-white">
            Don&apos;t want to read 10 comparisons?
          </h2>
          <p className="mt-2 text-brand-text/80">
            Try Social Perks free for 14 days. No credit card, no demo.
          </p>
          <Link
            href="/ai"
            className="mt-5 inline-block rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
          >
            Start free
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
