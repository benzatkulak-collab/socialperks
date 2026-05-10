import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { ShareButtons } from "@/components/shared/share-buttons";
import {
  CASE_STUDIES,
  getCaseStudyBySlug,
  type CaseStudySection,
} from "@/lib/case-studies/data";

interface PageParams {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return CASE_STUDIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug);
  if (!study) return { title: "Not Found · Social Perks" };

  const url = `https://socialperks.onrender.com/case-studies/${study.slug}`;
  return {
    title: `${study.title} · Social Perks`,
    description: study.description,
    alternates: { canonical: url },
    openGraph: {
      title: study.title,
      description: study.description,
      url,
      type: "article",
      siteName: "Social Perks",
      publishedTime: study.publishedAt,
      modifiedTime: study.updatedAt ?? study.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: study.title,
      description: study.description,
    },
  };
}

function SectionBlock({ section }: { section: CaseStudySection }) {
  return (
    <section className="mt-10">
      <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
        {section.heading}
      </h2>
      <div className="mt-4 space-y-4 text-brand-dim leading-relaxed">
        {section.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {section.bullets && section.bullets.length > 0 && (
        <ul className="mt-5 space-y-2 text-brand-dim">
          {section.bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-cyan" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function CaseStudyPage({ params }: PageParams) {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug);
  if (!study) notFound();

  const url = `https://socialperks.onrender.com/case-studies/${study.slug}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: study.title,
    description: study.description,
    author: {
      "@type": "Organization",
      name: "Social Perks",
    },
    publisher: {
      "@type": "Organization",
      name: "Social Perks",
      logo: {
        "@type": "ImageObject",
        url: "https://socialperks.onrender.com/icon-192.png",
      },
    },
    datePublished: study.publishedAt,
    dateModified: study.updatedAt ?? study.publishedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    about: study.businessType,
    locationCreated: study.location,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://socialperks.onrender.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Case studies",
        item: "https://socialperks.onrender.com/case-studies",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: study.title,
        item: url,
      },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Nav />
      <main id="main-content" className="pt-28 pb-20 sm:pt-36">
        <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/case-studies"
            className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted transition-colors hover:text-brand-cyan"
          >
            ← All case studies
          </Link>

          <header className="mt-5 border-b border-brand-border/40 pb-8">
            <span className="inline-flex rounded-full border border-brand-cyan/30 bg-brand-cyan/5 px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
              {study.businessType} · {study.location} · {study.timePeriod}
            </span>
            <h1 className="mt-4 font-heading text-3xl italic leading-tight text-brand-white sm:text-4xl lg:text-5xl">
              {study.h1}
            </h1>
            <p className="mt-4 text-lg text-brand-dim">{study.description}</p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-brand-green">
              Headline result: {study.headlineResult}
            </p>
          </header>

          {/* Hero stats */}
          <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {study.hero.map((h, i) => (
              <div
                key={i}
                className="rounded-lg border border-brand-border/60 bg-brand-card/30 p-4"
              >
                <p className="font-mono text-[9px] uppercase tracking-wider text-brand-muted">
                  {h.label}
                </p>
                <p className="mt-2 font-heading text-2xl italic text-brand-white">
                  {h.stat}
                </p>
                <p className="mt-1 text-xs text-brand-dim">{h.detail}</p>
              </div>
            ))}
          </section>

          <div className="mt-8">
            <ShareButtons
              url={url}
              title={study.title}
              summary={study.description}
            />
          </div>

          <SectionBlock section={study.challenge} />
          <SectionBlock section={study.triedBefore} />
          <SectionBlock section={study.approach} />
          <SectionBlock section={study.results} />

          <section className="mt-10">
            <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
              What they learned
            </h2>
            <div className="mt-4 space-y-5">
              {study.lessons.map((l, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-brand-border/40 bg-brand-card/20 p-5"
                >
                  <h3 className="font-heading text-lg italic text-brand-white">
                    {i + 1}. {l.title}
                  </h3>
                  <p className="mt-2 text-brand-dim leading-relaxed">
                    {l.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <SectionBlock section={study.tryYourself} />

          <div className="mt-12 rounded-xl border border-brand-cyan/40 bg-gradient-to-br from-brand-cyan/10 to-brand-card/40 p-8">
            <p className="font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
              Ready to run a campaign like this?
            </p>
            <h2 className="mt-3 font-heading text-3xl italic text-brand-white">
              Start your 14-day free trial
            </h2>
            <p className="mt-3 text-brand-dim">
              Templates ship with FTC compliance, automatic verification, and
              POS integration. Launch in under ten minutes.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition-transform hover:-translate-y-0.5"
            >
              Start free trial
              <span aria-hidden>&rarr;</span>
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
