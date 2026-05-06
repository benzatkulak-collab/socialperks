import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { createSeedData } from "@/lib/seed";
import { buildInfluencerSlug, idFromSlug } from "@/lib/slugs";
import { safeJsonForScript } from "@/lib/security/json-ld";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

function findInfluencer(slug: string) {
  const idTail = idFromSlug(slug);
  const seed = createSeedData();
  if (idTail) {
    const direct = seed.influencers.find((i) => i.id.endsWith(idTail));
    if (direct) return direct;
  }
  return seed.influencers.find((i) => buildInfluencerSlug(i) === slug) ?? null;
}

/** Estimated total earnings — placeholder until real submission ledger lands. */
function estimateEarnings(i: { followerCount: number }): number {
  // Rough heuristic for the public profile placeholder. Real numbers
  // will replace this once submission → perk → revenue ledger persists.
  if (i.followerCount >= 100_000) return 4_800;
  if (i.followerCount >= 25_000) return 1_400;
  if (i.followerCount >= 5_000) return 480;
  return 120;
}

function tierFromFollowers(followers: number): "Mega" | "Macro" | "Mid" | "Micro" {
  if (followers >= 1_000_000) return "Mega";
  if (followers >= 100_000) return "Macro";
  if (followers >= 10_000) return "Mid";
  return "Micro";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const i = findInfluencer(slug);
  if (!i) return {};
  const title = `${i.displayName} on Social Perks`;
  const tier = tierFromFollowers(i.followerCount);
  const earnings = estimateEarnings(i);
  const description = `${i.displayName} earns from local businesses by posting verified content. ${tier} creator with ${i.followerCount.toLocaleString()} followers.`;
  const url = `${SITE_URL}/i/${slug}`;
  const ogImage = `${SITE_URL}/api/og/influencer?name=${encodeURIComponent(i.displayName)}&followers=${encodeURIComponent(i.followerCount.toLocaleString())}&earnings=${encodeURIComponent(String(earnings))}&tier=${encodeURIComponent(tier)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "profile",
      url,
      siteName: "Social Perks",
      images: [{ url: ogImage, width: 1200, height: 630, alt: i.displayName }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function InfluencerProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const i = findInfluencer(slug);
  if (!i) notFound();

  const tier = tierFromFollowers(i.followerCount);
  const earnings = estimateEarnings(i);

  // Person + Service JSON-LD: helps Google understand this is a creator
  // page with a specific service offer ("paid posts for local businesses").
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: i.displayName,
    description: `${tier} creator on Social Perks. Earns from local businesses through verified posts.`,
    url: `${SITE_URL}/i/${slug}`,
    knowsAbout: i.niches,
    image: undefined,
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <Nav />

      <main id="main-content" className="mx-auto max-w-3xl px-4 pt-32 pb-20 sm:px-6 lg:px-8 sm:pt-40 sm:pb-28">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: safeJsonForScript(jsonLd) }}
        />

        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
          Creator profile
        </p>
        <div className="flex items-start gap-4">
          <span className="text-5xl" aria-hidden="true">🎤</span>
          <div>
            <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">
              {i.displayName}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-brand-dim">
              <span className="font-mono text-xs uppercase tracking-wider text-brand-cyan">
                {tier}
              </span>
              <span>·</span>
              <span>{i.followerCount.toLocaleString()} followers</span>
              {i.location ? (
                <>
                  <span>·</span>
                  <span>{i.location}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>

        {/* Status / earnings band — the "shareable win" surface for
            influencers. We're conservative about the number until the
            real submission → perk → revenue ledger lands. */}
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-brand-cyan/30 bg-brand-cyan/5 p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-brand-cyan">
              Earnings
            </p>
            <p className="mt-2 font-heading text-2xl italic text-brand-white">
              ~${earnings.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-brand-muted">last 90 days · est.</p>
          </div>
          <div className="rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-brand-muted">
              Niches
            </p>
            <p className="mt-2 text-sm text-brand-text">
              {i.niches.length > 0 ? i.niches.slice(0, 3).join(", ") : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-brand-muted">
              Platforms
            </p>
            <p className="mt-2 text-sm text-brand-text">
              {i.platforms.length > 0 ? i.platforms.map((p) => p.platformId).join(" · ") : "—"}
            </p>
          </div>
        </div>

        {/* CTA for businesses */}
        <div className="mt-12 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/5 p-6 text-center sm:p-8">
          <h3 className="font-heading text-2xl italic text-brand-white">
            Want creators like {i.displayName} promoting your shop?
          </h3>
          <p className="mt-3 text-sm text-brand-dim">
            Launch a campaign. Local creators in your niche see it instantly.
          </p>
          <Link
            href="/dashboard#signup?plan=professional&period=annual"
            className="mt-6 inline-block rounded-xl bg-brand-cyan px-6 py-3 font-body text-sm font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:-translate-y-0.5"
          >
            Start a campaign →
          </Link>
        </div>

        {/* Creator CTA */}
        <p className="mt-8 text-center text-xs text-brand-muted">
          Are you a creator?{" "}
          <Link href="/dashboard#signup" className="text-brand-cyan hover:underline">
            Set up your profile and start earning →
          </Link>
        </p>
      </main>

      <Footer />
    </div>
  );
}
