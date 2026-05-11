import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { HOOKS } from "@/lib/hooks/data";
import { HookSqueezePage } from "./squeeze-client";

export const dynamicParams = false;

export function generateStaticParams() {
  return HOOKS.map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const hook = HOOKS.find((h) => h.slug === slug);
  if (!hook) return { title: "Not found" };

  const title = `${hook.hook} — Social Perks`;
  const description = hook.promise;

  return {
    title,
    description,
    openGraph: {
      title: hook.hook,
      description,
      type: "article",
      url: `https://socialperks.com/h/${hook.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: hook.hook,
      description,
    },
    robots: { index: true, follow: true },
    alternates: { canonical: `https://socialperks.com/h/${hook.slug}` },
  };
}

export default async function HookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hook = HOOKS.find((h) => h.slug === slug);
  if (!hook) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: hook.hook,
    description: hook.promise,
    url: `https://socialperks.com/h/${hook.slug}`,
    isPartOf: {
      "@type": "WebSite",
      name: "Social Perks",
      url: "https://socialperks.com",
    },
    about: {
      "@type": "Thing",
      name: "Social media marketing for small business",
    },
  };

  return (
    <>
      <Script
        id={`jsonld-${hook.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main
        className="min-h-screen text-white"
        style={{
          background:
            "radial-gradient(ellipse at top, #0F1729 0%, #0C0F1A 50%, #060810 100%)",
        }}
      >
        <div className="mx-auto w-full max-w-[480px] px-5 pt-10 pb-24 sm:pt-14">
          {/* Brand pin (minimal — no full nav) */}
          <div className="mb-10 flex items-center justify-center">
            <Link
              href="/"
              className="text-xs uppercase tracking-[0.18em] text-white/50 hover:text-white/80"
            >
              Social Perks
            </Link>
          </div>

          <HookSqueezePage hook={hook} />
        </div>
      </main>
    </>
  );
}
