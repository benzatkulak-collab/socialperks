"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LanguageOption {
  locale: Locale;
  flag: string;
  name: string;
}

const LANGUAGES: LanguageOption[] = [
  { locale: "en", flag: "\uD83C\uDDFA\uD83C\uDDF8", name: "English" },
  { locale: "es", flag: "\uD83C\uDDEA\uD83C\uDDF8", name: "Espanol" },
  { locale: "pt", flag: "\uD83C\uDDE7\uD83C\uDDF7", name: "Portugues" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.locale === locale) ?? LANGUAGES[0];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Close on escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open]);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback((selectedLocale: Locale) => {
    setLocale(selectedLocale);
    setOpen(false);
  }, [setLocale]);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select language"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-brand-dim hover:text-brand-white hover:bg-brand-elevated/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 border border-brand-border/50 hover:border-brand-border"
      >
        <span aria-hidden="true">{current.flag}</span>
        <span className="hidden sm:inline">{current.name}</span>
        <svg className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Languages"
          className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-brand-surface border border-brand-border rounded-xl shadow-xl shadow-black/30 overflow-hidden animate-fade-in"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.locale}
              type="button"
              role="option"
              aria-selected={lang.locale === locale}
              onClick={() => handleSelect(lang.locale)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-cyan/40 ${
                lang.locale === locale
                  ? "bg-brand-cyan/10 text-brand-cyan"
                  : "text-brand-dim hover:text-brand-white hover:bg-brand-elevated/50"
              }`}
            >
              <span aria-hidden="true" className="text-base">{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
              {lang.locale === locale && (
                <svg className="w-4 h-4 ml-auto text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
