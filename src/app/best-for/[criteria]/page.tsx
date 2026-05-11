import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BEST_FOR } from "@/lib/best-for/data";

export const dynamicParams = true;
export const revalidate = 86400;

export function generateStaticParams() {
  return BEST_FOR.slice(0, 10).map((b) => ({ criteria: b.slug }));
}

type Params = { params: Promise<{ criteria: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { criteria } = await params;
  const item = BEST_FOR.find((b) => b.slug === criteria);
  if (!item) return { title: "Not Found" };
  return {
    title: `${item.title} — Social Perks`,
    description: item.heroSubhead,
    openGraph: { title: item.title, description: item.heroSubhead, type: "article" },
  };
}

export default async function BestForPage({ params }: Params) {
  const { criteria } = await params;
  const item = BEST_FOR.find((b) => b.slug === criteria);
  if (!item) return notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title,
    description: item.heroSubhead,
    author: { "@type": "Organization", name: "Social Perks" },
    publisher: { "@type": "Organization", name: "Social Perks" },
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <nav className="mb-6 text-sm text-gray-400">
        <Link href="/best-for" className="hover:text-cyan-300">
          ← All business types
        </Link>
      </nav>

      <h1 className="font-serif text-4xl italic text-white">{item.title}</h1>
      <p className="mt-4 text-lg text-gray-300">{item.heroSubhead}</p>

      <section className="mt-12">
        <h2 className="font-serif text-2xl italic text-white">What {item.criteria.toLowerCase()} need</h2>
        <ul className="mt-4 space-y-3">
          {item.needs.map((n, i) => (
            <li key={i} className="rounded-lg border border-white/10 p-4">
              <p className="font-semibold text-white">{n.label}</p>
              <p className="mt-1 text-sm text-gray-400">{n.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl italic text-white">Why Social Perks fits</h2>
        <ul className="mt-4 space-y-3">
          {item.whySocialPerks.map((w, i) => (
            <li key={i} className="rounded-lg border-l-2 border-cyan-400 bg-white/5 p-4">
              <p className="font-semibold text-white">{w.headline}</p>
              <p className="mt-1 text-sm text-gray-300">{w.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl italic text-white">How it works for {item.criteria.toLowerCase()}</h2>
        <ol className="mt-4 space-y-2">
          {item.workflow.map((step, i) => (
            <li key={i} className="flex gap-3 text-gray-300">
              <span className="font-mono text-cyan-300">Step {i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 rounded-lg border border-green-400/30 bg-green-400/5 p-6">
        <h2 className="font-serif text-2xl italic text-white">Pricing for {item.criteria.toLowerCase()}</h2>
        <p className="mt-3 text-gray-200">
          <span className="font-semibold">{item.pricingTier.tier}</span> — {item.pricingTier.price}
        </p>
        <p className="mt-2 text-sm text-gray-400">{item.pricingTier.why}</p>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl italic text-white">Compare to alternatives</h2>
        <ul className="mt-4 space-y-2">
          {item.alternativesToCheck.map((a) => (
            <li key={a.slug} className="text-gray-300">
              <Link href={`/alternatives/${a.slug}`} className="text-cyan-300 hover:underline">
                {a.label}
              </Link>
            </li>
          ))}
          <li className="mt-2 text-sm text-gray-400">
            See also: <Link href="/vs" className="text-cyan-300 hover:underline">Full competitor comparison</Link>
          </li>
        </ul>
      </section>

      <section className="mt-12 rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-6 text-center">
        <p className="text-lg text-white">Try free for 14 days</p>
        <p className="mt-1 text-sm text-gray-300">No credit card required. Set up in 15 minutes.</p>
        <Link
          href="/?signup=1"
          className="mt-4 inline-block rounded-md bg-cyan-400 px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-cyan-300"
        >
          Start free trial
        </Link>
      </section>
    </main>
  );
}
