"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Examples", href: "#examples" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "/contact" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    function handleScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header
      className={`
        fixed left-0 right-0 top-0 z-sticky
        transition-all duration-slow ease-smooth
        ${
          scrolled
            ? "border-b border-brand-border/50 bg-brand-bg/80 backdrop-blur-xl shadow-sm"
            : "bg-transparent"
        }
      `}
      role="banner"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-max focus:px-4 focus:py-2 focus:bg-brand-bg focus:text-brand-cyan focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-cyan"
      >
        Skip to content
      </a>
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group"
          aria-label="Social Perks home"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-cyan to-brand-cyan/60 transition-shadow duration-normal group-hover:shadow-glow-cyan">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path
                d="M10 2L18 10L10 18L2 10L10 2Z"
                fill="currentColor"
                className="text-brand-bg"
              />
              <path
                d="M10 5L15 10L10 15L5 10L10 5Z"
                fill="currentColor"
                className="text-brand-bg/60"
              />
            </svg>
          </div>
          <span className="font-heading text-xl italic text-brand-white">
            Social<span className="text-brand-cyan">Perks</span>
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 lg:flex" role="list">
          {NAV_LINKS.map((link) => {
            const cls = `
              relative rounded-lg px-3 py-2 text-sm text-brand-dim
              transition-all duration-fast ease-smooth
              hover:bg-brand-surface/60 hover:text-brand-text
              active:scale-[0.98]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40
            `;
            return (
              <li key={link.label}>
                {link.href.startsWith("/") ? (
                  <Link href={link.href} className={cls}>
                    {link.label}
                  </Link>
                ) : (
                  <a href={link.href} className={cls}>
                    {link.label}
                  </a>
                )}
              </li>
            );
          })}
        </ul>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/dashboard#login"
            className="
              rounded-lg px-4 py-2 text-sm font-medium text-brand-dim
              transition-all duration-fast ease-smooth
              hover:text-brand-text hover:bg-brand-surface/40
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg
            "
          >
            Log In
          </Link>
          <a
            href="#signup"
            className="
              rounded-xl bg-brand-cyan px-5 py-2.5 text-sm font-semibold text-brand-bg
              transition-all duration-fast ease-smooth
              hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/15 hover:scale-[1.02]
              active:scale-[0.98]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg
            "
          >
            Get Started
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="
            flex h-10 w-10 items-center justify-center rounded-lg
            text-brand-dim
            transition-all duration-fast ease-smooth
            hover:bg-brand-surface/50 hover:text-brand-text
            active:scale-95
            lg:hidden
          "
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className={`transition-transform duration-normal ease-smooth ${
              mobileOpen ? "rotate-90" : ""
            }`}
            aria-hidden="true"
          >
            {mobileOpen ? (
              <path
                d="M5 5L15 15M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M3 5H17M3 10H17M3 15H17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu. `inert` (when closed) removes both screen-reader
          access and tab focus from the subtree in one attribute — no
          need to pair it with aria-hidden. Fixes the Lighthouse
          aria-hidden-focus violation flagged in LIGHTHOUSE_FINDINGS.md. */}
      <div
        ref={mobileMenuRef}
        className={`
          border-t border-brand-border/50 bg-brand-bg/95 backdrop-blur-xl
          lg:hidden
          overflow-hidden transition-all duration-slow ease-smooth
          ${
            mobileOpen
              ? "max-h-[80vh] opacity-100"
              : "max-h-0 opacity-0 pointer-events-none"
          }
        `}
        role={mobileOpen ? "dialog" : undefined}
        aria-label={mobileOpen ? "Mobile navigation menu" : undefined}
        // @ts-expect-error — `inert` is valid HTML, React types lag
        inert={!mobileOpen ? "" : undefined}
      >
        <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
          <ul className="space-y-1" role="list">
            {NAV_LINKS.map((link, i) => {
              const cls = `
                block rounded-lg px-4 py-3 text-base text-brand-dim
                transition-all duration-fast ease-smooth
                hover:bg-brand-surface/50 hover:text-brand-text
                active:bg-brand-elevated
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40
              `;
              return (
                <li
                  key={link.label}
                  className="animate-fade-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {link.href.startsWith("/") ? (
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cls}
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cls}
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-6 flex flex-col gap-3 border-t border-brand-border/50 pt-6">
            <Link
              href="/dashboard#login"
              onClick={() => setMobileOpen(false)}
              className="
                rounded-xl border border-brand-border bg-brand-surface/50
                px-4 py-3 text-center text-sm font-medium text-brand-text
                transition-all duration-fast ease-smooth
                hover:bg-brand-surface hover:border-brand-border-hover
                active:scale-[0.98]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg
              "
            >
              Log In
            </Link>
            <a
              href="#signup"
              onClick={() => setMobileOpen(false)}
              className="
                rounded-xl bg-brand-cyan px-4 py-3 text-center
                text-sm font-semibold text-brand-bg
                transition-all duration-fast ease-smooth
                hover:bg-cyan-300
                active:scale-[0.98]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg
              "
            >
              Get Started
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
