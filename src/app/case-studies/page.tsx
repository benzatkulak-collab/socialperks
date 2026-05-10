import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { CASE_STUDIES } from "@/lib/case-studies/data";

export const metadata: Metadata = {
  title: "Case Studies · Social Perks",
  description:
    "Real-world playbooks from small businesses using Social Perks to get reviews, grow social media, and fill schedules. Coffee shops, salons, restaurants, dental practices and more.",
  alternates: {
    canonical: "https://socialperks.onrender.com/case-studies",
  },
  openGraph: {
    title: "Social Perks Case Studies",
    description:
      "How small businesses use Social Perks to get reviews, grow social media, and fill schedules.",
    url: "https://socialperks.onrender.com/case-studies",
    siteName: "Social Perks",
    type: "website",
  },
};

export default function CaseStudiesIndexPage() {
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Social Perks Case Studies",
    description:
      "Real-world playbooks from small businesses using Social Perks.",
    itemListElement: CASE_STUDIES.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://socialperks.onrender.com/case-studies/${c.slug}`,
      name: c.title,
    })),
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <Nav />
      <main id="main-content">
        <section className="relative pt-32 pb-12 sm:pt-40">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.05),transparent_60%)]"
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <span className="inline-flex rounded-full border border-brand-cyan/30 bg-brand-cyan/5 px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
              Case studies
            </span>
            <h1 className="mt-5 font-heading text-[clamp(2rem,4.5vw,3.75rem)] italic leading-[1.05] tracking-tight text-brand-white">
              Real businesses,{" "}
              <span className="bg-gradient-to-r from-brand-cyan to-brand-green bg-clip-text text-transparent">
                real results
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
              Detailed playbooks from coffee shops, salons, restaurants, food
              trucks, and more — exactly how they used Social Perks to get
              reviews, fill schedules, and grow on social media.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CASE_STUDIES.map((c) => (
              <Link
                key={c.slug}
                href={`/case-studies/${c.slug}`}
                className="group rounded-xl border border-brand-border/60 bg-brand-card/30 p-6 transition-colors hover:border-brand-cyan/40"
              >
                <span className="font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
                  {c.businessType} · {c.location}
                </span>
                <h2 className="mt-3 font-heading text-xl italic leading-snug text-brand-white group-hover:text-brand-cyan">
                  {c.title}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm text-brand-dim">
                  {c.description}
                </p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-brand-green">
                  {c.headlineResult}
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-16 rounded-xl border border-brand-cyan/40 bg-gradient-to-br from-brand-cyan/10 to-brand-card/40 p-8 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
              Ready to run your own campaign?
            </p>
            <h2 className="mt-3 font-heading text-3xl italic text-brand-white">
              Start your 14-day free trial
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-dim">
              Copy any of these templates in about ten minutes. No credit card
              required.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition-transform hover:-translate-y-0.5"
            >
              Start free trial
              <span aria-hidden>&rarr;</span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
