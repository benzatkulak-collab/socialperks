import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Social Perks",
  description:
    "Privacy Policy for Social Perks. Learn how we collect, use, and protect your personal data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Nav */}
      <header className="border-b border-brand-border/50">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
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
      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="font-heading text-3xl italic text-brand-white sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-brand-muted">
          Last updated: March 20, 2026
        </p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-brand-dim">
          {/* 1. Introduction */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              1. Introduction
            </h2>
            <p>
              Social Perks, Inc. (&quot;we&quot;, &quot;us&quot;, or
              &quot;our&quot;) respects your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your
              information when you use the Social Perks platform. Please read
              this policy carefully. By using the Platform, you consent to the
              practices described herein.
            </p>
          </section>

          {/* 2. Data Collection */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              2. Information We Collect
            </h2>
            <p className="mb-3">
              We collect information in the following categories:
            </p>
            <h3 className="mb-1 font-semibold text-brand-text">
              Information You Provide
            </h3>
            <ul className="mb-3 list-inside list-disc space-y-1 text-brand-muted">
              <li>Account registration data (name, email, password)</li>
              <li>Business profile information (name, address, category)</li>
              <li>Influencer profile data (social handles, follower counts, niche)</li>
              <li>Payment and billing information (processed by Stripe)</li>
              <li>Campaign content and submissions</li>
              <li>Communications with our support team</li>
            </ul>
            <h3 className="mb-1 font-semibold text-brand-text">
              Information Collected Automatically
            </h3>
            <ul className="list-inside list-disc space-y-1 text-brand-muted">
              <li>Device information (browser type, operating system)</li>
              <li>Usage data (pages visited, features used, session duration)</li>
              <li>IP address and approximate location</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          {/* 3. How We Use Data */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              3. How We Use Your Information
            </h2>
            <ul className="list-inside list-disc space-y-1 text-brand-muted">
              <li>Provide, maintain, and improve the Platform</li>
              <li>Process transactions and manage campaigns</li>
              <li>Match influencers with relevant business campaigns</li>
              <li>Detect and prevent fraud and abuse</li>
              <li>Ensure FTC compliance for sponsored content</li>
              <li>Send service-related notifications and updates</li>
              <li>Analyze usage patterns to improve the user experience</li>
              <li>Provide customer support</li>
            </ul>
          </section>

          {/* 4. Data Sharing */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              4. How We Share Your Information
            </h2>
            <p>We do not sell your personal information. We may share data with:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-brand-muted">
              <li>
                <strong className="text-brand-dim">Service providers:</strong>{" "}
                Third-party vendors who help operate the Platform (hosting,
                payment processing, analytics)
              </li>
              <li>
                <strong className="text-brand-dim">Business partners:</strong>{" "}
                When you participate in a campaign, relevant information is
                shared with the campaign creator
              </li>
              <li>
                <strong className="text-brand-dim">Legal obligations:</strong>{" "}
                When required by law, regulation, or legal process
              </li>
              <li>
                <strong className="text-brand-dim">Business transfers:</strong>{" "}
                In connection with a merger, acquisition, or sale of assets
              </li>
            </ul>
          </section>

          {/* 5. Cookies */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              5. Cookies &amp; Tracking Technologies
            </h2>
            <p>
              We use cookies and similar technologies for authentication, preferences,
              analytics, and security. You can manage cookie preferences through your
              browser settings. Disabling certain cookies may limit Platform functionality.
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-brand-muted">
              <li>
                <strong className="text-brand-dim">Essential cookies:</strong>{" "}
                Required for Platform operation (authentication, security)
              </li>
              <li>
                <strong className="text-brand-dim">Analytics cookies:</strong>{" "}
                Help us understand usage patterns
              </li>
              <li>
                <strong className="text-brand-dim">Preference cookies:</strong>{" "}
                Remember your settings and choices
              </li>
            </ul>
          </section>

          {/* 6. Data Retention */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              6. Data Retention
            </h2>
            <p>
              We retain your personal data for as long as your account is active
              or as needed to provide services. We may retain certain data after
              account deletion for legal compliance, dispute resolution, and
              fraud prevention purposes, generally no longer than 3 years after
              account closure.
            </p>
          </section>

          {/* 7. Data Security */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              7. Data Security
            </h2>
            <p>
              We implement industry-standard security measures including
              encryption in transit (TLS 1.3) and at rest, access controls,
              regular security audits, and monitoring. However, no method of
              transmission over the internet is 100% secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          {/* 8. Your Rights */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              8. Your Rights
            </h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-brand-muted">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (&quot;right to be forgotten&quot;)</li>
              <li>Object to or restrict certain processing</li>
              <li>Data portability (receive your data in a structured format)</li>
              <li>Withdraw consent at any time</li>
              <li>Lodge a complaint with a supervisory authority</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, contact us at{" "}
              <a
                href="mailto:privacy@socialperks.io"
                className="text-brand-cyan underline underline-offset-2 transition-colors hover:text-brand-cyan/80"
              >
                privacy@socialperks.io
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          {/* 9. GDPR */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              9. GDPR Compliance (EEA Users)
            </h2>
            <p>
              For users in the European Economic Area, we process personal data
              under lawful bases including consent, contract performance,
              legitimate interests, and legal obligations. You have the right to
              access, rectify, erase, restrict processing, data portability, and
              object. Our Data Protection Officer can be reached at{" "}
              <a
                href="mailto:dpo@socialperks.io"
                className="text-brand-cyan underline underline-offset-2 transition-colors hover:text-brand-cyan/80"
              >
                dpo@socialperks.io
              </a>
              .
            </p>
          </section>

          {/* 10. CCPA */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              10. CCPA Compliance (California Residents)
            </h2>
            <p>
              California residents have additional rights under the California
              Consumer Privacy Act (CCPA). You have the right to know what
              personal information is collected, request deletion, and opt out of
              the sale of personal information. We do not sell personal
              information. To exercise your CCPA rights, contact us at{" "}
              <a
                href="mailto:privacy@socialperks.io"
                className="text-brand-cyan underline underline-offset-2 transition-colors hover:text-brand-cyan/80"
              >
                privacy@socialperks.io
              </a>
              . We will not discriminate against you for exercising your rights.
            </p>
          </section>

          {/* 11. Children */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              11. Children&apos;s Privacy
            </h2>
            <p>
              The Platform is not intended for users under 13 years of age. We
              do not knowingly collect personal information from children under
              13. If we learn we have collected data from a child under 13, we
              will delete that information promptly.
            </p>
          </section>

          {/* 12. Changes */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              12. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Material
              changes will be communicated via email or a prominent notice on the
              Platform at least 30 days before they take effect. The &quot;Last
              updated&quot; date at the top reflects the most recent revision.
            </p>
          </section>

          {/* 13. Contact */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-brand-text">
              13. Contact Us
            </h2>
            <p>
              For privacy-related questions or requests, contact us at:
            </p>
            <div className="mt-3 rounded-lg border border-brand-border/50 bg-brand-surface/30 p-4 text-brand-muted">
              <p>Social Perks, Inc.</p>
              <p>
                Email:{" "}
                <a
                  href="mailto:privacy@socialperks.io"
                  className="text-brand-cyan underline underline-offset-2"
                >
                  privacy@socialperks.io
                </a>
              </p>
              <p>San Francisco, CA, United States</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
