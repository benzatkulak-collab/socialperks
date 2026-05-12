import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security — Social Perks",
  description:
    "How Social Perks protects your data: TLS 1.3, AES-256 at rest, JWT auth, optional 2FA, GDPR/CCPA, SOC 2 Type II in progress, bug bounty.",
  openGraph: {
    title: "Security at Social Perks",
    description:
      "Encryption, authentication, compliance, and disclosure — explained.",
    url: "https://socialperks.onrender.com/security",
    siteName: "Social Perks",
    type: "website",
  },
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
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

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 sm:py-16">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
            Security
          </div>
          <h1 className="mt-4 font-heading text-3xl italic leading-tight text-brand-white sm:text-5xl">
            Security at Social Perks
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-brand-dim">
            Customer trust is the only thing we sell. Here&apos;s how we earn
            it — concretely, with the practices, controls, and disclosures
            that keep your data safe.
          </p>
        </section>

        {/* Encryption */}
        <section className="mt-16">
          <h2 className="font-heading text-2xl italic text-brand-white">
            Encryption
          </h2>
          <div className="mt-4 rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6">
            <ul className="space-y-3 text-sm leading-relaxed text-brand-dim">
              <li>
                <span className="font-semibold text-brand-text">
                  In transit:
                </span>{" "}
                TLS 1.3 enforced for all client connections. HSTS preload, OCSP
                stapling, modern cipher suites only.
              </li>
              <li>
                <span className="font-semibold text-brand-text">At rest:</span>{" "}
                AES-256-GCM for database storage, object storage (R2/S3), and
                automatic backups. Keys managed via cloud KMS with per-tenant
                envelope encryption for sensitive fields.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  Backups:
                </span>{" "}
                Encrypted, replicated to a second region, point-in-time
                recovery for the past 7 days.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  Key rotation:
                </span>{" "}
                Automatic 90-day rotation for KMS keys, immediate revocation on
                suspected compromise.
              </li>
            </ul>
          </div>
        </section>

        {/* Authentication */}
        <section className="mt-16">
          <h2 className="font-heading text-2xl italic text-brand-white">
            Authentication
          </h2>
          <div className="mt-4 rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6">
            <ul className="space-y-3 text-sm leading-relaxed text-brand-dim">
              <li>
                <span className="font-semibold text-brand-text">
                  Passwords:
                </span>{" "}
                bcrypt with cost factor 12. We never see plaintext, never log
                it, never email it.
              </li>
              <li>
                <span className="font-semibold text-brand-text">Sessions:</span>{" "}
                JWTs in httpOnly, Secure, SameSite=Lax cookies. Bearer tokens
                supported for API clients. CSRF tokens enforced on every write.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  2FA / TOTP:
                </span>{" "}
                Optional for all accounts, required for admin tier. Compatible
                with Authy, 1Password, Google Authenticator.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  API keys:
                </span>{" "}
                Three scoped tiers (read, read-write, admin). Hashed at rest;
                shown once on creation, never again.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  Session management:
                </span>{" "}
                List and revoke active sessions from your account settings.
                Failed-login throttling and audit logging are always on.
              </li>
            </ul>
          </div>
        </section>

        {/* Compliance */}
        <section className="mt-16">
          <h2 className="font-heading text-2xl italic text-brand-white">
            Compliance
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-5">
              <div className="font-semibold text-brand-text">GDPR</div>
              <p className="mt-2 text-sm text-brand-dim">
                Full data subject rights — access, portability, rectification,
                deletion. EU data subprocessor list maintained publicly.
              </p>
            </div>
            <div className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-5">
              <div className="font-semibold text-brand-text">CCPA / CPRA</div>
              <p className="mt-2 text-sm text-brand-dim">
                California consumer rights honored. Do-not-sell signal
                respected. Consumer requests fulfilled within 45 days.
              </p>
            </div>
            <div className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-5">
              <div className="font-semibold text-brand-text">
                SOC 2 Type II
              </div>
              <p className="mt-2 text-sm text-brand-dim">
                Audit{" "}
                <span className="font-mono text-brand-cyan">in progress</span>.
                Type I expected mid-2026, Type II by end of year. Letter of
                engagement available on request.
              </p>
            </div>
            <div className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-5">
              <div className="font-semibold text-brand-text">
                FTC compliance
              </div>
              <p className="mt-2 text-sm text-brand-dim">
                Auto-injected disclosure language on all sponsored content. Not
                user-disable-able by design.
              </p>
            </div>
          </div>
        </section>

        {/* Infrastructure */}
        <section className="mt-16">
          <h2 className="font-heading text-2xl italic text-brand-white">
            Infrastructure
          </h2>
          <div className="mt-4 rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6">
            <ul className="space-y-3 text-sm leading-relaxed text-brand-dim">
              <li>
                <span className="font-semibold text-brand-text">
                  Hosting:
                </span>{" "}
                Render (application), Neon / Supabase (Postgres). Both
                SOC 2 Type II certified providers.
              </li>
              <li>
                <span className="font-semibold text-brand-text">Region:</span>{" "}
                US East (Ohio) primary, with EU region available on enterprise
                plans for data-residency requirements.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  Network isolation:
                </span>{" "}
                Application services live in a private VPC. Database access is
                IP-allowlisted with PgBouncer connection pooling.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  Monitoring:
                </span>{" "}
                100% request tracing, structured JSON logs, anomaly detection
                on auth flows, page-on-call for incidents.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  Patching:
                </span>{" "}
                Dependencies scanned daily. Critical CVEs patched within 24
                hours. Quarterly penetration testing by an external firm.
              </li>
            </ul>
          </div>
        </section>

        {/* Bug bounty */}
        <section className="mt-16">
          <h2 className="font-heading text-2xl italic text-brand-white">
            Bug bounty
          </h2>
          <div className="mt-4 rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 p-6">
            <p className="text-sm leading-relaxed text-brand-dim">
              We pay researchers who help us find and fix vulnerabilities. Email
              your findings to{" "}
              <a
                href="mailto:security@socialperks.app"
                className="font-mono text-brand-cyan hover:underline"
              >
                security@socialperks.app
              </a>{" "}
              with a clear reproduction. PGP key available on request.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-brand-dim">
              <li>
                <span className="font-mono text-brand-green">$100–500</span> ·
                Low-severity (info disclosure, missing headers).
              </li>
              <li>
                <span className="font-mono text-brand-green">$500–2,500</span>{" "}
                · Medium (auth bypass, IDOR, stored XSS).
              </li>
              <li>
                <span className="font-mono text-brand-green">
                  $2,500–10,000
                </span>{" "}
                · High/Critical (RCE, account takeover at scale, full data
                exfiltration).
              </li>
            </ul>
            <p className="mt-4 text-xs text-brand-muted">
              Out of scope: DoS, social engineering, physical attacks, third-party
              services. Test only against your own account or our dedicated
              sandbox at <code className="font-mono">/api/v1/sandbox</code>.
            </p>
          </div>
        </section>

        {/* Vulnerability disclosure */}
        <section className="mt-16">
          <h2 className="font-heading text-2xl italic text-brand-white">
            Vulnerability disclosure policy
          </h2>
          <div className="mt-4 rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6">
            <ol className="space-y-3 text-sm leading-relaxed text-brand-dim">
              <li>
                <span className="font-semibold text-brand-text">
                  1. Report.
                </span>{" "}
                Email{" "}
                <a
                  href="mailto:security@socialperks.app"
                  className="font-mono text-brand-cyan hover:underline"
                >
                  security@socialperks.app
                </a>{" "}
                with a description, affected URLs, and reproduction steps.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  2. Acknowledgement.
                </span>{" "}
                We respond within 2 business days with a tracking ID.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  3. Triage.
                </span>{" "}
                We assign severity and target a fix window: 24h critical, 7d
                high, 30d medium, 90d low.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  4. Resolution.
                </span>{" "}
                We notify you on patch and coordinate disclosure timing.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  5. Recognition.
                </span>{" "}
                With your consent, we credit you in our security hall of fame
                and changelog.
              </li>
            </ol>
            <p className="mt-4 text-xs text-brand-muted">
              We commit to safe-harbor for good-faith research that follows this
              policy. No legal action against researchers who report responsibly.
            </p>
          </div>
        </section>

        {/* Privacy commitments */}
        <section className="mt-16">
          <h2 className="font-heading text-2xl italic text-brand-white">
            Privacy commitments
          </h2>
          <div className="mt-4 rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6">
            <ul className="space-y-3 text-sm leading-relaxed text-brand-dim">
              <li>
                <span className="font-semibold text-brand-text">
                  We don&apos;t sell your data.
                </span>{" "}
                Ever. Not to advertisers, brokers, or anyone else.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  We don&apos;t train on customer content.
                </span>{" "}
                Your campaigns, submissions, and customer lists are not used to
                train AI models.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  We delete on request.
                </span>{" "}
                Account deletion purges all customer-identifying data within 30
                days. Anonymized aggregates may be retained for benchmarks.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  We tell you about subpoenas.
                </span>{" "}
                Unless legally prohibited, we notify customers of government
                requests for their data before complying.
              </li>
            </ul>
            <p className="mt-4 text-xs text-brand-muted">
              Read the full{" "}
              <Link
                href="/privacy"
                className="text-brand-cyan hover:underline"
              >
                privacy policy
              </Link>{" "}
              for the legal version of these commitments.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="mt-16">
          <div className="rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-brand-green/5 p-8 text-center sm:p-12">
            <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
              Questions or concerns?
            </h2>
            <p className="mt-3 text-brand-dim">
              Security inquiries:{" "}
              <a
                href="mailto:security@socialperks.app"
                className="font-mono text-brand-cyan hover:underline"
              >
                security@socialperks.app
              </a>
              <br />
              Vendor questionnaires &amp; SOC 2 letters: contact your account
              manager or sales.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
