import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-brand-border/50 bg-brand-bg" role="contentinfo">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" aria-label="Social Perks home">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-brand-cyan to-brand-cyan/60">
              <svg viewBox="0 0 20 20" fill="none" className="w-3 h-3">
                <path d="M10 2L18 10L10 18L2 10L10 2Z" fill="currentColor" className="text-brand-bg" />
              </svg>
            </div>
            <span className="font-heading text-sm italic text-brand-white">
              Social<span className="text-brand-cyan">Perks</span>
            </span>
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-brand-muted">
            <a href="#how-it-works" className="hover:text-brand-text transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-brand-text transition-colors">Pricing</a>
            <Link href="/agents" className="hover:text-brand-text transition-colors">Agents</Link>
            <Link href="/about" className="hover:text-brand-text transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-brand-text transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-brand-text transition-colors">Terms</Link>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-brand-subtle">
            &copy; {new Date().getFullYear()} Social Perks
          </p>
        </div>
      </div>
    </footer>
  );
}
