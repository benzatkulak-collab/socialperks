import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  ANSWERS,
  ANSWER_SLUGS,
  CATEGORY_META,
  getAnswerBySlug,
  type AnswerPage,
} from "@/lib/answers-data";
import { INDUSTRY_MAP } from "@/lib/industries";
import { PLATFORMS } from "@/lib/platforms";
import { safeJsonForScript } from "@/lib/security/json-ld";

// ─── Static generation ─────────────────────────────────────────────────

export function generateStaticParams() {
  return ANSWER_SLUGS.map((slug) => ({ slug }));
}

// ─── Metadata ──────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const ans = getAnswerBySlug(slug);
  if (!ans) return {};

  const title = `${ans.question} — Social Perks`;
  const description = ans.shortAnswer;

  return {
    title,
    description,
    openGraph: {
      title: ans.question,
      description,
      type: "article",
      url: `https://socialperks.app/answers/${ans.slug}`,
      siteName: "Social Perks",
    },
    twitter: {
      card: "summary_large_image",
      title: ans.question,
      description,
    },
    alternates: {
      canonical: `https://socialperks.app/answers/${ans.slug}`,
    },
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────

/**
 * Resolve related-answer slugs into full AnswerPage objects. Filters
 * out anything stale or missing rather than 404-ing the parent page.
 */
function resolveRelated(ans: AnswerPage): AnswerPage[] {
  const slugs = ans.related.answerSlugs ?? [];
  return slugs
    .map((s) => getAnswerBySlug(s))
    .filter((a): a is AnswerPage => a !== undefined);
}

function resolveIndustries(ans: AnswerPage) {
  return (ans.related.industries ?? [])
    .map((slug) => INDUSTRY_MAP.get(slug))
    .filter((i): i is NonNullable<ReturnType<typeof INDUSTRY_MAP.get>> => i !== undefined);
}

function resolvePlatforms(ans: AnswerPage) {
  return (ans.related.platformIds ?? [])
    .map((id) => PLATFORMS.find((p) => p.id === id))
    .filter(<T,>(p: T | undefined): p is T => p !== undefined);
}

// Split longAnswer into paragraphs for clean rendering.
function paragraphs(text: string): string[] {
  return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

/**
 * Tiny markdown handler for bold (`**word**`). The longAnswer field uses
 * markdown-flavored emphasis to highlight key terms; React strips
 * unknown tags so we render explicitly.
 */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-brand-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Page ──────────────────────────────────────────────────────────────

export default async function AnswerPage({ params }: PageProps) {
  const { slug } = await params;
  const ans = getAnswerBySlug(slug);
  if (!ans) notFound();

  const related = resolveRelated(ans);
  const industries = resolveIndustries(ans);
  const platforms = resolvePlatforms(ans);
  const categoryMeta = CATEGORY_META[ans.category];
  const lastReviewedFormatted = new Date(ans.lastReviewed).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  // QAPage Schema.org — purpose-built for Q&A content, eligible for
  // featured-snippet style results in Google + heavily preferred by
  // ChatGPT / Perplexity / Claude when citing answers.
  const qaSchema = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: ans.question,
      text: ans.question,
      answerCount: 1,
      acceptedAnswer: {
        "@type": "Answer",
        text: ans.shortAnswer + "\n\n" + ans.longAnswer,
        dateCreated: ans.lastReviewed,
        author: {
          "@type": "Organization",
          name: "Social Perks",
          url: "https://socialperks.app",
        },
        url: `https://socialperks.app/answers/${ans.slug}`,
      },
    },
  };

  // BreadcrumbList — gives Google the path for sitelinks-style results.
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://socialperks.app",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Answers",
        item: "https://socialperks.app/answers",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: ans.question,
        item: `https://socialperks.app/answers/${ans.slug}`,
      },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(qaSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(breadcrumbSchema) }}
      />

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative bg-brand-bg pt-32 pb-12 sm:pt-40 sm:pb-16">
        <div
          className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand-cyan/[0.04] blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <nav
            className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-brand-muted"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-brand-text transition-colors">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/answers"
              className="hover:text-brand-text transition-colors"
            >
              Answers
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-brand-cyan">{categoryMeta.label}</span>
          </nav>

          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            {categoryMeta.label}
          </p>
          <h1 className="font-heading text-[clamp(1.875rem,4vw,3rem)] italic leading-[1.15] text-brand-white">
            {ans.question}
          </h1>

          {/* The short answer is the featured-snippet target. Render
              it prominently and verbatim so Google/LLMs can lift it
              cleanly. */}
          <div className="mt-8 rounded-2xl border-l-2 border-brand-cyan bg-brand-surface/40 p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-cyan mb-2">
              Short answer
            </p>
            <p className="text-base leading-relaxed text-brand-white sm:text-lg">
              {ans.shortAnswer}
            </p>
          </div>

          <p className="mt-4 text-xs text-brand-muted">
            Reviewed {lastReviewedFormatted}
          </p>
        </div>
      </section>

      {/* ── Body ────────────────────────────────────────────────── */}
      <section className="bg-brand-bg pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Key points — scan-friendly bullets above the long-form
              answer so visitors can take the value in 5 seconds. */}
          {ans.keyPoints.length > 0 && (
            <div className="rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-5 sm:p-6">
              <h2 className="font-heading text-xl italic text-brand-white mb-4">
                Key points
              </h2>
              <ul className="space-y-2.5" role="list">
                {ans.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-cyan/10 text-xs text-brand-cyan"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-brand-text sm:text-base">
                      {renderInline(point)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Long-form answer */}
          <div className="prose-on-dark">
            <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl mb-5">
              The full answer
            </h2>
            <div className="space-y-5 text-base leading-relaxed text-brand-text sm:text-lg">
              {paragraphs(ans.longAnswer).map((p, i) => (
                <p key={i}>{renderInline(p)}</p>
              ))}
            </div>
          </div>

          {/* CTAs */}
          {ans.ctas.length > 0 && (
            <div className="rounded-2xl border border-brand-cyan/30 bg-brand-cyan/[0.04] p-5 sm:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-cyan mb-3">
                What to do next
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {ans.ctas.map((cta, i) => (
                  <Link
                    key={i}
                    href={cta.href}
                    className={
                      i === 0
                        ? "rounded-xl bg-brand-cyan px-5 py-3 text-center text-sm font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:shadow-md hover:shadow-brand-cyan/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50"
                        : "rounded-xl border border-brand-border bg-brand-surface px-5 py-3 text-center text-sm font-semibold text-brand-text transition-all hover:border-brand-subtle hover:bg-brand-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/30"
                    }
                    data-cta-source={`answer:${ans.slug}`}
                  >
                    {cta.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Related answers ─────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="bg-brand-bg pb-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-5 font-heading text-2xl italic text-brand-white sm:text-3xl">
              Related questions
            </h2>
            <ul className="space-y-2" role="list">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/answers/${r.slug}`}
                    className="group flex items-start justify-between gap-3 rounded-xl border border-brand-border/40 bg-brand-surface/30 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-brand-cyan/40 hover:bg-brand-surface/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-white group-hover:text-brand-cyan transition-colors">
                        {r.question}
                      </p>
                      <p className="mt-1 text-xs text-brand-dim line-clamp-1">
                        {r.shortAnswer}
                      </p>
                    </div>
                    <span
                      className="shrink-0 text-brand-cyan transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Topical cross-links (industries + platforms) ────────── */}
      {(industries.length > 0 || platforms.length > 0) && (
        <section className="bg-brand-bg pb-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
              Explore further
            </p>
            <div className="flex flex-wrap gap-2">
              {industries.map((ind) => (
                <Link
                  key={`ind-${ind.slug}`}
                  href={`/for/${ind.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-surface/40 px-3 py-1.5 text-xs text-brand-text transition-all hover:border-brand-cyan/40 hover:bg-brand-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/30"
                >
                  <span aria-hidden="true">{ind.icon}</span>
                  <span>{ind.name}</span>
                </Link>
              ))}
              {platforms.map((p) => (
                <Link
                  key={`plt-${p.id}`}
                  href={`/platforms/${p.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-surface/40 px-3 py-1.5 text-xs text-brand-text transition-all hover:border-brand-cyan/40 hover:bg-brand-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/30"
                >
                  <span aria-hidden="true">{p.icon}</span>
                  <span>{p.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

// Keep ANSWERS reachable for static analysis (sitemap depends on it
// being reachable from the route — Next.js tree-shakes unused imports
// in app-dir, but a defensive reference avoids surprises).
void ANSWERS;
