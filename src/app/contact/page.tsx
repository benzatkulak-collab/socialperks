import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact Us — Social Perks",
  description:
    "Get in touch with the Social Perks team. Whether you have a question, need technical support, or want to discuss a partnership, we're here to help.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Nav */}
      <header className="border-b border-brand-border/50">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Back to home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-cyan/10">
              <span className="font-heading text-lg text-brand-cyan">S</span>
            </div>
            <span className="font-heading text-xl italic text-brand-white">
              Social Perks
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-brand-muted transition-colors hover:text-brand-text"
          >
            &larr; Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 sm:py-16">
        {/* Hero */}
        <section>
          <h1 className="font-heading text-3xl italic text-brand-white sm:text-4xl">
            Contact Us
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-brand-dim">
            Have a question, need help, or want to explore a partnership? We
            would love to hear from you.
          </p>
        </section>

        {/* Two-column layout */}
        <div className="mt-12 grid gap-10 lg:grid-cols-3">
          {/* Form — takes 2 columns */}
          <div className="lg:col-span-2">
            <ContactForm />
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Contact info */}
            <div className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-muted">
                Get in Touch
              </h2>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-brand-muted">Email</p>
                  <a
                    href="mailto:support@socialperks.io"
                    className="text-brand-cyan underline underline-offset-2 transition-colors hover:text-brand-cyan/80"
                  >
                    support@socialperks.io
                  </a>
                </div>
                <div>
                  <p className="text-brand-muted">Talk to the founder</p>
                  <p className="text-brand-text">
                    We&apos;re early — if you want a real conversation before
                    signing up, reply &quot;founder&quot; on the form and
                    you&apos;ll get a direct response.
                  </p>
                </div>
                <div>
                  <p className="text-brand-muted">Response Time</p>
                  <p className="text-brand-text">Within 24 hours</p>
                </div>
              </div>
            </div>

            {/* Helpful links */}
            <div className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-muted">
                Helpful Links
              </h2>
              <nav className="space-y-2 text-sm" aria-label="Helpful links">
                {[
                  { label: "Pricing", href: "/pricing" },
                  { label: "About Us", href: "/about" },
                  { label: "Terms of Service", href: "/terms" },
                  { label: "Privacy Policy", href: "/privacy" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-brand-dim transition-colors hover:text-brand-cyan"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
