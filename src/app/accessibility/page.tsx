import type { Metadata } from "next";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

export const metadata: Metadata = {
  title: "Accessibility — Social Perks",
  description:
    "How we approach accessibility, what we conform to, and how to report issues.",
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <Nav />

      <main id="main-content" className="mx-auto max-w-3xl px-4 pt-32 pb-20 sm:px-6 lg:px-8 sm:pt-40 sm:pb-28">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
          Accessibility
        </p>
        <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">
          Accessibility statement
        </h1>

        <div className="mt-8 space-y-6 text-base leading-relaxed text-brand-dim sm:text-lg">
          <p>
            We aim for the marketing site and the dashboard to meet{" "}
            <a
              href="https://www.w3.org/WAI/standards-guidelines/wcag/"
              className="text-brand-cyan underline underline-offset-2 decoration-brand-cyan/40 hover:decoration-brand-cyan transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              WCAG 2.1 AA
            </a>
            .
          </p>

          <h2 className="font-heading text-2xl italic text-brand-white">
            What we&apos;ve done
          </h2>
          <ul className="list-inside list-disc space-y-2 pl-2">
            <li>Skip-to-content link on every page</li>
            <li>Semantic HTML landmarks (<code>main</code>, <code>nav</code>, <code>footer</code>) </li>
            <li>Keyboard-reachable focus styles on every interactive element</li>
            <li>Aria labels on icon-only controls</li>
            <li>
              <code>prefers-reduced-motion</code> respected for animations
            </li>
            <li>Color contrast tuned to AA on body text and CTAs</li>
            <li>Form fields with explicit labels and error states</li>
          </ul>

          <h2 className="font-heading text-2xl italic text-brand-white">
            What we&apos;re still working on
          </h2>
          <ul className="list-inside list-disc space-y-2 pl-2">
            <li>
              Color contrast audit of secondary text against the dark
              background — ongoing
            </li>
            <li>
              Screen-reader pass on the campaign-creation flow — scheduled
            </li>
            <li>
              Closed captions on any product-walkthrough videos we publish
            </li>
          </ul>

          <h2 className="font-heading text-2xl italic text-brand-white">
            Reporting an issue
          </h2>
          <p>
            If you hit something that&apos;s hard to use with a keyboard, a
            screen reader, magnification, or any other assistive technology,
            email{" "}
            <a
              href="mailto:accessibility@socialperks.app"
              className="text-brand-cyan underline underline-offset-2 decoration-brand-cyan/40 hover:decoration-brand-cyan transition-colors"
            >
              accessibility@socialperks.app
            </a>{" "}
            and we&apos;ll respond within 5 business days.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
