import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  TEMPLATES,
  CATEGORY_META,
  type TemplateCategory,
} from "@/lib/templates/data";
import { EmailCapture } from "./email-capture";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const template = TEMPLATES.find((t) => t.slug === slug);
  if (!template) return { title: "Template not found" };

  return {
    title: `${template.title} — Free Download · Social Perks`,
    description: template.description,
    openGraph: {
      title: template.title,
      description: template.description,
      url: `https://socialperks.onrender.com/templates/${template.slug}`,
      siteName: "Social Perks",
      type: "article",
    },
  };
}

const BADGE_CLASSES: Record<string, string> = {
  cyan: "border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan",
  green: "border-brand-green/30 bg-brand-green/10 text-brand-green",
  amber: "border-brand-amber/30 bg-brand-amber/10 text-brand-amber",
  pink: "border-pink-500/30 bg-pink-500/10 text-pink-400",
  purple: "border-purple-500/30 bg-purple-500/10 text-purple-400",
};

export default async function TemplatePage({ params }: PageProps) {
  const { slug } = await params;
  const template = TEMPLATES.find((t) => t.slug === slug);
  if (!template) notFound();

  const color = CATEGORY_META[template.category as TemplateCategory].color;
  const related = TEMPLATES.filter(
    (t) => t.category === template.category && t.slug !== template.slug,
  ).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: template.title,
    description: template.description,
    creator: {
      "@type": "Organization",
      name: "Social Perks",
      url: "https://socialperks.onrender.com",
    },
    genre: template.categoryLabel,
    isAccessibleForFree: true,
    inLanguage: "en-US",
    keywords: [
      template.categoryLabel,
      "small business marketing",
      "free template",
      template.title.toLowerCase(),
    ].join(", "),
    url: `https://socialperks.onrender.com/templates/${template.slug}`,
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main id="main-content">
        <section className="relative pt-32 pb-12 sm:pt-40">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.05),transparent_60%)]"
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <Link
              href="/templates"
              className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted transition-colors hover:text-brand-cyan"
            >
              ← All templates
            </Link>

            <span
              className={`mt-5 inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] ${BADGE_CLASSES[color]}`}
            >
              {template.categoryLabel}
            </span>

            <h1 className="mt-4 font-heading text-[clamp(1.75rem,4vw,3rem)] italic leading-[1.1] tracking-tight text-brand-white">
              {template.title}
            </h1>

            <p className="mt-5 text-base leading-relaxed text-brand-dim sm:text-lg">
              {template.description}
            </p>
          </div>
        </section>

        <section className="pb-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
            <div className="space-y-10 lg:col-span-2">
              <div>
                <h2 className="font-heading text-2xl italic text-brand-white">
                  What&apos;s inside
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {template.whatsInside.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm leading-relaxed text-brand-text"
                    >
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-cyan" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="font-heading text-2xl italic text-brand-white">
                  How to use it
                </h2>
                <ol className="mt-4 space-y-4">
                  {template.howToUse.map((step, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-brand-cyan/30 bg-brand-cyan/10 font-mono text-xs text-brand-cyan">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-relaxed text-brand-text">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <h2 className="font-heading text-2xl italic text-brand-white">
                  Why this template works
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-brand-text">
                  {template.why}
                </p>
              </div>
            </div>

            <div className="lg:sticky lg:top-24 lg:self-start">
              <EmailCapture
                slug={template.slug}
                title={template.title}
                content={template.content}
              />
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="border-t border-brand-border pb-24 pt-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
                Related templates
              </h2>
              <p className="mt-2 text-sm text-brand-dim">
                More in {template.categoryLabel}.
              </p>

              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {related.map((tpl) => (
                  <Link
                    key={tpl.slug}
                    href={`/templates/${tpl.slug}`}
                    className="group flex flex-col rounded-2xl border border-brand-border bg-brand-surface/50 p-6 transition-all hover:-translate-y-1 hover:border-brand-cyan/40 hover:bg-brand-surface"
                  >
                    <span
                      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] ${BADGE_CLASSES[CATEGORY_META[tpl.category as TemplateCategory].color]}`}
                    >
                      {tpl.categoryLabel}
                    </span>
                    <h3 className="mt-4 font-heading text-lg italic leading-tight text-brand-white">
                      {tpl.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-brand-dim">
                      {tpl.description}
                    </p>
                    <span className="mt-4 text-sm font-medium text-brand-cyan transition-transform group-hover:translate-x-0.5">
                      Get template →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
