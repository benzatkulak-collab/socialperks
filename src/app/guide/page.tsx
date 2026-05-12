import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { PILLARS } from "@/lib/pillars/data";

export const metadata: Metadata = {
  title:
    "The Complete Social Perks Guides — Long-form Marketing Intelligence",
  description:
    "Ten pillar guides covering the full small business marketing stack — strategy, customer acquisition, reviews, Instagram, local SEO, loyalty, UGC, referrals, influencer marketing, and AI.",
  alternates: { canonical: "https://socialperks.app/guide" },
  openGraph: {
    title:
      "The Complete Social Perks Guides — Long-form Marketing Intelligence",
    description:
      "Ten flagship pillar guides covering everything a small business needs to know about marketing in 2026.",
    url: "https://socialperks.app/guide",
    siteName: "Social Perks",
    type: "website",
  },
};

export default function GuideIndexPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Social Perks Pillar Guides",
    description:
      "Ten long-form authority guides covering small business marketing in 2026.",
    url: "https://socialperks.app/guide",
    numberOfItems: PILLARS.length,
    itemListElement: PILLARS.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://socialperks.app/guide/${p.slug}`,
      name: p.h1,
    })),
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main
        id="main-content"
        className="mx-auto max-w-5xl px-6 py-16 md:py-24"
      >
        <header className="mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            Flagship guides
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl lg:text-6xl">
            The complete Social Perks guides —{" "}
            <span className="text-brand-cyan">
              long-form marketing intelligence
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-brand-text/70 md:text-xl">
            Ten flagship pillar guides covering everything a small business
            owner needs to know about marketing in 2026 — strategy, channels,
            customer acquisition, retention, AI, and the systems that compound.
            Each guide is a serious, structured read with depth you will not
            find on a blog. Written for owners, not consultants.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-brand-text/60">
            <span className="font-mono text-brand-cyan">
              {PILLARS.length} pillar guides
            </span>
            <span aria-hidden>·</span>
            <span>
              {PILLARS.reduce((acc, p) => acc + p.wordCount, 0).toLocaleString()}{" "}
              words
            </span>
            <span aria-hidden>·</span>
            <span>
              {PILLARS.reduce((acc, p) => acc + p.readingMinutes, 0)} minutes
              total
            </span>
          </div>
        </header>

        <section className="grid gap-5 sm:grid-cols-2">
          {PILLARS.map((p, idx) => (
            <Link
              key={p.slug}
              href={`/guide/${p.slug}`}
              className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-xs text-brand-cyan/70">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="rounded-full border border-brand-cyan/20 bg-brand-cyan/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wider text-brand-cyan/85">
                  {p.category}
                </span>
              </div>
              <h2 className="font-serif text-2xl italic leading-snug text-brand-white group-hover:text-brand-cyan md:text-[1.65rem]">
                {p.h1}
              </h2>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-brand-text/65 md:text-base">
                {p.description}
              </p>
              <div className="mt-4 flex items-center gap-x-3 gap-y-1 text-xs text-brand-text/55">
                <span className="font-mono text-brand-cyan/80">
                  {p.readingMinutes} min read
                </span>
                <span aria-hidden>·</span>
                <span>{p.wordCount.toLocaleString()} words</span>
                <span aria-hidden>·</span>
                <span>{p.sections.length} sections</span>
              </div>
            </Link>
          ))}
        </section>

        {/* Inline navigation */}
        <section className="mt-16 border-t border-white/10 pt-10">
          <h2 className="mb-4 font-serif text-2xl italic text-brand-white">
            Where to go next
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {[
              { label: "How-to guides", href: "/how-to" },
              { label: "Glossary", href: "/glossary" },
              { label: "Case studies", href: "/case-studies" },
              { label: "Stories", href: "/stories" },
              { label: "Playbooks", href: "/playbooks" },
              { label: "Services", href: "/services" },
              { label: "Tools", href: "/tools" },
              { label: "Templates", href: "/templates" },
              { label: "Industries", href: "/industries" },
              { label: "Communities", href: "/communities" },
              { label: "Pricing", href: "/pricing" },
              { label: "Alternatives", href: "/alternatives" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md border border-white/5 bg-white/[0.015] px-3 py-2 text-center text-sm text-brand-text/80 transition hover:border-brand-cyan/30 hover:text-brand-cyan"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
