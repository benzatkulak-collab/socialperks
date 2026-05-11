import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

export const metadata: Metadata = {
  title: "How to Install Social Perks Widgets — Setup Guide · Social Perks",
  description:
    "Step-by-step install guides for Social Perks widgets on vanilla HTML, WordPress, Shopify, Squarespace, Wix, and Webflow. Copy-paste, no code.",
  openGraph: {
    title: "Install Social Perks Widgets",
    description:
      "Copy-paste install guides for every major site builder — HTML, WordPress, Shopify, Squarespace, Wix, Webflow.",
    url: "https://socialperks.onrender.com/embed/install",
    siteName: "Social Perks",
    type: "website",
  },
};

const DEMO_BID = "YOUR_BUSINESS_ID";

interface InstallStep {
  platform: string;
  blurb: string;
  steps: string[];
  snippetLabel: string;
  snippet: string;
  notes?: string;
}

const GUIDES: InstallStep[] = [
  {
    platform: "Vanilla HTML",
    blurb: "Any static HTML site — paste this anywhere in your <body>.",
    steps: [
      "Open the HTML file where you want the widget to appear.",
      "Paste the snippet below where you want the widget rendered.",
      "Replace YOUR_BUSINESS_ID with your business ID from the dashboard.",
      "Save and re-deploy your site.",
    ],
    snippetLabel: "Paste before </body>",
    snippet: `<div id="sp-reviews-${DEMO_BID}"></div>
<script async src="https://socialperks.onrender.com/api/v1/embed/reviews?businessId=${DEMO_BID}&theme=dark&limit=5&format=js"></script>`,
  },
  {
    platform: "WordPress",
    blurb:
      "Works with both block editor (Gutenberg) and classic editor. No plugin required.",
    steps: [
      "Edit the page or post where you want the widget.",
      "Add a 'Custom HTML' block (Gutenberg) or switch to the 'Text' tab (classic).",
      "Paste the snippet below.",
      "Replace YOUR_BUSINESS_ID with your business ID and publish.",
    ],
    snippetLabel: "Custom HTML block",
    snippet: `<div id="sp-reviews-${DEMO_BID}"></div>
<script async src="https://socialperks.onrender.com/api/v1/embed/reviews?businessId=${DEMO_BID}&theme=light&limit=5&format=js"></script>`,
    notes:
      "If you're on WordPress.com Free/Personal plan, custom scripts may be blocked. Use the iframe version instead (see Squarespace).",
  },
  {
    platform: "Shopify",
    blurb:
      "Drop into any page or section template. Theme editor friendly.",
    steps: [
      "In Shopify admin, go to Online Store → Pages (or Themes → Edit code for templates).",
      "Open the page in HTML mode (the <> icon in the rich text editor).",
      "Paste the snippet below.",
      "Replace YOUR_BUSINESS_ID and save.",
    ],
    snippetLabel: "HTML mode",
    snippet: `<div id="sp-reviews-${DEMO_BID}"></div>
<script async src="https://socialperks.onrender.com/api/v1/embed/reviews?businessId=${DEMO_BID}&theme=light&limit=5&format=js"></script>`,
    notes:
      "For a section that shows on every product page, add the snippet to a custom Liquid block in your theme.",
  },
  {
    platform: "Squarespace",
    blurb: "Use an iframe — Squarespace blocks third-party scripts on most plans.",
    steps: [
      "Edit the page and click '+' to add a new block.",
      "Choose 'Code' block.",
      "Paste the iframe snippet below.",
      "Replace YOUR_BUSINESS_ID and save.",
    ],
    snippetLabel: "Code block (HTML)",
    snippet: `<iframe
  src="https://socialperks.onrender.com/embed/widget/${DEMO_BID}?theme=light"
  width="100%"
  height="560"
  frameborder="0"
  loading="lazy"
  title="Social Perks reviews"
  style="border:0;border-radius:14px;max-width:420px;"
></iframe>`,
    notes:
      "On Business plans or higher, you can also use the script version inside a Code block.",
  },
  {
    platform: "Wix",
    blurb: "Use the HTML iFrame element from the Wix editor.",
    steps: [
      "In the Wix editor, click 'Add Elements' → 'Embed Code' → 'Embed HTML'.",
      "Place the element where you want the widget.",
      "Click 'Enter Code' and paste the iframe snippet below.",
      "Replace YOUR_BUSINESS_ID and click 'Update'.",
    ],
    snippetLabel: "Embed HTML",
    snippet: `<iframe
  src="https://socialperks.onrender.com/embed/widget/${DEMO_BID}?theme=light"
  width="100%"
  height="560"
  frameborder="0"
  loading="lazy"
  title="Social Perks reviews"
></iframe>`,
  },
  {
    platform: "Webflow",
    blurb: "Use the Embed component on any page or as a Symbol for site-wide.",
    steps: [
      "In Webflow Designer, drag an 'Embed' component to your page.",
      "Paste the script snippet below into the Embed editor.",
      "Replace YOUR_BUSINESS_ID and save.",
      "Publish your site to see the widget live (it won't render in the Designer preview).",
    ],
    snippetLabel: "Embed component",
    snippet: `<div id="sp-reviews-${DEMO_BID}"></div>
<script async src="https://socialperks.onrender.com/api/v1/embed/reviews?businessId=${DEMO_BID}&theme=dark&limit=5&format=js"></script>`,
  },
];

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-bg/60">
      <div className="flex items-center justify-between border-b border-brand-border px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-dim">
          {label}
        </span>
        <span className="rounded-md border border-brand-border bg-brand-surface px-2 py-1 font-mono text-[10px] text-brand-dim">
          Copy
        </span>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[12px] leading-relaxed text-brand-white">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function InstallPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <Nav />
      <main id="main-content">
        {/* Hero */}
        <section className="relative overflow-hidden pt-32 pb-12 sm:pt-40 sm:pb-16">
          <div
            className="pointer-events-none absolute inset-0 bg-[length:300%_300%] bg-[linear-gradient(135deg,rgba(34,211,238,0.06),rgba(52,211,153,0.04),rgba(34,211,238,0.02))]"
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
              Install Guide
            </div>
            <h1 className="mt-6 font-heading text-[clamp(2rem,4.5vw,3.5rem)] italic leading-[1.05] tracking-tight text-brand-white">
              Install Social Perks widgets on{" "}
              <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
                any site.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-brand-dim">
              Pick your platform, copy the snippet, paste it in. Two minutes
              tops. No code knowledge required.
            </p>
          </div>
        </section>

        {/* Quick links */}
        <section className="pb-8">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {GUIDES.map((g) => {
                const slug = g.platform.toLowerCase().replace(/\s+/g, "-");
                return (
                  <a
                    key={slug}
                    href={`#${slug}`}
                    className="rounded-full border border-brand-border bg-brand-surface/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-dim transition-colors hover:border-brand-cyan/40 hover:text-brand-white"
                  >
                    {g.platform}
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        {/* Step 1: get your business ID */}
        <section className="pb-12">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-brand-border bg-brand-surface/40 p-6 sm:p-8">
              <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
                Step 0 · Required for every install
              </div>
              <h2 className="mt-2 font-heading text-2xl italic text-brand-white sm:text-3xl">
                Grab your business ID
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-brand-dim">
                Open your{" "}
                <Link href="/dashboard" className="text-brand-cyan hover:underline">
                  Social Perks dashboard
                </Link>{" "}
                → Settings → Embed Widgets. Your business ID is the short
                identifier at the top — copy it. You&apos;ll paste it into every
                snippet below in place of <code className="rounded bg-brand-bg px-1 py-0.5 font-mono text-brand-white">YOUR_BUSINESS_ID</code>.
              </p>
            </div>
          </div>
        </section>

        {/* Guides */}
        <section className="pb-20">
          <div className="mx-auto max-w-4xl space-y-12 px-4 sm:px-6 lg:px-8">
            {GUIDES.map((guide, idx) => {
              const slug = guide.platform.toLowerCase().replace(/\s+/g, "-");
              return (
                <article
                  key={slug}
                  id={slug}
                  className="scroll-mt-24 rounded-2xl border border-brand-border bg-brand-surface/30 p-6 sm:p-8"
                >
                  <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
                    Platform · {String(idx + 1).padStart(2, "0")}
                  </div>
                  <h2 className="mt-2 font-heading text-3xl italic text-brand-white">
                    {guide.platform}
                  </h2>
                  <p className="mt-2 text-sm text-brand-dim">{guide.blurb}</p>

                  <ol className="mt-6 space-y-2 text-sm text-brand-white">
                    {guide.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-cyan/40 bg-brand-cyan/10 font-mono text-[11px] text-brand-cyan">
                          {i + 1}
                        </span>
                        <span className="pt-0.5 leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-6">
                    <CodeBlock label={guide.snippetLabel} code={guide.snippet} />
                  </div>

                  {guide.notes ? (
                    <p className="mt-4 rounded-lg border border-brand-amber/30 bg-brand-amber/5 px-4 py-3 text-sm text-brand-dim">
                      <span className="font-semibold text-brand-amber">Note:</span>{" "}
                      {guide.notes}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-brand-border bg-brand-surface/40 py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl">
              Stuck on a platform we missed?
            </h2>
            <p className="mt-3 text-base text-brand-dim">
              The reviews widget works on anything that supports HTML. If you
              can paste a snippet, you can install Social Perks.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-cyan px-5 py-2.5 font-semibold text-brand-bg transition-colors hover:bg-brand-cyan/90"
              >
                Get help installing
              </Link>
              <Link
                href="/embed"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-surface px-5 py-2.5 font-semibold text-brand-white transition-colors hover:border-brand-cyan/50"
              >
                ← Back to embed overview
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
