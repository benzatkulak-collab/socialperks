import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

export const metadata: Metadata = {
  title: "Free Tools for Small Business Owners · Social Perks",
  description:
    "Free, no-signup marketing tools for small businesses. Generate Google review request emails, Instagram captions, and SMS templates in seconds.",
  openGraph: {
    title: "Free tools for small business owners",
    description:
      "Generate review request emails, Instagram captions, and SMS templates. No signup required.",
    url: "https://socialperks.onrender.com/tools",
    siteName: "Social Perks",
    type: "website",
  },
};

interface Tool {
  slug: string;
  title: string;
  description: string;
  badge: string;
  badgeColor: "cyan" | "green" | "amber";
  example: string;
}

const TOOLS: Tool[] = [
  {
    slug: "review-email-generator",
    title: "Google Review Email Generator",
    description:
      "Polite, effective emails that actually get customers to leave reviews. Pick a tone, add a few details, copy and send.",
    badge: "Email",
    badgeColor: "cyan",
    example: "3 templates · friendly, professional, post-purchase",
  },
  {
    slug: "instagram-caption-generator",
    title: "Instagram Caption Generator",
    description:
      "Three caption options with relevant hashtags, tuned for your business type and vibe. Stop staring at the blinking cursor.",
    badge: "Social",
    badgeColor: "green",
    example: "12+ business types · 3 tones · auto hashtags",
  },
  {
    slug: "sms-review-templates",
    title: "Customer Review SMS Templates",
    description:
      "25+ pre-written SMS templates for asking for reviews after a purchase, service, event, or meal. All under 160 characters.",
    badge: "SMS",
    badgeColor: "amber",
    example: "25+ templates · 4 categories · char-counted",
  },
];

const BADGE_CLASSES: Record<Tool["badgeColor"], string> = {
  cyan: "border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan",
  green: "border-brand-green/30 bg-brand-green/10 text-brand-green",
  amber: "border-brand-amber/30 bg-brand-amber/10 text-brand-amber",
};

export default function ToolsIndexPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <Nav />
      <main id="main-content">
        {/* Hero */}
        <section className="relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-20">
          <div
            className="pointer-events-none absolute inset-0 bg-[length:300%_300%] bg-[linear-gradient(135deg,rgba(34,211,238,0.06),rgba(52,211,153,0.04),rgba(34,211,238,0.02))]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-brand-cyan/5 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-cyan opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-cyan" />
              </span>
              Free · No signup
            </div>

            <h1 className="mt-6 font-heading text-[clamp(2.25rem,5vw,4rem)] italic leading-[1.05] tracking-tight text-brand-white">
              Free tools for{" "}
              <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
                small business owners.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
              The marketing tools we wish we had when we ran a coffee shop.
              No signup, no email gate, no upsell. Just useful stuff —
              free forever.
            </p>
          </div>
        </section>

        {/* Tools grid */}
        <section className="pb-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {TOOLS.map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="group relative flex flex-col rounded-2xl border border-brand-border bg-brand-surface/50 p-6 transition-all duration-normal ease-smooth hover:-translate-y-1 hover:border-brand-cyan/40 hover:bg-brand-surface hover:shadow-lg hover:shadow-brand-cyan/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] ${BADGE_CLASSES[tool.badgeColor]}`}
                    >
                      {tool.badge}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                      Free
                    </span>
                  </div>

                  <h2 className="mt-5 font-heading text-2xl italic leading-tight text-brand-white">
                    {tool.title}
                  </h2>

                  <p className="mt-3 flex-1 text-sm leading-relaxed text-brand-dim">
                    {tool.description}
                  </p>

                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.1em] text-brand-muted">
                    {tool.example}
                  </p>

                  <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-brand-cyan transition-transform duration-fast group-hover:translate-x-0.5">
                    Use free
                    <span aria-hidden="true">→</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="mt-20 rounded-2xl border border-brand-border bg-brand-surface/30 p-8 text-center sm:p-12">
              <h2 className="font-heading text-3xl italic leading-tight text-brand-white sm:text-4xl">
                Want this on autopilot?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-dim">
                These tools are great for one-offs. But if you want review
                requests, captions, and customer perks running automatically —
                that&apos;s what Social Perks does.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/ai"
                  className="w-full rounded-xl bg-brand-cyan px-7 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20 sm:w-auto"
                >
                  See how Social Perks works →
                </Link>
                <Link
                  href="/pricing"
                  className="w-full rounded-xl border border-brand-border bg-brand-surface/50 px-7 py-3 text-sm font-medium text-brand-text transition-all hover:border-brand-subtle hover:bg-brand-surface sm:w-auto"
                >
                  See pricing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
