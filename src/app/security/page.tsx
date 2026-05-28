import type { Metadata } from "next";
import Link from "next/link";
import { safeJsonForScript } from "@/lib/security/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

export const metadata: Metadata = {
  title: "Security at Social Perks",
  description:
    "Security practices, compliance posture, vulnerability disclosure, and incident response at Social Perks. Auditable, transparent, and version-controlled.",
  alternates: { canonical: `${SITE_URL}/security` },
};

export const dynamic = "force-static";

export default function SecurityPage() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Security at Social Perks",
    url: `${SITE_URL}/security`,
    description:
      "Security practices: authentication, encryption, secrets handling, vulnerability disclosure, incident response.",
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(ld) }}
      />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10">
          <p className="text-sm text-brand-text-dim mb-2">Security</p>
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            Security at Social Perks
          </h1>
          <p className="text-lg text-brand-text leading-relaxed">
            We treat security as a product surface, not a compliance
            checkbox. This page lists what we do, where the limits are,
            and how to report a vulnerability.
          </p>
        </header>

        <Section title="Authentication">
          <ul className="space-y-2 text-brand-text">
            <Item>Passwords stored with scrypt + per-password salt; no plaintext.</Item>
            <Item>JWT signing pinned to HS256 with explicit type-claim verification (access vs refresh).</Item>
            <Item>API keys hashed with SHA-256 before persistence; verification uses constant-time compare.</Item>
            <Item>Demo PIN auth disabled in production — only password and JWT/cookie paths accept logins.</Item>
            <Item>OAuth state tokens are server-side single-use (atomic consume on callback).</Item>
          </ul>
        </Section>

        <Section title="Authorization & tenant isolation">
          <ul className="space-y-2 text-brand-text">
            <Item>Every cross-tenant resource access goes through `requireOwnership(user, resource.businessId)` — explicit fail-closed (no null-bypass).</Item>
            <Item>API key permissions enforced at the route layer; keys cannot mint or list other keys.</Item>
            <Item>Cross-tenant cashback / submission attempts return 404 (not 403) to avoid resource-existence enumeration.</Item>
          </ul>
        </Section>

        <Section title="Network & transport">
          <ul className="space-y-2 text-brand-text">
            <Item>HSTS with includeSubDomains + preload.</Item>
            <Item>Strict CSP — script-src nonce-tightened, connect-src allowlisted, object-src none, upgrade-insecure-requests.</Item>
            <Item>X-Frame-Options DENY + CSP frame-ancestors none — clickjacking blocked.</Item>
            <Item>SSRF guard on all server-side fetches (RFC1918 / loopback / cloud-metadata IPs blocked, redirects manual).</Item>
          </ul>
        </Section>

        <Section title="Webhook integrity">
          <ul className="space-y-2 text-brand-text">
            <Item>Stripe webhooks: HMAC-SHA256 signature verification via Stripe SDK (constant-time).</Item>
            <Item>Platform webhooks (Meta, TikTok, etc.): HMAC-SHA256 signature with replay protection (cross-instance via Postgres).</Item>
            <Item>Signature failures are audit-logged; production hard-fails when secrets are missing rather than degrading silently.</Item>
          </ul>
        </Section>

        <Section title="Data handling">
          <ul className="space-y-2 text-brand-text">
            <Item>API key plaintext is shown ONCE at creation, never persisted.</Item>
            <Item>Database connection over TLS (Postgres default in production).</Item>
            <Item>Audit log captures security-sensitive events (auth, key lifecycle, billing changes, submission reviews) with structured JSON output.</Item>
            <Item>No customer payment data ever stored on Social Perks — Stripe handles the entire payment surface.</Item>
            <Item>PII (email, phone) is per-tenant-isolated; cross-tenant queries reject in the repository layer.</Item>
          </ul>
        </Section>

        <Section title="Dependencies">
          <ul className="space-y-2 text-brand-text">
            <Item><code>npm audit</code> runs on every PR; high-severity CVEs block merge.</Item>
            <Item>Renovate/Dependabot on autoupdate for non-breaking patches.</Item>
            <Item>No bundled binaries from third parties.</Item>
          </ul>
        </Section>

        <Section title="Vulnerability disclosure">
          <p className="text-brand-text leading-relaxed mb-3">
            If you discover a security issue, please report it to{" "}
            <a href="mailto:security@socialperks.app" className="text-brand-cyan underline">
              security@socialperks.app
            </a>{" "}
            with steps to reproduce. We commit to:
          </p>
          <ul className="space-y-2 text-brand-text">
            <Item>Acknowledging receipt within 24 hours.</Item>
            <Item>Investigating within 5 business days.</Item>
            <Item>Patching critical issues within 7 days, others within 30.</Item>
            <Item>Crediting the reporter (with permission) in <Link href="/changelog" className="text-brand-cyan hover:underline">our changelog</Link>.</Item>
            <Item>Not pursuing legal action against good-faith research.</Item>
          </ul>
        </Section>

        <Section title="Incident response">
          <p className="text-brand-text leading-relaxed">
            For active incidents: status updates land at{" "}
            <Link href="/status" className="text-brand-cyan hover:underline">/status</Link>.
            Customer notifications go via the email address on record. Post-mortems
            for incidents touching customer data are published in the changelog within 14 days.
          </p>
        </Section>

        <Section title="What we don't do (yet)">
          <ul className="space-y-2 text-brand-text">
            <Item>SOC 2 Type 2 certification — on the roadmap; not currently audited.</Item>
            <Item>Bug bounty program — handled ad-hoc on the disclosure email above.</Item>
            <Item>Penetration testing on an annual schedule — last test was internal-only.</Item>
          </ul>
          <p className="text-sm text-brand-text-dim mt-4">
            We&apos;re a small team. We tell you what&apos;s done and what isn&apos;t.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-serif italic text-2xl text-brand-white mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 leading-relaxed">
      <span aria-hidden className="text-brand-cyan shrink-0">•</span>
      <span>{children}</span>
    </li>
  );
}
