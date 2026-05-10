import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { LISTICLES, getListicleBySlug } from "@/lib/listicles/data";

interface PageParams {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return LISTICLES.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const list = getListicleBySlug(slug);
  if (!list) return { title: "Not Found · Social Perks" };

  const url = `https://socialperks.onrender.com/best/${list.slug}`;
  return {
    title: `${list.title} · Social Perks`,
    description: list.description,
    alternates: { canonical: url },
    openGraph: {
      title: list.title,
      description: list.description,
      url,
      type: "article",
      siteName: "Social Perks",
      publishedTime: list.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: list.title,
      description: list.description,
    },
  };
}

export default async function ListiclePage({ params }: PageParams) {
  const { slug } = await params;
  const list = getListicleBySlug(slug);
  if (!list) notFound();

  const url = `https://socialperks.onrender.com/best/${list.slug}`;

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: list.title,
    description: list.description,
    itemListElement: list.items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.title,
      description: item.whyItWorks,
    })),
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
        name: "Best of",
        item: "https://socialperks.onrender.com/best",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: list.title,
        item: url,
      },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Nav />
      <main id="main-content" className="pt-28 pb-20 sm:pt-36">
        <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <header className="border-b border-brand-border/40 pb-8">
            <span className="inline-flex rounded-full border border-brand-cyan/30 bg-brand-cyan/5 px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
              Best of · {list.topic}
            </span>
            <h1 className="mt-4 font-heading text-3xl italic leading-tight text-brand-white sm:text-4xl lg:text-5xl">
              {list.h1}
            </h1>
            <p className="mt-4 text-lg text-brand-dim">{list.description}</p>
          </header>

          <section className="mt-8 space-y-4 text-brand-dim leading-relaxed">
            {list.intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>

          <section className="mt-12 space-y-10">
            {list.items.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-brand-border/50 bg-brand-card/20 p-6"
              >
                <h2 className="font-heading text-2xl italic leading-tight text-brand-white">
                  <span className="text-brand-cyan">{item.emoji}</span>{" "}
                  {item.title}
                </h2>
                <div className="mt-4 space-y-3 text-brand-dim leading-relaxed">
                  {item.body.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
                <div className="mt-5 rounded-lg border border-brand-cyan/20 bg-brand-cyan/5 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
                    Why it works
                  </p>
                  <p className="mt-2 text-sm text-brand-dim">
                    {item.whyItWorks}
                  </p>
                </div>
                <div className="mt-3 rounded-lg border border-brand-green/20 bg-brand-green/5 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-brand-green">
                    Specific tip
                  </p>
                  <p className="mt-2 text-sm text-brand-dim">
                    {item.specificTip}
                  </p>
                </div>
              </div>
            ))}
          </section>

          <section className="mt-12 rounded-xl border border-brand-amber/30 bg-brand-amber/5 p-6">
            <h2 className="font-heading text-2xl italic text-brand-white">
              {list.bonusTip.title}
            </h2>
            <p className="mt-3 text-brand-dim leading-relaxed">
              {list.bonusTip.body}
            </p>
          </section>

          <section className="mt-12">
            <h2 className="font-heading text-3xl italic text-brand-white">
              Common mistakes
            </h2>
            <div className="mt-5 space-y-4">
              {list.commonMistakes.map((m, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-brand-border/40 bg-brand-card/20 p-5"
                >
                  <h3 className="font-heading text-lg italic text-brand-white">
                    {i + 1}. {m.title}
                  </h3>
                  <p className="mt-2 text-brand-dim leading-relaxed">
                    {m.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-12 rounded-xl border border-brand-cyan/40 bg-gradient-to-br from-brand-cyan/10 to-brand-card/40 p-8">
            <p className="font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
              Ready to put this into practice?
            </p>
            <h2 className="mt-3 font-heading text-3xl italic text-brand-white">
              Start your 14-day free trial
            </h2>
            <p className="mt-3 text-brand-dim">{list.cta}</p>
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
