import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { INDUSTRIES, CAMPAIGNS } from "@/lib/playbooks/data";

export const metadata: Metadata = {
  title: "Marketing Playbooks for Local Businesses · Social Perks",
  description:
    "100 industry × campaign-type playbooks. Step-by-step guides for Instagram giveaways, Google review programs, TikTok campaigns, referrals, loyalty, UGC, and more — tuned for restaurants, salons, gyms, and other local businesses.",
  alternates: { canonical: "https://socialperks.io/playbooks" },
  openGraph: {
    title: "Marketing Playbooks for Local Businesses",
    description:
      "100 specific, actionable playbooks for the campaigns that move the needle for local businesses.",
    url: "https://socialperks.io/playbooks",
    siteName: "Social Perks",
    type: "website",
  },
};

export default function PlaybooksIndexPage() {
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Social Perks Playbooks",
    description:
      "Marketing playbooks for local businesses across 10 industries and 10 campaign types.",
    itemListElement: CAMPAIGNS.flatMap((c, ci) =>
      INDUSTRIES.map((i, ii) => ({
        "@type": "ListItem",
        position: ci * INDUSTRIES.length + ii + 1,
        url: `https://socialperks.io/playbooks/${i.slug}/${c.slug}`,
        name: `${c.name} for ${i.Name}`,
      })),
    ),
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <main
        id="main-content"
        className="mx-auto max-w-6xl px-6 py-16 md:py-24"
      >
        {/* Hero */}
        <header className="mb-14 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            Playbooks
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-6xl">
            Marketing playbooks for local businesses
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-brand-text/75">
            Specific, opinionated playbooks for the campaigns that actually move
            the needle. Ten campaign types crossed with ten industries —{" "}
            <span className="font-mono text-brand-cyan">100 playbooks</span> in
            total, each with a 5-step plan, perk structure, timeline, and the
            mistakes that kill execution.
          </p>
        </header>

        {/* Industries quick links */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-xl italic text-brand-white/85">
            Jump to your industry
          </h2>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((i) => (
              <Link
                key={i.slug}
                href={`/playbooks/${i.slug}`}
                className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-sm text-brand-text/80 transition hover:border-brand-cyan/50 hover:bg-brand-cyan/10 hover:text-brand-white"
              >
                {i.Name}
              </Link>
            ))}
          </div>
        </section>

        {/* Grouped by campaign type */}
        <div className="space-y-14">
          {CAMPAIGNS.map((c) => (
            <section key={c.slug}>
              <header className="mb-5 border-l-2 border-brand-cyan/60 pl-4">
                <h2 className="font-serif text-2xl italic leading-snug text-brand-white md:text-3xl">
                  {c.name}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-text/65">
                  {c.description}
                </p>
              </header>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {INDUSTRIES.map((i) => (
                  <Link
                    key={`${c.slug}-${i.slug}`}
                    href={`/playbooks/${i.slug}/${c.slug}`}
                    className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
                  >
                    <span className="text-xs uppercase tracking-wider text-brand-cyan/80">
                      {i.Name}
                    </span>
                    <span className="mt-1 font-serif text-base italic leading-snug text-brand-white group-hover:text-brand-cyan">
                      {c.name} for {i.Name}
                    </span>
                    <span className="mt-3 font-mono text-[11px] uppercase tracking-wider text-brand-text/45">
                      Read playbook →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <section className="mt-20 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-transparent p-8 md:p-12">
          <h2 className="font-serif text-2xl italic leading-snug text-brand-white md:text-3xl">
            Run any of these playbooks with Social Perks
          </h2>
          <p className="mt-3 max-w-2xl text-brand-text/75">
            Social Perks gives you the perk infrastructure, follower-tier logic,
            and submission tracking to execute these playbooks end-to-end. Free
            for 14 days, no card required.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-brand-cyan px-6 py-3 text-sm font-medium text-brand-dark transition hover:bg-brand-cyan/85"
            >
              Start free trial
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-white/15 bg-white/[0.02] px-6 py-3 text-sm text-brand-text/85 transition hover:border-brand-cyan/40 hover:text-brand-white"
            >
              See pricing
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
