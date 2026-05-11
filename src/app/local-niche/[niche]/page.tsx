import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  LOCAL_NICHES,
  LOCAL_CITIES,
  LOCAL_OUTCOMES,
  getNiche,
} from "@/lib/local-niche/data";

interface PageProps {
  params: Promise<{ niche: string }>;
}

export async function generateStaticParams() {
  return LOCAL_NICHES.map((n) => ({ niche: n.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { niche } = await params;
  const n = getNiche(niche);
  if (!n) return {};
  const Plural = n.plural[0].toUpperCase() + n.plural.slice(1);
  return {
    title: `Local Marketing for ${Plural} — ${LOCAL_CITIES.length} Cities × ${LOCAL_OUTCOMES.length} Outcomes`,
    description: `${LOCAL_CITIES.length * LOCAL_OUTCOMES.length} tailored marketing playbooks for ${n.plural}. Pick your city and pick your outcome.`,
    alternates: { canonical: `/local-niche/${n.slug}` },
  };
}

export default async function Page({ params }: PageProps) {
  const { niche } = await params;
  const n = getNiche(niche);
  if (!n) notFound();

  const Plural = n.plural[0].toUpperCase() + n.plural.slice(1);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 text-white">
      <nav className="mb-8 text-xs text-white/50">
        <Link href="/local-niche" className="hover:text-white/80">
          Local marketing
        </Link>
        {" / "}
        <span className="text-white/80">{Plural}</span>
      </nav>

      <header className="mb-12">
        <h1 className="font-serif text-5xl italic leading-tight mb-6">
          Local marketing playbooks for {n.plural}
        </h1>
        <p className="text-xl text-white/70 max-w-3xl">
          {LOCAL_CITIES.length} cities × {LOCAL_OUTCOMES.length} outcomes ={" "}
          {LOCAL_CITIES.length * LOCAL_OUTCOMES.length} playbooks tailored for{" "}
          {n.plural} like yours. Targeting {n.audience} with a typical{" "}
          {n.avgTicket}.
        </p>
      </header>

      {LOCAL_CITIES.map((c) => (
        <section key={c.slug} className="mb-10">
          <h2 className="font-serif text-2xl italic mb-1">
            {c.name}, {c.stateCode}
          </h2>
          <p className="text-sm text-white/50 mb-4">{c.vibe}</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {LOCAL_OUTCOMES.map((o) => (
              <Link
                key={o.slug}
                href={`/local-niche/${n.slug}/${c.slug}/${o.slug}`}
                className="text-sm border border-white/10 rounded-md px-3 py-2 hover:border-cyan-400/50 hover:bg-white/[0.02] transition"
              >
                {o.name}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
