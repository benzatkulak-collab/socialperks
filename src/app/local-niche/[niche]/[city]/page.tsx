import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  LOCAL_NICHES,
  LOCAL_CITIES,
  LOCAL_OUTCOMES,
  getNiche,
  getCity,
} from "@/lib/local-niche/data";

interface PageProps {
  params: Promise<{ niche: string; city: string }>;
}

export async function generateStaticParams() {
  const params: { niche: string; city: string }[] = [];
  for (const n of LOCAL_NICHES) {
    for (const c of LOCAL_CITIES) {
      params.push({ niche: n.slug, city: c.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { niche, city } = await params;
  const n = getNiche(niche);
  const c = getCity(city);
  if (!n || !c) return {};
  const Plural = n.plural[0].toUpperCase() + n.plural.slice(1);
  return {
    title: `Marketing for ${Plural} in ${c.name}, ${c.stateCode}`,
    description: `${LOCAL_OUTCOMES.length} tailored marketing playbooks for ${n.plural} in ${c.name}. Instagram, Google reviews, TikTok, referrals, and loyalty.`,
    alternates: { canonical: `/local-niche/${n.slug}/${c.slug}` },
  };
}

export default async function Page({ params }: PageProps) {
  const { niche, city } = await params;
  const n = getNiche(niche);
  const c = getCity(city);
  if (!n || !c) notFound();

  const Plural = n.plural[0].toUpperCase() + n.plural.slice(1);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-white">
      <nav className="mb-8 text-xs text-white/50">
        <Link href="/local-niche" className="hover:text-white/80">
          Local marketing
        </Link>
        {" / "}
        <Link
          href={`/local-niche/${n.slug}`}
          className="hover:text-white/80"
        >
          {Plural}
        </Link>
        {" / "}
        <span className="text-white/80">
          {c.name}, {c.stateCode}
        </span>
      </nav>

      <header className="mb-12">
        <h1 className="font-serif text-5xl italic leading-tight mb-6">
          Marketing playbooks for {n.plural} in {c.name}, {c.stateCode}
        </h1>
        <p className="text-lg text-white/70 mb-4">{c.flavor}</p>
        <p className="text-white/60">
          Pick the outcome you want to grow. Each playbook is tailored to{" "}
          {n.plural} in {c.name} specifically — not generic marketing advice.
        </p>
      </header>

      <section className="grid sm:grid-cols-2 gap-4 mb-12">
        {LOCAL_OUTCOMES.map((o) => (
          <Link
            key={o.slug}
            href={`/local-niche/${n.slug}/${c.slug}/${o.slug}`}
            className="block border border-white/10 rounded-lg p-6 hover:border-cyan-400/50 hover:bg-white/[0.02] transition"
          >
            <div className="font-medium text-white mb-2 text-lg">
              {o.name}
            </div>
            <div className="text-sm text-white/60 mb-3">{o.benefit}</div>
            <div className="text-xs text-cyan-400">
              Read the {c.name} playbook →
            </div>
          </Link>
        ))}
      </section>

      <section className="border-t border-white/10 pt-10">
        <h2 className="text-sm uppercase tracking-wider text-white/50 mb-3">
          {Plural} in other cities
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {LOCAL_CITIES.filter((x) => x.slug !== c.slug).map((x) => (
            <Link
              key={x.slug}
              href={`/local-niche/${n.slug}/${x.slug}`}
              className="text-cyan-400 hover:text-cyan-300"
            >
              {n.plural} in {x.name} →
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
