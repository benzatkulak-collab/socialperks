import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Social Perks",
  description:
    "Terms of Service for Social Perks. Read about your rights and obligations when using our platform.",
};

export default function TermsPage() {
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
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 sm:py-16">
        <h1 className="font-heading text-3xl italic text-brand-white sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-brand-muted">
          Last updated: March 20, 2026
        </p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-brand-dim">
          {/* 1. Acceptance */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Social Perks (&quot;the Platform&quot;), you
              agree to be bound by these Terms of Service (&quot;Terms&quot;).
              If you do not agree to all of these Terms, you may not access or
              use the Platform. These Terms constitute a legally binding
              agreement between you and Social Perks, Inc.
              (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or
              &quot;our&quot;).
            </p>
          </section>

          {/* 2. Service Description */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              2. Description of Service
            </h2>
            <p>
              Social Perks is a marketing platform that connects businesses with
              customers and influencers. Businesses offer perks (discounts,
              rewards, or other incentives) in exchange for marketing actions
              such as social media posts, reviews, referrals, and shares.
            </p>
            <p className="mt-3">The Platform provides:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-brand-muted">
              <li>Campaign creation and management tools for businesses</li>
              <li>
                Discovery and participation tools for influencers and customers
              </li>
              <li>
                Analytics, compliance, and fraud detection infrastructure
              </li>
              <li>API access for enterprise integrations</li>
            </ul>
          </section>

          {/* 3. Account Registration */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              3. Account Registration &amp; Security
            </h2>
            <p>
              You must provide accurate and complete information when creating an
              account. You are responsible for maintaining the confidentiality of
              your credentials and for all activity under your account. You must
              notify us immediately of any unauthorized access. We reserve the
              right to suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          {/* 4. User Obligations */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              4. User Obligations
            </h2>
            <p>When using the Platform, you agree to:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-brand-muted">
              <li>
                Comply with all applicable laws, including FTC endorsement
                guidelines
              </li>
              <li>
                Not submit fraudulent, misleading, or inauthentic content
              </li>
              <li>
                Not use automated tools to manipulate engagement or metrics
              </li>
              <li>
                Not impersonate other users, businesses, or influencers
              </li>
              <li>
                Include required FTC disclosures in all sponsored content
              </li>
              <li>
                Respect intellectual property rights of others
              </li>
            </ul>
          </section>

          {/* 5. Business Terms */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              5. Business Terms
            </h2>
            <p>
              Businesses using the Platform to create campaigns agree to honor
              all perks offered through their campaigns. Perks must be clearly
              described and delivered as promised. Businesses are responsible for
              any tax obligations arising from perks they distribute.
            </p>
          </section>

          {/* 6. Payment Terms */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              6. Payment Terms
            </h2>
            <p>
              Certain features of the Platform may require payment. All fees are
              stated in US Dollars. Payments are processed through our
              third-party payment provider (Stripe). By providing payment
              information, you authorize us to charge the applicable fees.
              Subscription fees are billed in advance on a monthly or annual
              basis.
            </p>
            <p className="mt-3">
              <strong className="text-brand-text">30-day money-back guarantee.</strong>{" "}
              If you sign up for a paid plan and decide it isn&apos;t for you,
              email us within 30 days of your first paid month and we will
              refund the most recent charge in full. After 30 days,
              subscription fees are non-refundable except where required by
              law. You can cancel anytime from your dashboard; no phone calls
              and no retention scripts.
            </p>
          </section>

          {/* 7. Intellectual Property */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              7. Intellectual Property
            </h2>
            <p>
              The Platform, including its design, code, algorithms, and
              branding, is owned by Social Perks, Inc. and protected by
              copyright, trademark, and other intellectual property laws. You
              retain ownership of content you create and submit through the
              Platform, but grant us a non-exclusive, worldwide, royalty-free
              license to use, display, and distribute such content in connection
              with the Platform&apos;s services and marketing.
            </p>
          </section>

          {/* 8. Limitation of Liability */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              8. Limitation of Liability
            </h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SOCIAL PERKS SHALL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS,
              DATA, USE, OR GOODWILL. OUR TOTAL LIABILITY SHALL NOT EXCEED THE
              AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          {/* 9. Disclaimers */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              9. Disclaimers
            </h2>
            <p>
              THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT
              GUARANTEE THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR
              SECURE. WE DO NOT ENDORSE OR GUARANTEE THE QUALITY, ACCURACY, OR
              RELIABILITY OF ANY CONTENT CREATED THROUGH THE PLATFORM.
            </p>
          </section>

          {/* 10. Termination */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              10. Termination
            </h2>
            <p>
              We may suspend or terminate your account at any time for violation
              of these Terms or for any reason with reasonable notice. You may
              terminate your account at any time by contacting support. Upon
              termination, your right to use the Platform ceases immediately.
              Sections relating to intellectual property, limitation of
              liability, and dispute resolution survive termination.
            </p>
          </section>

          {/* 11. Dispute Resolution */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              11. Dispute Resolution
            </h2>
            <p>
              Any disputes arising from these Terms shall be resolved through
              binding arbitration in accordance with the rules of the American
              Arbitration Association, conducted in San Francisco, California.
              You waive any right to participate in a class action lawsuit or
              class-wide arbitration.
            </p>
          </section>

          {/* 12. Changes */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              12. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these Terms at any time. Material
              changes will be communicated via email or a prominent notice on the
              Platform at least 30 days before they take effect. Continued use
              of the Platform after changes take effect constitutes acceptance of
              the revised Terms.
            </p>
          </section>

          {/* 13. Contact */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              13. Contact
            </h2>
            <p>
              If you have questions about these Terms, contact us at{" "}
              <a
                href="mailto:legal@socialperks.io"
                className="text-brand-cyan underline underline-offset-2 transition-colors hover:text-brand-cyan/80"
              >
                legal@socialperks.io
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
