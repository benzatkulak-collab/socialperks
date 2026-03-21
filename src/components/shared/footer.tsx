import Link from "next/link";

interface FooterLink {
  label: string;
  href: string;
  comingSoon?: boolean;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "How It Works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "For Businesses", href: "#businesses" },
      { label: "For Influencers", href: "#influencers" },
      { label: "Enterprise", href: "#enterprise" },
      { label: "API", href: "#api" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "#blog", comingSoon: true },
      { label: "Careers", href: "#careers", comingSoon: true },
      { label: "Press", href: "#press", comingSoon: true },
      { label: "Contact", href: "#contact", comingSoon: true },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#docs", comingSoon: true },
      { label: "Help Center", href: "#help", comingSoon: true },
      { label: "Community", href: "#community", comingSoon: true },
      { label: "Case Studies", href: "#case-studies", comingSoon: true },
      { label: "Webinars", href: "#webinars", comingSoon: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "FTC Compliance", href: "#ftc", comingSoon: true },
      { label: "Cookie Policy", href: "#cookies", comingSoon: true },
    ],
  },
];

const SOCIAL_LINKS = [
  { label: "X / Twitter", href: "#x", icon: "\u{1D54F}" },
  { label: "LinkedIn", href: "#linkedin", icon: "in" },
  { label: "Instagram", href: "#instagram", icon: "IG" },
];

function FooterLinkItem({ link }: { link: FooterLink }) {
  if (link.comingSoon) {
    return (
      <span
        className="cursor-default text-sm text-brand-subtle"
        aria-disabled="true"
        title="Coming soon"
      >
        {link.label}
      </span>
    );
  }

  // Internal routes (start with /) use Next.js Link
  if (link.href.startsWith("/")) {
    return (
      <Link
        href={link.href}
        className="text-sm text-brand-muted transition-colors hover:text-brand-text"
      >
        {link.label}
      </Link>
    );
  }

  // Anchor links or external
  return (
    <a
      href={link.href}
      className="text-sm text-brand-muted transition-colors hover:text-brand-text"
    >
      {link.label}
    </a>
  );
}

export function Footer() {
  return (
    <footer
      className="border-t border-brand-border/50 bg-brand-bg"
      role="contentinfo"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        {/* Top section */}
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-8">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link
              href="/"
              className="mb-4 flex items-center gap-2"
              aria-label="Social Perks home"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-cyan/10">
                <span
                  className="font-heading text-lg text-brand-cyan"
                  aria-hidden="true"
                >
                  S
                </span>
              </div>
              <span className="font-heading text-xl italic text-brand-white">
                Social Perks
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-brand-muted">
              Turn your customers into your marketing team. Perks for posts, reviews, and referrals.
            </p>

            {/* Social links */}
            <div className="mt-6 flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border/50 bg-brand-surface/30 text-xs font-semibold text-brand-dim transition-colors hover:border-brand-border hover:text-brand-text"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-4">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-text">
                  {column.title}
                </h3>
                <ul className="space-y-3" role="list">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <FooterLinkItem link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-brand-border/50 pt-8 sm:flex-row">
          <p className="text-xs text-brand-muted">
            &copy; {new Date().getFullYear()} Social Perks. All rights reserved.
          </p>
          <p className="text-xs text-brand-subtle">
            Built for businesses that believe in the power of word-of-mouth.
          </p>
        </div>
      </div>
    </footer>
  );
}
