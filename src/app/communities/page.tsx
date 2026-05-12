import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  COMMUNITIES,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  type CommunityCategory,
} from "@/lib/communities/data";

const BASE_URL = "https://socialperks.app";

export const metadata: Metadata = {
  title: "Built for your community | Social Perks",
  description:
    "Niche-specific landing pages for 15 high-intent communities — from yoga teachers to food trucks to wedding photographers. Built for your workflow, your customers, your craft.",
  alternates: { canonical: `${BASE_URL}/communities` },
  openGraph: {
    title: "Built for your community | Social Perks",
    description:
      "Social Perks campaigns and perks tailored to 15 specific niches. Find yours.",
    url: `${BASE_URL}/communities`,
    type: "website",
    siteName: "Social Perks",
  },
};

const CATEGORY_ORDER: CommunityCategory[] = ["creator", "food", "service"];

export default function CommunitiesIndexPage() {
  const byCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    description: CATEGORY_DESCRIPTIONS[cat],
    communities: COMMUNITIES.filter((c) => c.category === cat),
  }));

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg text-brand-text">
      <Nav />

      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-bg pt-32 pb-20 sm:pt-40 sm:pb-28 lg:pt-48 lg:pb-32">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.07),rgba(167,139,250,0.05),rgba(244,114,182,0.04),rgba(34,211,238,0.02))]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand-cyan/5 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-brand-purple/5 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-brand-cyan">
            15 communities, 15 playbooks
          </div>

          <h1 className="font-heading text-[clamp(2.25rem,6vw,4.5rem)] italic leading-[1.05] tracking-tight text-brand-white">
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              Built for your community
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg md:text-xl">
            Generic marketing tools treat every business the same. Social Perks is built around how
            your specific craft actually gets discovered — your customers, your workflow, your
            content language.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base text-brand-muted sm:text-lg">
            Find your community below to see the campaigns, perks, and integrations built for you.
          </p>
        </div>
      </section>

      {/* CATEGORIES */}
      {byCategory.map((group) => (
        <section
          key={group.category}
          className="border-t border-brand-border/30 bg-brand-bg py-20 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl">
                {group.label}
              </h2>
              <p className="mt-5 text-base leading-relaxed text-brand-dim sm:text-lg">
                {group.description}
              </p>
            </div>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.communities.map((community) => (
                <Link
                  key={community.slug}
                  href={`/communities/${community.slug}`}
                  className="group flex flex-col rounded-2xl border border-brand-border/60 bg-white/[0.02] p-7 transition-all hover:-translate-y-1 hover:border-brand-cyan/40 hover:bg-white/[0.04]"
                >
                  <div className="mb-3 text-xs uppercase tracking-wider text-brand-muted">
                    For {community.niche}
                  </div>
                  <h3 className="font-heading text-xl italic text-brand-white capitalize">
                    {community.niche}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-brand-dim">
                    {community.hook}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 font-body text-sm font-medium text-brand-cyan transition-transform group-hover:translate-x-1">
                    Built for {community.niche}
                    <span aria-hidden="true">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* BOTTOM CTA */}
      <section className="border-t border-brand-border/30 bg-gradient-to-b from-brand-bg via-brand-cyan/[0.03] to-brand-bg py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-4xl italic text-brand-white sm:text-5xl md:text-6xl">
            Don&apos;t see your community?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-brand-dim sm:text-lg">
            The same platform powers any business with customers worth talking about. Start your
            free trial and build your own playbook in five minutes.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <a
              href="/auth"
              className="w-full rounded-xl bg-brand-cyan px-10 py-4 font-body text-base font-semibold text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 sm:w-auto"
            >
              Start your 14-day free trial
            </a>
            <Link
              href="/industries"
              className="w-full rounded-xl border border-brand-border px-10 py-4 font-body text-base font-semibold text-brand-text transition-all hover:border-brand-cyan/40 hover:bg-white/5 sm:w-auto"
            >
              Browse industries
            </Link>
          </div>
          <p className="mt-4 text-xs text-brand-muted">
            Free for 14 days, then $49/mo. Cancel anytime.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
