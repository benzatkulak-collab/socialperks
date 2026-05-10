import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { TEMPLATES, CATEGORY_META, type TemplateCategory } from "@/lib/templates/data";

export const metadata: Metadata = {
  title: "Free Templates for Small Business Marketing · Social Perks",
  description:
    "25 free, downloadable marketing templates — email sequences, social calendars, strategy worksheets, contracts, and reports. Built for small business owners.",
  openGraph: {
    title: "Free templates for small business marketing",
    description:
      "25 downloadable templates for email, social, strategy, operations, and reporting. Built for small businesses.",
    url: "https://socialperks.onrender.com/templates",
    siteName: "Social Perks",
    type: "website",
  },
};

const BADGE_CLASSES: Record<
  ReturnType<typeof getCategoryColor>,
  string
> = {
  cyan: "border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan",
  green: "border-brand-green/30 bg-brand-green/10 text-brand-green",
  amber: "border-brand-amber/30 bg-brand-amber/10 text-brand-amber",
  pink: "border-pink-500/30 bg-pink-500/10 text-pink-400",
  purple: "border-purple-500/30 bg-purple-500/10 text-purple-400",
};

function getCategoryColor(category: TemplateCategory) {
  return CATEGORY_META[category].color;
}

const CATEGORY_ORDER: TemplateCategory[] = [
  "email",
  "social",
  "strategy",
  "operational",
  "reporting",
];

export default function TemplatesIndexPage() {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_META[cat].label,
    templates: TEMPLATES.filter((t) => t.category === cat),
  }));

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <Nav />
      <main id="main-content">
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
              25 templates · Free
            </div>

            <h1 className="mt-6 font-heading text-[clamp(2.25rem,5vw,4rem)] italic leading-[1.05] tracking-tight text-brand-white">
              Free templates for{" "}
              <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
                small business marketing.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
              Email sequences, social calendars, strategy worksheets, contracts,
              and reports. Battle-tested by 12,000+ small businesses. Drop your
              email to download — no upsell, no spam.
            </p>
          </div>
        </section>

        {grouped.map((group) => (
          <section key={group.category} className="pb-12">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mb-6 flex items-center gap-3">
                <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
                  {group.label}
                </h2>
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                  {group.templates.length} templates
                </span>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {group.templates.map((tpl) => (
                  <Link
                    key={tpl.slug}
                    href={`/templates/${tpl.slug}`}
                    className="group relative flex flex-col rounded-2xl border border-brand-border bg-brand-surface/50 p-6 transition-all duration-normal ease-smooth hover:-translate-y-1 hover:border-brand-cyan/40 hover:bg-brand-surface hover:shadow-lg hover:shadow-brand-cyan/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] ${BADGE_CLASSES[getCategoryColor(tpl.category)]}`}
                      >
                        {tpl.categoryLabel}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                        Free
                      </span>
                    </div>

                    <h3 className="mt-5 font-heading text-xl italic leading-tight text-brand-white">
                      {tpl.title}
                    </h3>

                    <p className="mt-3 text-sm leading-relaxed text-brand-dim">
                      {tpl.description}
                    </p>

                    <ul className="mt-4 space-y-1.5">
                      {tpl.whatsInside.slice(0, 3).map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-brand-muted"
                        >
                          <span className="mt-1 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-brand-cyan/60" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-brand-cyan transition-transform duration-fast group-hover:translate-x-0.5">
                      Download free
                      <span aria-hidden="true">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ))}

        <section className="pb-24 pt-12">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-brand-border bg-brand-surface/30 p-8 text-center sm:p-12">
              <h2 className="font-heading text-3xl italic leading-tight text-brand-white sm:text-4xl">
                Need something custom?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-dim">
                These templates are starting points. If you want them
                personalized, automated, and run for you — Social Perks does
                that.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/ai"
                  className="w-full rounded-xl bg-brand-cyan px-7 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20 sm:w-auto"
                >
                  See how Social Perks works →
                </Link>
                <Link
                  href="/tools"
                  className="w-full rounded-xl border border-brand-border bg-brand-surface/50 px-7 py-3 text-sm font-medium text-brand-text transition-all hover:border-brand-subtle hover:bg-brand-surface sm:w-auto"
                >
                  Browse free tools
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
