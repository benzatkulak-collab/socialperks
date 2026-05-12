import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  INDUSTRIES,
  CAMPAIGNS,
  getIndustry,
} from "@/lib/playbooks/data";

interface Params {
  industry: string;
}

export function generateStaticParams(): Params[] {
  return INDUSTRIES.map((i) => ({ industry: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { industry } = await params;
  const i = getIndustry(industry);
  if (!i) return {};
  const url = `https://socialperks.app/playbooks/${i.slug}`;
  return {
    title: `Marketing Playbooks for ${i.Name} · Social Perks`,
    description: `Ten complete marketing playbooks for ${i.name}: Instagram giveaways, Google review programs, TikTok campaigns, referrals, loyalty, UGC, influencer partnerships, birthdays, check-ins, and VIP programs.`,
    alternates: { canonical: url },
    openGraph: {
      title: `Marketing Playbooks for ${i.Name}`,
      description: `Ten complete marketing playbooks designed for ${i.name}.`,
      url,
      siteName: "Social Perks",
      type: "website",
    },
  };
}

export default async function IndustryPlaybooksPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { industry } = await params;
  const i = getIndustry(industry);
  if (!i) notFound();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Playbooks for ${i.Name}`,
    description: `Marketing playbooks for ${i.name}.`,
    itemListElement: CAMPAIGNS.map((c, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `https://socialperks.app/playbooks/${i.slug}/${c.slug}`,
      name: c.metaTitle(i),
    })),
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
        className="mx-auto max-w-5xl px-6 py-16 md:py-24"
      >
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-brand-text/55">
          <Link href="/playbooks" className="hover:text-brand-cyan">
            Playbooks
          </Link>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-brand-text/80">{i.Name}</span>
        </nav>

        <header className="mb-12 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            {i.Name}
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl">
            Marketing playbooks for {i.name}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-brand-text/75">
            {i.hook.charAt(0).toUpperCase() + i.hook.slice(1)}. Below, ten
            specific playbooks for {i.name} — built around the perk programs,
            content campaigns, and retention plays that drive {i.metric}.
          </p>
          <p className="mt-3 text-sm text-brand-text/55">
            Typical {i.singular}: {i.avgTicket}. Primary KPI: {i.metric}.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {CAMPAIGNS.map((c) => (
            <Link
              key={c.slug}
              href={`/playbooks/${i.slug}/${c.slug}`}
              className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
            >
              <span className="text-xs uppercase tracking-wider text-brand-cyan/80">
                {c.goal}
              </span>
              <h2 className="mt-2 font-serif text-2xl italic leading-snug text-brand-white group-hover:text-brand-cyan">
                {c.name} for {i.Name}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-brand-text/70">
                {c.description}
              </p>
              <span className="mt-4 font-mono text-[11px] uppercase tracking-wider text-brand-text/50">
                Read the full playbook →
              </span>
            </Link>
          ))}
        </div>

        {/* Cross-link to other industries */}
        <section className="mt-16 border-t border-white/10 pt-10">
          <h2 className="mb-4 font-serif text-xl italic text-brand-white/85">
            Playbooks for other industries
          </h2>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.filter((x) => x.slug !== i.slug).map((x) => (
              <Link
                key={x.slug}
                href={`/playbooks/${x.slug}`}
                className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-sm text-brand-text/75 transition hover:border-brand-cyan/40 hover:text-brand-white"
              >
                {x.Name}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
