import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { createSeedData } from "@/lib/seed";
import { campaignManager } from "@/lib/campaign-state-machine";
import { buildBusinessSlug, idFromSlug } from "@/lib/slugs";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

function findBusiness(slug: string) {
  // Look up by trailing id-chunk first (fast, unambiguous), then fall
  // back to slug-equality search across seed data.
  const idTail = idFromSlug(slug);
  const seed = createSeedData();
  if (idTail) {
    const direct = seed.businesses.find((b) => b.id.endsWith(idTail));
    if (direct) return direct;
  }
  return seed.businesses.find((b) => buildBusinessSlug(b) === slug) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const biz = findBusiness(slug);
  if (!biz) return {};
  const title = `${biz.name} — Social Perks campaigns`;
  const description = `${biz.name} is using Social Perks to turn customers into marketing. See active campaigns, perks, and how to participate.`;
  const url = `${SITE_URL}/b/${slug}`;
  const ogImage = `${SITE_URL}/api/og/business?name=${encodeURIComponent(biz.name)}&type=${encodeURIComponent(biz.type ?? "")}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "website",
      url,
      siteName: "Social Perks",
      images: [{ url: ogImage, width: 1200, height: 630, alt: biz.name }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function BusinessProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const biz = findBusiness(slug);
  if (!biz) notFound();

  const allLifecycles = campaignManager.listByBusiness(biz.id);
  const activeCampaigns = allLifecycles.filter((c) => c.state === "active");

  // LocalBusiness JSON-LD — eligible for Google Knowledge Panel,
  // local-pack inclusion, and "claim this listing" prompts.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: biz.name,
    description: `${biz.name} runs customer-rewards campaigns on Social Perks.`,
    address: biz.location
      ? { "@type": "PostalAddress", addressLocality: biz.location }
      : undefined,
    image: biz.avatar ? undefined : undefined,
    url: `${SITE_URL}/b/${slug}`,
    sameAs: [],
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <Nav />

      <main id="main-content" className="mx-auto max-w-3xl px-4 pt-32 pb-20 sm:px-6 lg:px-8 sm:pt-40 sm:pb-28">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
          Public profile
        </p>
        <div className="flex items-start gap-4">
          <span className="text-5xl" aria-hidden="true">{biz.avatar ?? "🏪"}</span>
          <div>
            <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">
              {biz.name}
            </h1>
            <p className="mt-2 text-brand-dim">
              {biz.type}
              {biz.location ? ` · ${biz.location}` : ""}
            </p>
          </div>
        </div>

        {/* Hero "claim band" — the loudest thing on the page for friends
            arriving here from a customer's IG/TikTok post. Falls back to
            the dim "no active campaigns" card if nothing is live. */}
        {activeCampaigns.length > 0 ? (
          <section
            aria-labelledby="claim-band"
            className="mt-10 overflow-hidden rounded-3xl border border-brand-cyan/40 bg-gradient-to-br from-brand-cyan/15 via-brand-cyan/5 to-transparent p-6 sm:p-8"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
              For you
            </p>
            <h2
              id="claim-band"
              className="mt-2 font-heading text-3xl italic text-brand-white sm:text-4xl"
            >
              🎁 {biz.name} is giving free perks for posting about them
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-brand-text/90 sm:text-base">
              Pick something to post, share it on Instagram or TikTok, and walk in to
              claim. Verified in seconds at the counter.
            </p>
            <Link
              href={`/c/${activeCampaigns[0].id}?ref=friend`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-cyan px-6 py-3 font-body text-sm font-semibold text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/20 sm:text-base"
            >
              Claim your perk →
            </Link>

            {/* "How it takes 30 seconds" 3-step strip */}
            <ol className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                {
                  n: "1",
                  t: "Pick what to post",
                  d: "We suggest options that fit you.",
                },
                {
                  n: "2",
                  t: "Post on IG / TikTok",
                  d: "Takes about 30 seconds.",
                },
                {
                  n: "3",
                  t: "Show the verified screen",
                  d: "Hand the staff your phone — done.",
                },
              ].map((step) => (
                <li
                  key={step.n}
                  className="rounded-2xl border border-brand-border/40 bg-brand-surface/40 p-4"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
                    Step {step.n}
                  </p>
                  <p className="mt-1 font-semibold text-brand-white">{step.t}</p>
                  <p className="mt-1 text-xs text-brand-dim">{step.d}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Active campaigns */}
        <section aria-labelledby="campaigns" className="mt-12">
          <h2 id="campaigns" className="font-heading text-2xl italic text-brand-white">
            Active campaigns
          </h2>
          {activeCampaigns.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-6 text-sm text-brand-dim">
              No active campaigns right now. Want to be notified when they launch one?{" "}
              <Link href="/#waitlist" className="text-brand-cyan underline underline-offset-2 decoration-brand-cyan/40 hover:decoration-brand-cyan transition-colors">
                Join the early-access list →
              </Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {activeCampaigns.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/c/${c.id}`}
                    className="block rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-5 transition-all hover:-translate-y-0.5 hover:border-brand-cyan/40"
                  >
                    <p className="font-semibold text-brand-white">Campaign {c.id.slice(-6)}</p>
                    <p className="mt-1 text-sm text-brand-dim">
                      {c.completions.current} completions
                      {c.completions.max ? ` / ${c.completions.max} cap` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Trust strip */}
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-5 text-xs text-brand-dim">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-green" aria-hidden="true" />
            FTC-compliant disclosures auto-injected
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" aria-hidden="true" />
            Verified posts only
          </span>
        </div>

        {/* Referral boost — copy-only for now. The ?ref=friend on the
            CTA link sets up attribution wiring for a follow-up phase. */}
        <div className="mt-6 rounded-2xl border border-brand-border/40 bg-brand-surface/20 p-5 text-sm text-brand-dim">
          👀 Came here from a friend&apos;s post? You both win — they get extra credit
          when you claim.
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/5 p-6 text-center sm:p-8">
          <h3 className="font-heading text-2xl italic text-brand-white">
            Run campaigns like {biz.name}
          </h3>
          <p className="mt-3 text-sm text-brand-dim">
            Set a perk, customers post, you get word-of-mouth. Free to start.
          </p>
          <Link
            href="/dashboard#signup"
            className="mt-6 inline-block rounded-xl bg-brand-cyan px-6 py-3 font-body text-sm font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:-translate-y-0.5"
          >
            Start your first campaign →
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
