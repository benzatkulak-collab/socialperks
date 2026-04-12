/**
 * Internationalization (i18n) system.
 *
 * Supports English, Spanish, and Portuguese with string interpolation,
 * pluralization, nested key lookup, locale-aware number/currency/date
 * formatting, localStorage persistence, and automatic browser language
 * detection.
 */

import { useState, useEffect, useCallback } from "react";
import en from "./locales/en";
import es from "./locales/es";
import pt from "./locales/pt";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Locale = "en" | "es" | "pt";

export interface TranslationStrings {
  [key: string]: string | TranslationStrings;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "sp-locale";
const TRANSLATIONS: Record<Locale, TranslationStrings> = { en, es, pt };

// ─── State ──────────────────────────────────────────────────────────────────

let currentLocale: Locale = "en";
const listeners = new Set<(locale: Locale) => void>();

// ─── Core Functions ─────────────────────────────────────────────────────────

/** Set the current locale and persist to localStorage. */
export function setLocale(locale: Locale): void {
  if (!(locale in TRANSLATIONS)) return;
  currentLocale = locale;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // localStorage unavailable (private mode, quota exceeded, etc.)
    }
  }
  // Notify all listeners (React hook subscribers)
  for (const listener of listeners) {
    listener(locale);
  }
}

/** Get the current locale. */
export function getLocale(): Locale {
  return currentLocale;
}

/** Get all supported locales. */
export function getSupportedLocales(): Locale[] {
  return ["en", "es", "pt"];
}

/**
 * Initialize locale from localStorage or browser detection.
 * Should be called once on app startup (client-side only).
 */
export function initLocale(): Locale {
  if (typeof window === "undefined") return "en";

  // Try localStorage first
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && stored in TRANSLATIONS) {
      currentLocale = stored as Locale;
      return currentLocale;
    }
  } catch {
    // localStorage unavailable
  }

  // Fall back to browser detection
  currentLocale = detectLocale();
  return currentLocale;
}

// ─── Translation Function ───────────────────────────────────────────────────

/**
 * Translate a key with optional interpolation and pluralization.
 *
 * Supports nested keys: `t("nav.pricing")` => "Pricing"
 *
 * Overloaded signatures:
 *   - `t(key)` — simple lookup
 *   - `t(key, params)` — with interpolation: `t("common.welcome", { name: "John" })` => "Welcome, John!"
 *   - `t(key, locale)` — explicit locale
 *   - `t(key, locale, params)` — explicit locale + params
 *
 * Pluralization:
 *   When params includes `count`, the system looks for `key_one` / `key_other`
 *   (or `key_zero` for count === 0). Falls back to the base key.
 *   Example: `t("items", { count: 5 })` => "5 items"
 *   Requires `items_one: "{{count}} item"` and `items_other: "{{count}} items"` in locale file.
 */
export function t(key: string): string;
export function t(key: string, params: Record<string, string | number>): string;
export function t(key: string, locale: Locale): string;
export function t(key: string, locale: Locale, params: Record<string, string | number>): string;
export function t(
  key: string,
  localeOrParams?: Locale | Record<string, string | number>,
  maybeParams?: Record<string, string | number>
): string {
  let loc: Locale;
  let params: Record<string, string | number> | undefined;

  if (typeof localeOrParams === "string" && localeOrParams in TRANSLATIONS) {
    loc = localeOrParams as Locale;
    params = maybeParams;
  } else if (typeof localeOrParams === "object" && localeOrParams !== null) {
    loc = currentLocale;
    params = localeOrParams;
  } else {
    loc = currentLocale;
    params = undefined;
  }

  // Handle pluralization: if params.count exists, try suffixed keys
  let resolvedKey = key;
  if (params && "count" in params) {
    const count = Number(params.count);
    const pluralSuffix = getPluralSuffix(loc, count);
    const pluralKey = `${key}_${pluralSuffix}`;

    // Try plural key first, then fall back to base key
    const pluralValue = resolveKey(TRANSLATIONS[loc], pluralKey);
    if (pluralValue !== undefined) {
      resolvedKey = pluralKey;
    } else if (loc !== "en") {
      // Try English fallback for the plural key
      const enPluralValue = resolveKey(TRANSLATIONS.en, pluralKey);
      if (enPluralValue !== undefined) {
        resolvedKey = pluralKey;
      }
    }
  }

  // Try requested locale, then English fallback
  let value = resolveKey(TRANSLATIONS[loc], resolvedKey);
  if (value === undefined && loc !== "en") {
    value = resolveKey(TRANSLATIONS.en, resolvedKey);
  }

  // If plural key didn't work, try original key
  if (value === undefined && resolvedKey !== key) {
    value = resolveKey(TRANSLATIONS[loc], key);
    if (value === undefined && loc !== "en") {
      value = resolveKey(TRANSLATIONS.en, key);
    }
  }

  // Return key if not found
  if (value === undefined) return key;

  // Interpolate params: {{name}} => value
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (_match, param) => {
      return param in params ? String(params[param]) : `{{${param}}}`;
    });
  }

  return value;
}

/**
 * Get the CLDR plural category suffix for a locale and count.
 * Simplified to one/other for the supported locales (en, es, pt all use the same rule).
 */
function getPluralSuffix(locale: Locale, count: number): string {
  // All three supported locales use: 1 = "one", everything else = "other"
  // Zero has special handling if a _zero key exists
  if (count === 0) return "zero";
  if (count === 1) return "one";

  // Suppress unused variable warning
  void locale;

  return "other";
}

function resolveKey(obj: TranslationStrings, key: string): string | undefined {
  const parts = key.split(".");
  let current: TranslationStrings | string = obj;

  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as TranslationStrings)[part] as TranslationStrings | string;
    if (current === undefined) return undefined;
  }

  return typeof current === "string" ? current : undefined;
}

// ─── React Hook ─────────────────────────────────────────────────────────────

/**
 * React hook for translations.
 *
 * Returns `{ t, locale, setLocale }` where `t` uses the current reactive locale.
 * The locale is persisted in localStorage and shared across all hook instances.
 */
export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(currentLocale);

  // Initialize from localStorage on first mount
  useEffect(() => {
    const initialized = initLocale();
    setLocaleState(initialized);
  }, []);

  // Subscribe to global locale changes
  useEffect(() => {
    const handler = (newLocale: Locale) => {
      setLocaleState(newLocale);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const handleSetLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
  }, []);

  // Bind t to the current locale
  const boundT = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      if (params) return t(key, locale, params);
      return t(key, locale);
    },
    [locale]
  );

  return {
    t: boundT,
    locale,
    setLocale: handleSetLocale,
  };
}

// ─── Formatting ─────────────────────────────────────────────────────────────

const LOCALE_MAP: Record<Locale, string> = {
  en: "en-US",
  es: "es-ES",
  pt: "pt-BR",
};

/** Format a number for the current locale. */
export function formatNumberLocale(n: number, locale?: Locale): string {
  return new Intl.NumberFormat(LOCALE_MAP[locale ?? currentLocale]).format(n);
}

/** Format a currency amount for the current locale. */
export function formatCurrencyLocale(
  amount: number,
  currency = "USD",
  locale?: Locale
): string {
  return new Intl.NumberFormat(LOCALE_MAP[locale ?? currentLocale], {
    style: "currency",
    currency,
  }).format(amount);
}

/** Format a date for the current locale. */
export function formatDateLocale(date: Date | string, locale?: Locale): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(LOCALE_MAP[locale ?? currentLocale], {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

// ─── Detection ──────────────────────────────────────────────────────────────

/** Detect browser locale, returning the closest supported locale. */
export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const browserLang = navigator.language?.toLowerCase() ?? "";
  if (browserLang.startsWith("es")) return "es";
  if (browserLang.startsWith("pt")) return "pt";
  return "en";
}
