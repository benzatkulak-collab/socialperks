import Link from "next/link";

// Footer link order. Creator-side surfaces (/leaderboard, /i/...,
// /agents) intentionally omitted from the public footer — the public
// audience is shop owners, and surfacing creator-marketplace framing
// confuses the value prop. Pages still exist for direct-link landings.
const FOOTER_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "ROI Calculator", href: "/calculator" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Status", href: "/status" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export function Footer() {
  return (
    <footer
      className="border-t border-brand-border/50 bg-brand-bg"
      role="contentinfo"
    >
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group"
            aria-label="Social Perks home"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-brand-cyan to-brand-cyan/60 transition-shadow duration-normal group-hover:shadow-glow-cyan">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="w-3 h-3"
                aria-hidden="true"
              >
                <path
                  d="M10 2L18 10L10 18L2 10L10 2Z"
                  fill="currentColor"
                  className="text-brand-bg"
                />
              </svg>
            </div>
            <span className="font-heading text-sm italic text-brand-white">
              Social<span className="text-brand-cyan">Perks</span>
            </span>
          </Link>

          {/* Links */}
          <nav
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-brand-muted"
            aria-label="Footer navigation"
          >
            {FOOTER_LINKS.map((link) => {
              const isInternal = link.href.startsWith("/");
              const linkClasses =
                "transition-colors duration-fast ease-smooth hover:text-brand-text rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40";
              return isInternal ? (
                <Link key={link.label} href={link.href} className={linkClasses}>
                  {link.label}
                </Link>
              ) : (
                <a key={link.label} href={link.href} className={linkClasses}>
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Copyright */}
          <p className="text-xs text-brand-subtle font-mono">
            &copy; {new Date().getFullYear()} Social Perks
          </p>
        </div>
      </div>
    </footer>
  );
}
