import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PLAYBOOKS, getPlaybook } from "@/lib/playbook-data";
import { safeJsonForScript } from "@/lib/security/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return PLAYBOOKS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getPlaybook(slug);
  if (!p) return { title: "Not found" };
  return {
    title: `${p.title} | Social Perks`,
    description: p.description,
    alternates: { canonical: `${SITE_URL}/playbook/${slug}` },
  };
}

export default async function PlaybookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = getPlaybook(slug);
  if (!p) notFound();

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: p.description,
    url: `${SITE_URL}/playbook/${slug}`,
    author: { "@type": "Organization", name: "Social Perks", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Social Perks", url: SITE_URL },
    about: [
      { "@type": "Thing", name: p.platform },
      { "@type": "Thing", name: p.industry },
    ],
  };

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Playbooks", item: `${SITE_URL}/playbook` },
      { "@type": "ListItem", position: 2, name: p.title, item: `${SITE_URL}/playbook/${slug}` },
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
          <Link href="/playbook" className="hover:text-brand-cyan">Playbooks</Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text">{p.platform} × {p.industry}</span>
        </nav>

        <header className="mb-10">
          <h1 className="font-serif text-4xl sm:text-5xl italic text-brand-white mb-4 leading-tight">
            {p.title}
          </h1>
          <p className="text-lg text-brand-text leading-relaxed">{p.description}</p>
        </header>

        {/* Quick start — 3 actions */}
        <section className="rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 p-5 mb-10">
          <p className="font-medium text-brand-cyan mb-3">Quick start (3 steps)</p>
          <ol className="space-y-2.5 text-brand-text">
            {p.quickStart.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan text-xs font-semibold">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Long-form sections */}
        {p.sections.map((s) => (
          <section key={s.heading} className="mb-10">
            <h2 className="font-serif italic text-2xl text-brand-white mb-3">
              {s.heading}
            </h2>
            <div className="text-brand-text leading-relaxed whitespace-pre-line">
              {s.body}
            </div>
          </section>
        ))}

        {/* Recommended actions */}
        <section className="mb-10">
          <h2 className="font-serif italic text-2xl text-brand-white mb-3">
            Recommended actions
          </h2>
          <p className="text-sm text-brand-text-dim mb-3">
            Perk range: ${p.perkRange.min}–${p.perkRange.max} per completion.
          </p>
          <div className="flex flex-wrap gap-2">
            {p.recommendedActions.map((id) => (
              <Link
                key={id}
                href={`/actions/${id}`}
                className="inline-block px-3 py-1.5 rounded-full border border-brand-border bg-brand-card text-sm hover:border-brand-cyan/40"
              >
                {id}
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center mb-10">
          <Link
            href={`/dashboard?intent=campaign&platformId=${p.platformId}&industry=${p.industrySlug}`}
            className="inline-block px-6 py-3 bg-brand-cyan text-brand-bg font-medium rounded-lg hover:bg-brand-cyan/90"
          >
            Launch a {p.platform} campaign for your {p.industry.toLowerCase()}
          </Link>
        </section>

        <footer className="pt-8 border-t border-brand-border text-sm text-brand-text-dim">
          <p>
            Cross-references:{" "}
            <Link href={`/platforms/${p.platformId}`} className="text-brand-cyan hover:underline">{p.platform} platform page</Link>
            {" "}·{" "}
            <Link href={`/for/${p.industrySlug}`} className="text-brand-cyan hover:underline">{p.industry} industry page</Link>
            {" "}·{" "}
            <Link href={`/for/${p.industrySlug}/on/${p.platformId}`} className="text-brand-cyan hover:underline">combined page</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
