import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

export const metadata: Metadata = {
  title: "Embed Social Perks on Your Site — Free Widgets · Social Perks",
  description:
    "Drop a Social Perks widget into any site in 30 seconds. Show your real reviews, star rating, and a 'Powered by' badge. Free for every customer.",
  openGraph: {
    title: "Embed Social Perks Widgets",
    description:
      "Free embeddable review widgets, star badges, and 'Powered by' badges. Copy. Paste. Done.",
    url: "https://socialperks.onrender.com/embed",
    siteName: "Social Perks",
    type: "website",
  },
};

const DEMO_BUSINESS_ID = "demo-business";

const REVIEWS_JS_SNIPPET = `<!-- Social Perks Reviews Widget -->
<div id="sp-reviews-${DEMO_BUSINESS_ID}"></div>
<script async src="https://socialperks.onrender.com/api/v1/embed/reviews?businessId=${DEMO_BUSINESS_ID}&theme=dark&limit=5&format=js"></script>`;

const REVIEWS_IFRAME_SNIPPET = `<iframe
  src="https://socialperks.onrender.com/embed/widget/${DEMO_BUSINESS_ID}?theme=dark"
  width="380"
  height="560"
  frameborder="0"
  loading="lazy"
  title="Social Perks reviews"
></iframe>`;

const BADGE_SNIPPET = `<a href="https://socialperks.onrender.com" target="_blank" rel="noopener">
  <img
    src="https://socialperks.onrender.com/api/v1/embed/badge?size=medium&theme=dark"
    alt="Powered by Social Perks"
    width="200"
    height="40"
  />
</a>`;

const STARS_SNIPPET = `<img
  src="https://socialperks.onrender.com/api/v1/embed/stars?rating=4.9&reviewCount=247&color=amber"
  alt="4.9 stars from 247 reviews"
  height="32"
/>`;

const WIDGETS = [
  {
    id: "reviews",
    name: "Reviews Widget",
    blurb:
      "Show your most recent verified reviews in a beautiful, theme-matched card. Updates automatically.",
    preview: (
      <iframe
        src={`/embed/widget/${DEMO_BUSINESS_ID}?theme=dark`}
        title="Reviews widget preview"
        loading="lazy"
        className="h-[480px] w-full rounded-xl border border-brand-border bg-brand-surface"
      />
    ),
    snippetLabel: "Embed as script",
    snippet: REVIEWS_JS_SNIPPET,
    altLabel: "Or use iframe",
    altSnippet: REVIEWS_IFRAME_SNIPPET,
  },
  {
    id: "badge",
    name: "Powered-by Badge",
    blurb:
      "A small footer badge that signals trust and quietly drives traffic. Three sizes, light + dark.",
    preview: (
      <div className="flex h-[160px] flex-col items-center justify-center gap-4 rounded-xl border border-brand-border bg-brand-surface p-6">
        <img
          src="/api/v1/embed/badge?size=small&theme=dark"
          alt="Powered by Social Perks (small)"
          width={150}
          height={28}
        />
        <img
          src="/api/v1/embed/badge?size=medium&theme=dark"
          alt="Powered by Social Perks (medium)"
          width={200}
          height={40}
        />
        <img
          src="/api/v1/embed/badge?size=large&theme=dark"
          alt="Powered by Social Perks (large)"
          width={260}
          height={56}
        />
      </div>
    ),
    snippetLabel: "Embed as image",
    snippet: BADGE_SNIPPET,
  },
  {
    id: "stars",
    name: "Star Rating Badge",
    blurb:
      "An at-a-glance star rating with review count. Drop it next to your CTA, in your footer, anywhere.",
    preview: (
      <div className="flex h-[160px] flex-col items-center justify-center gap-3 rounded-xl border border-brand-border bg-brand-surface p-6">
        <img
          src="/api/v1/embed/stars?rating=4.9&reviewCount=247&color=amber"
          alt="4.9 stars from 247 reviews"
          height={32}
        />
        <img
          src="/api/v1/embed/stars?rating=4.7&reviewCount=58&color=cyan"
          alt="4.7 stars from 58 reviews"
          height={32}
        />
        <img
          src="/api/v1/embed/stars?rating=5&reviewCount=1024&color=green"
          alt="5 stars from 1024 reviews"
          height={32}
        />
      </div>
    ),
    snippetLabel: "Embed as image",
    snippet: STARS_SNIPPET,
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

export default function EmbedPage() {
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
            className="pointer-events-none absolute right-1/4 top-1/4 h-96 w-96 rounded-full bg-brand-cyan/5 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-green">
              Free for every customer
            </div>

            <h1 className="mt-6 font-heading text-[clamp(2.25rem,5vw,4rem)] italic leading-[1.05] tracking-tight text-brand-white">
              Embed Social Perks on{" "}
              <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
                your customer sites.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
              Three drop-in widgets to show your reviews, your star rating, and
              a trust badge — anywhere your customers see you. Copy, paste,
              done. Works on any site.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/embed/install"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-cyan px-5 py-2.5 font-semibold text-brand-bg transition-colors hover:bg-brand-cyan/90"
              >
                Install guide →
              </Link>
              <Link
                href="#widgets"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-surface px-5 py-2.5 font-semibold text-brand-white transition-colors hover:border-brand-cyan/50"
              >
                See the widgets
              </Link>
            </div>
          </div>
        </section>

        {/* Widgets */}
        <section id="widgets" className="pb-24">
          <div className="mx-auto max-w-6xl space-y-16 px-4 sm:px-6 lg:px-8">
            {WIDGETS.map((widget, idx) => (
              <div
                key={widget.id}
                className="grid items-start gap-8 lg:grid-cols-2"
              >
                <div className={idx % 2 === 1 ? "lg:order-2" : ""}>
                  <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
                    Widget · {String(idx + 1).padStart(2, "0")}
                  </div>
                  <h2 className="mt-3 font-heading text-3xl italic leading-tight text-brand-white sm:text-4xl">
                    {widget.name}
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-brand-dim">
                    {widget.blurb}
                  </p>

                  <div className="mt-6 space-y-3">
                    <CodeBlock label={widget.snippetLabel} code={widget.snippet} />
                    {widget.altSnippet ? (
                      <CodeBlock
                        label={widget.altLabel ?? "Alternative"}
                        code={widget.altSnippet}
                      />
                    ) : null}
                  </div>
                </div>

                <div className={idx % 2 === 1 ? "lg:order-1" : ""}>
                  {widget.preview}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why bother */}
        <section className="border-t border-brand-border bg-brand-surface/40 py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center font-heading text-3xl italic text-brand-white sm:text-4xl">
              Why customers embed our widgets
            </h2>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {[
                {
                  k: "Social proof",
                  v: "Reviews on your site convert 2-3x better than reviews you have to hunt for.",
                },
                {
                  k: "Always fresh",
                  v: "Widgets pull live from your dashboard — no manual updates, no stale screenshots.",
                },
                {
                  k: "Built-in trust",
                  v: "A 'Powered by Social Perks' badge signals you're running a real, verified review program.",
                },
              ].map((card) => (
                <div
                  key={card.k}
                  className="rounded-2xl border border-brand-border bg-brand-bg/40 p-6"
                >
                  <div className="font-heading text-xl italic text-brand-cyan">
                    {card.k}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-brand-dim">
                    {card.v}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl">
              Ready in 30 seconds.
            </h2>
            <p className="mt-3 text-base text-brand-dim">
              Grab your business ID from the dashboard, paste the snippet, ship.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/embed/install"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-cyan px-5 py-2.5 font-semibold text-brand-bg transition-colors hover:bg-brand-cyan/90"
              >
                Read the install guide
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-surface px-5 py-2.5 font-semibold text-brand-white transition-colors hover:border-brand-cyan/50"
              >
                See pricing
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
