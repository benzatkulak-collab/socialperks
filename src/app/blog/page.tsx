import type { Metadata } from "next";
import Link from "next/link";
import { allCategories, getAllPostMetas } from "@/lib/blog/posts";
import { BlogIndexClient } from "./blog-index-client";

export const metadata: Metadata = {
  title: "Blog — Small Business Marketing Tips & Tactics | Social Perks",
  description:
    "Practical, no-fluff marketing guides for small businesses — restaurants, coffee shops, salons, yoga studios, boutiques, and more. Field-tested tactics that work.",
  alternates: {
    canonical: "https://socialperks.app/blog",
  },
  openGraph: {
    title: "Social Perks Blog — Small Business Marketing Tips",
    description:
      "Practical marketing playbooks for restaurants, coffee shops, salons, fitness studios, and boutiques.",
    type: "website",
    url: "https://socialperks.app/blog",
  },
  twitter: {
    card: "summary_large_image",
    title: "Social Perks Blog",
    description: "Small business marketing playbooks that actually work.",
  },
};

export default function BlogIndexPage() {
  const posts = getAllPostMetas();

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Header */}
      <header className="border-b border-brand-border/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Back to home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-cyan/10">
              <span className="font-heading text-lg text-brand-cyan">S</span>
            </div>
            <span className="font-heading text-xl italic text-brand-white">
              Social Perks
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-brand-muted transition-colors hover:text-brand-text"
          >
            &larr; Back to Home
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-brand-border/30 bg-gradient-to-b from-brand-card/30 to-transparent">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <span className="inline-flex rounded-full border border-brand-cyan/30 bg-brand-cyan/5 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
            The Social Perks Blog
          </span>
          <h1 className="mt-4 font-heading text-4xl italic leading-tight text-brand-white sm:text-5xl lg:text-6xl">
            Small business marketing,
            <br />
            <span className="text-brand-cyan">written like you&rsquo;re busy.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-brand-dim">
            Field-tested playbooks for restaurants, coffee shops, salons, yoga studios, and
            boutiques. No fluff, no buzzwords, no "engagement hack of the week" — just what
            actually works.
          </p>
        </div>
      </section>

      {/* Index */}
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <BlogIndexClient posts={posts} categories={allCategories} />
      </main>

      {/* Footer CTA */}
      <section className="border-t border-brand-border/30 bg-brand-card/20">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl">
            Turn customers into your marketing team.
          </h2>
          <p className="mt-4 text-lg text-brand-dim">
            Reward customers automatically for posts, reviews, and referrals — without a
            spreadsheet.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition-transform hover:-translate-y-0.5"
          >
            Try Social Perks free for 14 days
            <span aria-hidden>&rarr;</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
