import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { createSeedData } from "@/lib/seed";
import { campaignManager } from "@/lib/campaign-state-machine";
import { buildBusinessSlug, idFromSlug } from "@/lib/slugs";
import { getUserByBusinessIdSuffix, ensureUsersSeeded } from "@/lib/auth/user-store";
import { safeJsonForScript } from "@/lib/security/json-ld";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

interface BizProfile {
  id: string;
  name: string;
  avatar: string;
  type: string;
  location: string;
}

function normalizeBiz(b: {
  id: string;
  name: string;
  avatar?: string;
  type?: string;
  location?: string;
}): BizProfile {
  return {
    id: b.id,
    name: b.name,
    avatar: b.avatar ?? "🏪",
    type: b.type ?? "",
    location: b.location ?? "",
  };
}

async function findBusiness(slug: string): Promise<BizProfile | null> {
  // Look up by trailing id-chunk first (fast, unambiguous), then fall
  // back to slug-equality search across seed data.
  const idTail = idFromSlug(slug);
  const seed = createSeedData();
  if (idTail) {
    const direct = seed.businesses.find((b) => b.id.endsWith(idTail));
    if (direct) return normalizeBiz(direct);
  }
  const bySlug = seed.businesses.find((b) => buildBusinessSlug(b) === slug);
  if (bySlug) return normalizeBiz(bySlug);

  // Real signed-up businesses live in auth_users, not seed. The slug encodes
  // the last 6 chars of their businessId — resolve the display name from the
  // user store so a real business isn't rendered as a blank profile.
  if (idTail) {
    try {
      await ensureUsersSeeded();
      const user = getUserByBusinessIdSuffix(idTail);
      if (user?.businessId) {
        return { id: user.businessId, name: user.name, avatar: "🏪", type: "", location: "" };
      }
    } catch {
      // fall through to null
    }
  }
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const biz = await findBusiness(slug);
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
  const biz = await findBusiness(slug);
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
          dangerouslySetInnerHTML={{ __html: safeJsonForScript(jsonLd) }}
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

        {/* Active campaigns */}
        <section aria-labelledby="campaigns" className="mt-12">
          <h2 id="campaigns" className="font-heading text-2xl italic text-brand-white">
            Active campaigns
          </h2>
          {activeCampaigns.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-6 text-sm text-brand-dim">
              No active campaigns right now. Want to be notified when they launch one?{" "}
              <Link href="/#waitlist" className="text-brand-cyan hover:underline">
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
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-5 text-xs text-brand-muted">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-green" aria-hidden="true" />
            FTC-compliant disclosures auto-injected
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" aria-hidden="true" />
            Verified posts only
          </span>
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
