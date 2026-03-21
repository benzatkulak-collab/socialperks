"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Examples", href: "#examples" },
  { label: "Pricing", href: "#pricing" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20);
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
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-brand-border/50 bg-brand-bg/80 backdrop-blur-xl"
          : "bg-transparent"
      }`}
      role="banner"
    >
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="Social Perks home"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-cyan/10">
            <span className="font-heading text-lg text-brand-cyan" aria-hidden="true">
              S
            </span>
          </div>
          <span className="font-heading text-xl italic text-brand-white">
            Social Perks
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 lg:flex" role="list">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm text-brand-dim transition-colors hover:bg-brand-surface/50 hover:text-brand-text"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="#login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-brand-dim transition-colors hover:text-brand-text"
          >
            Log In
          </a>
          <a
            href="#signup"
            className="rounded-lg bg-brand-cyan px-5 py-2 text-sm font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/20 focus:outline-none focus:ring-2 focus:ring-brand-cyan/50 focus:ring-offset-2 focus:ring-offset-brand-bg"
          >
            Get Started
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-brand-dim transition-colors hover:bg-brand-surface/50 hover:text-brand-text lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="transition-transform"
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

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="border-t border-brand-border/50 bg-brand-bg/95 backdrop-blur-xl lg:hidden"
          role="dialog"
          aria-label="Mobile navigation menu"
        >
          <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
            <ul className="space-y-1" role="list">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg px-4 py-3 text-base text-brand-dim transition-colors hover:bg-brand-surface/50 hover:text-brand-text"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-3 border-t border-brand-border/50 pt-6">
              <a
                href="#login"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-brand-border bg-brand-surface/50 px-4 py-3 text-center text-sm font-medium text-brand-text transition-colors hover:bg-brand-surface"
              >
                Log In
              </a>
              <a
                href="#signup"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg bg-brand-cyan px-4 py-3 text-center text-sm font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
