import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VS_ENTRIES, getVsEntry } from "@/lib/vs-data";
import { safeJsonForScript } from "@/lib/security/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return VS_ENTRIES.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getVsEntry(slug);
  if (!entry) return { title: "Not found" };
  return {
    title: `Social Perks vs ${entry.competitor} — honest comparison | Social Perks`,
    description: entry.shortDescription,
    alternates: { canonical: `${SITE_URL}/vs/${slug}` },
  };
}

export default async function VsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getVsEntry(slug);
  if (!entry) notFound();

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Social Perks vs ${entry.competitor}`,
    description: entry.shortDescription,
    url: `${SITE_URL}/vs/${slug}`,
    author: { "@type": "Organization", name: "Social Perks", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Social Perks", url: SITE_URL },
  };

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Compare", item: `${SITE_URL}/vs` },
      { "@type": "ListItem", position: 2, name: `vs ${entry.competitor}`, item: `${SITE_URL}/vs/${slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(breadcrumbsLd) }}
      />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <nav className="text-sm text-brand-text-dim mb-8">
          <Link href="/vs" className="hover:text-brand-cyan">Compare</Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text">vs {entry.competitor}</span>
        </nav>

        <header className="mb-10">
          <h1 className="font-serif text-4xl sm:text-5xl italic text-brand-white mb-4 leading-tight">
            Social Perks vs {entry.competitor}
          </h1>
          <p className="text-lg text-brand-text leading-relaxed">{entry.description}</p>
        </header>

        {/* Strengths of competitor — set the table fairly */}
        <section className="mb-10">
          <h2 className="font-serif italic text-2xl text-brand-white mb-3">
            Where {entry.competitor} excels
          </h2>
          <ul className="space-y-2">
            {entry.strengths.map((s) => (
              <li key={s} className="flex gap-2 text-brand-text">
                <span aria-hidden className="text-emerald-400 shrink-0">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* What Social Perks does differently */}
        <section className="mb-10">
          <h2 className="font-serif italic text-2xl text-brand-white mb-3">
            What Social Perks does differently
          </h2>
          <ul className="space-y-2">
            {entry.ourAngle.map((a) => (
              <li key={a} className="flex gap-2 text-brand-text">
                <span aria-hidden className="text-brand-cyan shrink-0">→</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Comparison table */}
        <section className="mb-10">
          <h2 className="font-serif italic text-2xl text-brand-white mb-4">
            Head-to-head
          </h2>
          <div className="rounded-lg border border-brand-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-card border-b border-brand-border">
                  <th className="text-left p-3 font-medium text-brand-text-dim">Feature</th>
                  <th className="text-left p-3 font-medium text-brand-cyan">Social Perks</th>
                  <th className="text-left p-3 font-medium text-brand-text-dim">{entry.competitor}</th>
                </tr>
              </thead>
              <tbody>
                {entry.rows.map((row) => (
                  <tr key={row.feature} className="border-b border-brand-border last:border-0">
                    <td className="p-3 text-brand-text font-medium">{row.feature}</td>
                    <td className={`p-3 ${row.winner === "us" ? "text-brand-cyan font-medium" : "text-brand-text"}`}>
                      {row.socialPerks}
                    </td>
                    <td className={`p-3 ${row.winner === "them" ? "text-brand-text font-medium" : "text-brand-text-dim"}`}>
                      {row.competitor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Verdict */}
        <section className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 p-5">
            <p className="font-medium text-brand-cyan mb-3">Pick Social Perks if:</p>
            <ul className="space-y-2 text-sm text-brand-text">
              {entry.verdict.pickUs.map((v, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden className="shrink-0">•</span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-brand-border bg-brand-card p-5">
            <p className="font-medium text-brand-text mb-3">Pick {entry.competitor} if:</p>
            <ul className="space-y-2 text-sm text-brand-text-dim">
              {entry.verdict.pickThem.map((v, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden className="shrink-0">•</span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center mb-10">
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-brand-cyan text-brand-bg font-medium rounded-lg hover:bg-brand-cyan/90"
          >
            Try Social Perks free
          </Link>
        </section>

        <footer className="pt-8 border-t border-brand-border text-sm text-brand-text-dim">
          <p>
            More:{" "}
            <Link href="/vs" className="text-brand-cyan hover:underline">other comparisons</Link>
            {" "}·{" "}
            <Link href="/pricing" className="text-brand-cyan hover:underline">pricing</Link>
            {" "}·{" "}
            <Link href="/faq" className="text-brand-cyan hover:underline">FAQ</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
