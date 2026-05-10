import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { allPosts, getPostBySlug, getRelatedPosts } from "@/lib/blog/posts";
import { renderMarkdown, estimateReadingTime } from "@/lib/blog/render";
import { NewsletterForm } from "@/components/shared/newsletter-form";
import { ShareButtons } from "@/components/shared/share-buttons";

interface PageParams {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return allPosts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Not Found — Social Perks Blog" };

  const url = `https://socialperks.io/blog/${post.slug}`;

  return {
    title: `${post.title} | Social Perks Blog`,
    description: post.description,
    keywords: [post.keyword, post.category, "small business marketing"],
    authors: [{ name: post.author }],
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      authors: [post.author],
      tags: [post.category, post.keyword],
      siteName: "Social Perks",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function BlogPostPage({ params }: PageParams) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const rendered = renderMarkdown(post.content);
  const readingTime = post.readingTimeMinutes || estimateReadingTime(rendered.wordCount);
  const related = getRelatedPosts(post, 3);
  const url = `https://socialperks.io/blog/${post.slug}`;

  // Build the article schema for rich snippets
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    author: {
      "@type": "Organization",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Social Perks",
      logo: {
        "@type": "ImageObject",
        url: "https://socialperks.io/icon-192.png",
      },
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    articleSection: post.category,
    keywords: [post.keyword, post.category].join(", "),
  };

  // Split the rendered HTML into two halves so we can insert the email capture
  // form (a real React component) between them.
  const { firstHalf, secondHalf } = splitHtmlForCapture(rendered.html);

  const dateLabel = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-brand-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Header */}
      <header className="border-b border-brand-border/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2" aria-label="Home">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-cyan/10">
              <span className="font-heading text-lg text-brand-cyan">S</span>
            </div>
            <span className="font-heading text-xl italic text-brand-white">
              Social Perks
            </span>
          </Link>
          <Link
            href="/blog"
            className="text-sm text-brand-muted transition-colors hover:text-brand-text"
          >
            &larr; All articles
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
          <article className="min-w-0">
            {/* Title block */}
            <div className="border-b border-brand-border/40 pb-8">
              <span className="inline-flex rounded-full border border-brand-cyan/30 bg-brand-cyan/5 px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
                {post.category}
              </span>
              <h1 className="mt-4 font-heading text-3xl italic leading-tight text-brand-white sm:text-4xl lg:text-5xl">
                {post.title}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-brand-dim">
                {post.description}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-brand-muted">
                <span>By {post.author}</span>
                <span aria-hidden>·</span>
                <span>{dateLabel}</span>
                <span aria-hidden>·</span>
                <span>{readingTime} min read</span>
              </div>
            </div>

            {/* Mobile-only TOC */}
            {rendered.headings.length > 0 && (
              <details className="my-6 rounded-lg border border-brand-border/40 bg-brand-card/30 p-4 lg:hidden">
                <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
                  Table of contents
                </summary>
                <ul className="mt-3 space-y-2 text-sm">
                  {rendered.headings.map(h => (
                    <li
                      key={h.id}
                      className={h.level === 3 ? "pl-4" : ""}
                    >
                      <a
                        href={`#${h.id}`}
                        className="text-brand-muted hover:text-brand-cyan"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {/* Share */}
            <div className="mt-6">
              <ShareButtons
                url={url}
                title={post.title}
                summary={post.description}
              />
            </div>

            {/* Body */}
            <div className="blog-body mt-8">
              <div
                // The renderer escapes all user-facing text and only emits a fixed
                // set of safe HTML elements (h2/h3/p/ul/ol/li/strong/em/a/blockquote).
                dangerouslySetInnerHTML={{ __html: firstHalf }}
              />
              <div className="my-10">
                <NewsletterForm source="blog-post-midarticle" variant="card" />
              </div>
              <div dangerouslySetInnerHTML={{ __html: secondHalf }} />
            </div>

            {/* Bottom-of-post newsletter signup (server-validated) */}
            <div className="mt-12">
              <NewsletterForm source="blog-post" showTooltip />
            </div>

            {/* Bottom CTA */}
            <div className="mt-12 rounded-xl border border-brand-cyan/40 bg-gradient-to-br from-brand-cyan/10 to-brand-card/40 p-8">
              <p className="font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
                Ready to put this into practice?
              </p>
              <h2 className="mt-3 font-heading text-3xl italic text-brand-white">
                Try Social Perks free for 14 days.
              </h2>
              <p className="mt-3 text-brand-dim">
                Reward customers automatically for posts, reviews, and referrals — without
                a spreadsheet, without manual checking, fully FTC compliant.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition-transform hover:-translate-y-0.5"
              >
                Start your free trial
                <span aria-hidden>&rarr;</span>
              </Link>
            </div>

            {/* Related posts */}
            {related.length > 0 && (
              <section className="mt-16 border-t border-brand-border/40 pt-10">
                <h2 className="font-heading text-2xl italic text-brand-white">
                  Related articles
                </h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map(r => (
                    <Link
                      key={r.slug}
                      href={`/blog/${r.slug}`}
                      className="group rounded-xl border border-brand-border/60 bg-brand-card/30 p-5 transition-colors hover:border-brand-cyan/40"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
                        {r.category}
                      </span>
                      <h3 className="mt-3 font-heading text-lg italic leading-snug text-brand-white group-hover:text-brand-cyan">
                        {r.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm text-brand-dim">
                        {r.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </article>

          {/* Sidebar TOC (desktop) */}
          {rendered.headings.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <p className="font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
                  Contents
                </p>
                <nav className="mt-4 border-l border-brand-border/40 pl-4">
                  <ul className="space-y-2 text-sm">
                    {rendered.headings.map(h => (
                      <li
                        key={h.id}
                        className={h.level === 3 ? "pl-3 text-xs" : ""}
                      >
                        <a
                          href={`#${h.id}`}
                          className="text-brand-muted transition-colors hover:text-brand-cyan"
                        >
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Split rendered HTML into two roughly-equal halves on a top-level element
 * boundary so we can render the email capture component between them.
 */
function splitHtmlForCapture(html: string): { firstHalf: string; secondHalf: string } {
  const segments = html.split("\n").filter(s => s.trim().length > 0);
  if (segments.length < 6) return { firstHalf: html, secondHalf: "" };
  const midpoint = Math.floor(segments.length / 2);
  return {
    firstHalf: segments.slice(0, midpoint).join("\n"),
    secondHalf: segments.slice(midpoint).join("\n"),
  };
}
