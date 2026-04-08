/**
 * Internationalization (i18n) system.
 *
 * Supports English, Spanish, and Portuguese with string interpolation,
 * nested key lookup, locale-aware number/currency/date formatting,
 * and automatic browser language detection.
 */

import en from "./locales/en";
import es from "./locales/es";
import pt from "./locales/pt";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Locale = "en" | "es" | "pt";

export interface TranslationStrings {
  [key: string]: string | TranslationStrings;
}

// ─── State ──────────────────────────────────────────────────────────────────

const TRANSLATIONS: Record<Locale, TranslationStrings> = { en, es, pt };
let currentLocale: Locale = "en";

// ─── Core Functions ─────────────────────────────────────────────────────────

/** Set the current locale. */
export function setLocale(locale: Locale): void {
  if (locale in TRANSLATIONS) currentLocale = locale;
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
 * Translate a key with optional interpolation.
 *
 * Supports nested keys: `t("nav.pricing")` → "Pricing"
 * Supports interpolation: `t("welcome", "es", { name: "Maria" })` → "¡Bienvenida, Maria!"
 * Falls back to English, then returns the key itself.
 */
export function t(
  key: string,
  locale?: Locale,
  params?: Record<string, string | number>
): string {
  const loc = locale ?? currentLocale;

  // Try requested locale, then English fallback
  let value = resolveKey(TRANSLATIONS[loc], key);
  if (value === undefined && loc !== "en") {
    value = resolveKey(TRANSLATIONS.en, key);
  }

  // Return key if not found
  if (value === undefined) return key;

  // Interpolate params: {{name}} → value
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (_match, param) => {
      return param in params ? String(params[param]) : `{{${param}}}`;
    });
  }

  return value;
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
