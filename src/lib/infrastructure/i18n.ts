// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Internationalization Engine
//
// Full i18n system with ICU MessageFormat, locale-aware formatting,
// dynamic locale loading, and translation management.
// Supports LTR/RTL, pluralization rules, and BCP 47 locale codes.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Locale Types ─────────────────────────────────────────────────────────────

export type PluralRuleType =
  | "zero_one_other"
  | "one_other"
  | "one_two_few_many_other"
  | "other";

export interface NumberFormatConfig {
  decimal: string;
  thousands: string;
  currency: string;
}

export interface Locale {
  code: string;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  dateFormat: string;
  timeFormat: string;
  numberFormat: NumberFormatConfig;
  pluralRules: PluralRuleType;
}

// ─── Message Catalog Types ────────────────────────────────────────────────────

export interface MessageCatalog {
  locale: string;
  namespace: string;
  messages: Record<string, string>;
  version: number;
  updatedAt: string;
}

// ─── Translation Types ───────────────────────────────────────────────────────

export type TranslationFormat = "json" | "po" | "xliff";

export interface CompletionStatus {
  locale: string;
  totalKeys: number;
  translatedKeys: number;
  percentage: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

// ─── Pre-registered Locales ───────────────────────────────────────────────────

const DEFAULT_LOCALES: Locale[] = [
  {
    code: "en-US",
    name: "English (United States)",
    nativeName: "English (United States)",
    direction: "ltr",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "h:mm A",
    numberFormat: { decimal: ".", thousands: ",", currency: "USD" },
    pluralRules: "one_other",
  },
  {
    code: "es-ES",
    name: "Spanish (Spain)",
    nativeName: "Espa\u00f1ol (Espa\u00f1a)",
    direction: "ltr",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm",
    numberFormat: { decimal: ",", thousands: ".", currency: "EUR" },
    pluralRules: "one_other",
  },
  {
    code: "fr-FR",
    name: "French (France)",
    nativeName: "Fran\u00e7ais (France)",
    direction: "ltr",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm",
    numberFormat: { decimal: ",", thousands: "\u00a0", currency: "EUR" },
    pluralRules: "one_other",
  },
  {
    code: "de-DE",
    name: "German (Germany)",
    nativeName: "Deutsch (Deutschland)",
    direction: "ltr",
    dateFormat: "DD.MM.YYYY",
    timeFormat: "HH:mm",
    numberFormat: { decimal: ",", thousands: ".", currency: "EUR" },
    pluralRules: "one_other",
  },
  {
    code: "pt-BR",
    name: "Portuguese (Brazil)",
    nativeName: "Portugu\u00eas (Brasil)",
    direction: "ltr",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm",
    numberFormat: { decimal: ",", thousands: ".", currency: "BRL" },
    pluralRules: "one_other",
  },
  {
    code: "ja-JP",
    name: "Japanese (Japan)",
    nativeName: "\u65e5\u672c\u8a9e (\u65e5\u672c)",
    direction: "ltr",
    dateFormat: "YYYY/MM/DD",
    timeFormat: "HH:mm",
    numberFormat: { decimal: ".", thousands: ",", currency: "JPY" },
    pluralRules: "other",
  },
  {
    code: "ko-KR",
    name: "Korean (South Korea)",
    nativeName: "\ud55c\uad6d\uc5b4 (\ub300\ud55c\ubbfc\uad6d)",
    direction: "ltr",
    dateFormat: "YYYY.MM.DD",
    timeFormat: "HH:mm",
    numberFormat: { decimal: ".", thousands: ",", currency: "KRW" },
    pluralRules: "other",
  },
  {
    code: "zh-CN",
    name: "Chinese (Simplified)",
    nativeName: "\u4e2d\u6587 (\u7b80\u4f53)",
    direction: "ltr",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "HH:mm",
    numberFormat: { decimal: ".", thousands: ",", currency: "CNY" },
    pluralRules: "other",
  },
  {
    code: "ar-SA",
    name: "Arabic (Saudi Arabia)",
    nativeName: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629 (\u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629)",
    direction: "rtl",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "hh:mm",
    numberFormat: { decimal: "\u066b", thousands: "\u066c", currency: "SAR" },
    pluralRules: "zero_one_other",
  },
  {
    code: "hi-IN",
    name: "Hindi (India)",
    nativeName: "\u0939\u093f\u0928\u094d\u0926\u0940 (\u092d\u093e\u0930\u0924)",
    direction: "ltr",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "h:mm A",
    numberFormat: { decimal: ".", thousands: ",", currency: "INR" },
    pluralRules: "one_other",
  },
];

// ─── Default English Message Catalog ──────────────────────────────────────────

const DEFAULT_EN_MESSAGES: Record<string, string> = {
  // Navigation
  "nav.dashboard": "Dashboard",
  "nav.campaigns": "Campaigns",
  "nav.earnings": "Earnings",
  "nav.profile": "Profile",
  "nav.settings": "Settings",
  "nav.discover": "Discover",
  "nav.logout": "Log Out",

  // Campaign
  "campaign.create": "Create Campaign",
  "campaign.launch": "Launch Campaign",
  "campaign.pause": "Pause Campaign",
  "campaign.end": "End Campaign",
  "campaign.perk_value": "Perk Value",
  "campaign.actions_required": "{count, plural, one {# action required} other {# actions required}}",
  "campaign.effort_level": "Effort Level",
  "campaign.tier": "Campaign Tier",
  "campaign.duration": "Campaign Duration",
  "campaign.status": "Status",
  "campaign.participants": "{count, plural, one {# participant} other {# participants}}",
  "campaign.completions": "{count, plural, one {# completion} other {# completions}}",

  // Submission
  "submission.submit_proof": "Submit Proof",
  "submission.pending_review": "Pending Review",
  "submission.approved": "Approved",
  "submission.rejected": "Rejected",
  "submission.proof_url": "Proof URL",
  "submission.review_time": "Review Time",
  "submission.feedback": "Feedback",

  // Business
  "business.name": "Business Name",
  "business.type": "Business Type",
  "business.active_campaigns": "{count, plural, one {# Active Campaign} other {# Active Campaigns}}",
  "business.total_completions": "{count, plural, one {# Total Completion} other {# Total Completions}}",
  "business.revenue_generated": "Revenue Generated",
  "business.customer_reach": "Customer Reach",

  // Common
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.confirm": "Confirm",
  "common.delete": "Delete",
  "common.search": "Search",
  "common.filter": "Filter",
  "common.loading": "Loading...",
  "common.error": "An error occurred",
  "common.success": "Success",
  "common.back": "Back",
  "common.next": "Next",
  "common.previous": "Previous",
  "common.close": "Close",
  "common.edit": "Edit",
  "common.view": "View",
  "common.retry": "Retry",
  "common.no_results": "No results found",
  "common.required_field": "This field is required",

  // Perk / Wallet
  "perk.earned": "Perk Earned",
  "perk.redeemed": "Redeemed",
  "perk.expired": "Expired",
  "perk.value": "{amount, number, currency}",
  "perk.wallet_balance": "Wallet Balance",

  // Influencer
  "influencer.followers": "{count, plural, one {# follower} other {# followers}}",
  "influencer.engagement_rate": "Engagement Rate",
  "influencer.tier": "Influencer Tier",

  // Welcome / onboarding
  "welcome.greeting": "Welcome, {name}!",
  "welcome.select_role": "{gender, select, male {He can} female {She can} other {They can}} choose a role to get started",
};

// ══════════════════════════════════════════════════════════════════════════════
// Locale Manager
// ══════════════════════════════════════════════════════════════════════════════

export class LocaleManager {
  private locales: Map<string, Locale> = new Map();
  private defaultCode: string = "en-US";

  constructor() {
    // Register all default locales
    for (const locale of DEFAULT_LOCALES) {
      this.locales.set(locale.code, locale);
    }
  }

  /** Register a new locale. */
  register(locale: Locale): void {
    this.locales.set(locale.code, { ...locale });
  }

  /** Get a locale by BCP 47 code. */
  get(code: string): Locale | undefined {
    return this.locales.get(code);
  }

  /** Get all registered locales. */
  getAll(): Locale[] {
    return Array.from(this.locales.values());
  }

  /** Get the default locale. */
  getDefault(): Locale {
    const locale = this.locales.get(this.defaultCode);
    if (!locale) {
      throw new Error(`Default locale "${this.defaultCode}" is not registered`);
    }
    return locale;
  }

  /** Set the default locale code. */
  setDefault(code: string): void {
    if (!this.locales.has(code)) {
      throw new Error(`Cannot set default: locale "${code}" is not registered`);
    }
    this.defaultCode = code;
  }

  /** Check if a locale uses right-to-left text direction. */
  isRtl(code: string): boolean {
    const locale = this.locales.get(code);
    if (!locale) {
      throw new Error(`Locale "${code}" is not registered`);
    }
    return locale.direction === "rtl";
  }

  /**
   * Parse an Accept-Language header and return the best matching locale.
   * Example: "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
   */
  detectFromHeader(acceptLanguage: string): Locale {
    const entries = acceptLanguage
      .split(",")
      .map((part) => {
        const trimmed = part.trim();
        const [lang, qualityStr] = trimmed.split(";q=");
        const quality = qualityStr ? parseFloat(qualityStr) : 1.0;
        return { lang: lang.trim(), quality };
      })
      .sort((a, b) => b.quality - a.quality);

    // Try exact match first, then language-only match
    for (const entry of entries) {
      // Exact match
      if (this.locales.has(entry.lang)) {
        return this.locales.get(entry.lang)!;
      }

      // Language prefix match (e.g., "fr" matches "fr-FR")
      const langPrefix = entry.lang.split("-")[0].toLowerCase();
      for (const [code, locale] of this.locales.entries()) {
        if (code.toLowerCase().startsWith(langPrefix)) {
          return locale;
        }
      }
    }

    // Fallback to default
    return this.getDefault();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ICU MessageFormat Formatter
// ══════════════════════════════════════════════════════════════════════════════

export class MessageFormatter {
  private catalogs: Map<string, MessageCatalog> = new Map();
  private localeManager: LocaleManager;

  constructor(localeManager: LocaleManager) {
    this.localeManager = localeManager;

    // Register default English catalog
    this.addCatalog({
      locale: "en-US",
      namespace: "default",
      messages: DEFAULT_EN_MESSAGES,
      version: 1,
      updatedAt: now(),
    });
  }

  /** Register a message catalog. */
  addCatalog(catalog: MessageCatalog): void {
    const key = `${catalog.locale}:${catalog.namespace}`;
    this.catalogs.set(key, { ...catalog });
  }

  /**
   * Format a message using ICU MessageFormat syntax.
   *
   * Supported patterns:
   * - `{name}` — simple replacement
   * - `{count, plural, one {# item} other {# items}}` — plural
   * - `{gender, select, male {He} female {She} other {They}}` — select
   * - `{amount, number, currency}` — number formatting
   */
  format(
    key: string,
    locale?: string,
    params?: Record<string, string | number>
  ): string {
    const resolvedLocale = locale || this.localeManager.getDefault().code;
    const message = this.resolveMessage(key, resolvedLocale);

    if (!message) {
      // Fallback: return the key itself
      return key;
    }

    if (!params) return message;

    return this.processIcu(message, params, resolvedLocale);
  }

  /** Find keys that exist in the default locale but not in the target locale. */
  getMissingKeys(targetLocale: string): string[] {
    const defaultLocale = this.localeManager.getDefault().code;
    const defaultKeys = this.getAllKeysForLocale(defaultLocale);
    const targetKeys = this.getAllKeysForLocale(targetLocale);

    return defaultKeys.filter((k) => !targetKeys.includes(k));
  }

  /** Export a catalog for a given locale and namespace. */
  exportCatalog(locale: string, namespace: string = "default"): MessageCatalog | null {
    const key = `${locale}:${namespace}`;
    return this.catalogs.get(key) || null;
  }

  /** Get all registered catalog keys for listing. */
  getCatalogKeys(): string[] {
    return Array.from(this.catalogs.keys());
  }

  // ─── Private ICU Parsing ────────────────────────────────────────────────

  private resolveMessage(key: string, locale: string): string | null {
    // Try exact locale + all namespaces
    for (const [catalogKey, catalog] of this.catalogs.entries()) {
      if (catalogKey.startsWith(`${locale}:`)) {
        if (key in catalog.messages) return catalog.messages[key];
      }
    }

    // Fallback to language prefix (e.g., "en" from "en-GB")
    const langPrefix = locale.split("-")[0];
    for (const [catalogKey, catalog] of this.catalogs.entries()) {
      const catalogLang = catalogKey.split(":")[0].split("-")[0];
      if (catalogLang === langPrefix) {
        if (key in catalog.messages) return catalog.messages[key];
      }
    }

    // Final fallback to default locale
    const defaultLocale = this.localeManager.getDefault().code;
    if (locale !== defaultLocale) {
      return this.resolveMessage(key, defaultLocale);
    }

    return null;
  }

  private processIcu(
    message: string,
    params: Record<string, string | number>,
    locale: string
  ): string {
    // Process nested ICU patterns from the inside out
    let result = message;

    // Handle plural: {count, plural, one {# item} other {# items}}
    result = this.processPlural(result, params);

    // Handle select: {gender, select, male {He} female {She} other {They}}
    result = this.processSelect(result, params);

    // Handle number formatting: {amount, number, currency}
    result = this.processNumber(result, params, locale);

    // Handle simple replacements: {name}
    result = this.processSimple(result, params);

    return result;
  }

  private processPlural(
    message: string,
    params: Record<string, string | number>
  ): string {
    // Match: {varName, plural, ...categories...}
    const pluralRegex = /\{(\w+),\s*plural,\s*((?:[^{}]|\{[^{}]*\})*)\}/g;

    return message.replace(pluralRegex, (_match, varName: string, body: string) => {
      const count = Number(params[varName] ?? 0);
      const categories = this.parsePluralCategories(body);

      // Determine which category to use
      let category: string;
      if (count === 0 && categories["zero"]) {
        category = "zero";
      } else if (count === 1 && categories["one"]) {
        category = "one";
      } else if (count === 2 && categories["two"]) {
        category = "two";
      } else if (categories["other"]) {
        category = "other";
      } else {
        // Fallback to first available category
        const keys = Object.keys(categories);
        category = keys.length > 0 ? keys[0] : "other";
      }

      const template = categories[category] || String(count);
      return template.replace(/#/g, String(count));
    });
  }

  private parsePluralCategories(body: string): Record<string, string> {
    const categories: Record<string, string> = {};
    // Match: categoryName {content}
    const catRegex = /(\w+)\s*\{([^}]*)\}/g;
    let match: RegExpExecArray | null;

    while ((match = catRegex.exec(body)) !== null) {
      categories[match[1]] = match[2];
    }

    return categories;
  }

  private processSelect(
    message: string,
    params: Record<string, string | number>
  ): string {
    // Match: {varName, select, ...options...}
    const selectRegex = /\{(\w+),\s*select,\s*((?:[^{}]|\{[^{}]*\})*)\}/g;

    return message.replace(selectRegex, (_match, varName: string, body: string) => {
      const value = String(params[varName] ?? "other");
      const options = this.parsePluralCategories(body); // Same format as plural

      return options[value] || options["other"] || value;
    });
  }

  private processNumber(
    message: string,
    params: Record<string, string | number>,
    locale: string
  ): string {
    // Match: {varName, number, style}
    const numberRegex = /\{(\w+),\s*number(?:,\s*(\w+))?\}/g;

    return message.replace(numberRegex, (_match, varName: string, style?: string) => {
      const value = Number(params[varName] ?? 0);
      const localeData = this.localeManager.get(locale);

      if (style === "currency" && localeData) {
        return this.formatCurrencyValue(value, localeData.numberFormat.currency, locale);
      }

      if (localeData) {
        return this.formatNumberValue(value, localeData);
      }

      return String(value);
    });
  }

  private processSimple(
    message: string,
    params: Record<string, string | number>
  ): string {
    // Match: {varName} (but not already-processed patterns with commas)
    return message.replace(/\{(\w+)\}/g, (_match, varName: string) => {
      if (varName in params) return String(params[varName]);
      return `{${varName}}`;
    });
  }

  private formatNumberValue(value: number, locale: Locale): string {
    const { decimal, thousands } = locale.numberFormat;
    const parts = value.toFixed(0).split(".");
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
    return parts.length > 1 ? `${intPart}${decimal}${parts[1]}` : intPart;
  }

  private formatCurrencyValue(
    value: number,
    currencyCode: string,
    _locale: string
  ): string {
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "\u20ac",
      GBP: "\u00a3",
      JPY: "\u00a5",
      KRW: "\u20a9",
      CNY: "\u00a5",
      BRL: "R$",
      SAR: "\ufdfc",
      INR: "\u20b9",
    };

    const symbol = symbols[currencyCode] || currencyCode;
    const decimals = ["JPY", "KRW"].includes(currencyCode) ? 0 : 2;
    const formatted = value.toFixed(decimals);

    return `${symbol}${formatted}`;
  }

  private getAllKeysForLocale(locale: string): string[] {
    const keys = new Set<string>();
    for (const [catalogKey, catalog] of this.catalogs.entries()) {
      if (catalogKey.startsWith(`${locale}:`)) {
        for (const key of Object.keys(catalog.messages)) {
          keys.add(key);
        }
      }
    }
    return Array.from(keys);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Number / Currency / Date Formatter
// ══════════════════════════════════════════════════════════════════════════════

export class I18nFormatter {
  private localeManager: LocaleManager;

  constructor(localeManager: LocaleManager) {
    this.localeManager = localeManager;
  }

  /** Format a number according to locale conventions. */
  formatNumber(
    value: number,
    locale: string,
    options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
  ): string {
    const localeData = this.localeManager.get(locale);
    if (!localeData) {
      throw new Error(`Locale "${locale}" is not registered`);
    }

    const { decimal, thousands } = localeData.numberFormat;
    const minFrac = options?.minimumFractionDigits ?? 0;
    const maxFrac = options?.maximumFractionDigits ?? 3;
    const fracDigits = Math.max(minFrac, Math.min(maxFrac, this.countDecimalPlaces(value)));

    const fixed = value.toFixed(fracDigits);
    const [intPart, fracPart] = fixed.split(".");

    const sign = intPart.startsWith("-") ? "-" : "";
    const absInt = intPart.replace("-", "");
    const formattedInt = absInt.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);

    if (fracPart && fracDigits > 0) {
      return `${sign}${formattedInt}${decimal}${fracPart}`;
    }
    return `${sign}${formattedInt}`;
  }

  /** Format a currency value with proper symbol placement and decimals. */
  formatCurrency(value: number, currency: string, locale: string): string {
    const localeData = this.localeManager.get(locale);
    if (!localeData) {
      throw new Error(`Locale "${locale}" is not registered`);
    }

    const symbols: Record<string, { symbol: string; position: "before" | "after" }> = {
      USD: { symbol: "$", position: "before" },
      EUR: { symbol: "\u20ac", position: locale.startsWith("en") ? "before" : "after" },
      GBP: { symbol: "\u00a3", position: "before" },
      JPY: { symbol: "\u00a5", position: "before" },
      KRW: { symbol: "\u20a9", position: "before" },
      CNY: { symbol: "\u00a5", position: "before" },
      BRL: { symbol: "R$", position: "before" },
      SAR: { symbol: "\ufdfc", position: "after" },
      INR: { symbol: "\u20b9", position: "before" },
    };

    const currencyInfo = symbols[currency] || { symbol: currency, position: "before" };
    const decimals = ["JPY", "KRW"].includes(currency) ? 0 : 2;
    const formatted = this.formatNumber(value, locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    if (currencyInfo.position === "after") {
      return `${formatted}\u00a0${currencyInfo.symbol}`;
    }
    return `${currencyInfo.symbol}${formatted}`;
  }

  /**
   * Format a date according to locale conventions.
   * @param style - "short" | "medium" | "long" | "full"
   */
  formatDate(
    date: Date | string,
    locale: string,
    style: "short" | "medium" | "long" | "full" = "medium"
  ): string {
    const localeData = this.localeManager.get(locale);
    if (!localeData) {
      throw new Error(`Locale "${locale}" is not registered`);
    }

    const d = typeof date === "string" ? new Date(date) : date;
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const monthAbbrev = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const dayNames = [
      "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
    ];

    const pad2 = (n: number) => String(n).padStart(2, "0");

    switch (style) {
      case "short":
        return this.applyDateFormat(localeData.dateFormat, day, month + 1, year);

      case "medium":
        return `${monthAbbrev[month]} ${day}, ${year}`;

      case "long":
        return `${monthNames[month]} ${day}, ${year}`;

      case "full":
        return `${dayNames[d.getDay()]}, ${monthNames[month]} ${day}, ${year}`;

      default: {
        style satisfies never;
        return `${pad2(month + 1)}/${pad2(day)}/${year}`;
      }
    }
  }

  /** Format a relative time string (e.g., "2 hours ago", "in 3 days"). */
  formatRelativeTime(date: Date | string, locale: string): string {
    const _localeData = this.localeManager.get(locale);
    if (!_localeData) {
      throw new Error(`Locale "${locale}" is not registered`);
    }

    const d = typeof date === "string" ? new Date(date) : date;
    const nowMs = Date.now();
    const diffMs = d.getTime() - nowMs;
    const absDiffMs = Math.abs(diffMs);
    const isFuture = diffMs > 0;

    const seconds = Math.floor(absDiffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    let unit: string;
    let value: number;

    if (seconds < 60) {
      unit = seconds === 1 ? "second" : "seconds";
      value = seconds;
    } else if (minutes < 60) {
      unit = minutes === 1 ? "minute" : "minutes";
      value = minutes;
    } else if (hours < 24) {
      unit = hours === 1 ? "hour" : "hours";
      value = hours;
    } else if (days < 7) {
      unit = days === 1 ? "day" : "days";
      value = days;
    } else if (weeks < 4) {
      unit = weeks === 1 ? "week" : "weeks";
      value = weeks;
    } else if (months < 12) {
      unit = months === 1 ? "month" : "months";
      value = months;
    } else {
      unit = years === 1 ? "year" : "years";
      value = years;
    }

    if (value === 0) return "just now";

    if (isFuture) {
      return `in ${value} ${unit}`;
    }
    return `${value} ${unit} ago`;
  }

  /**
   * Format a list of items with locale-appropriate conjunction.
   * @param type - "conjunction" ("A, B, and C") or "disjunction" ("A, B, or C")
   */
  formatList(
    items: string[],
    locale: string,
    type: "conjunction" | "disjunction" = "conjunction"
  ): string {
    if (items.length === 0) return "";
    if (items.length === 1) return items[0];

    const conjunctions: Record<string, { and: string; or: string }> = {
      "en": { and: "and", or: "or" },
      "es": { and: "y", or: "o" },
      "fr": { and: "et", or: "ou" },
      "de": { and: "und", or: "oder" },
      "pt": { and: "e", or: "ou" },
      "ja": { and: "\u3068", or: "\u307e\u305f\u306f" },
      "ko": { and: "\uadf8\ub9ac\uace0", or: "\ub610\ub294" },
      "zh": { and: "\u548c", or: "\u6216" },
      "ar": { and: "\u0648", or: "\u0623\u0648" },
      "hi": { and: "\u0914\u0930", or: "\u092f\u093e" },
    };

    const langPrefix = locale.split("-")[0];
    const words = conjunctions[langPrefix] || conjunctions["en"];
    const word = type === "conjunction" ? words.and : words.or;

    if (items.length === 2) {
      return `${items[0]} ${word} ${items[1]}`;
    }

    const allButLast = items.slice(0, -1).join(", ");
    const last = items[items.length - 1];
    return `${allButLast}, ${word} ${last}`;
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private applyDateFormat(
    format: string,
    day: number,
    month: number,
    year: number
  ): string {
    const pad2 = (n: number) => String(n).padStart(2, "0");

    return format
      .replace("YYYY", String(year))
      .replace("MM", pad2(month))
      .replace("DD", pad2(day));
  }

  private countDecimalPlaces(value: number): number {
    const str = String(value);
    const dotIndex = str.indexOf(".");
    if (dotIndex < 0) return 0;
    return str.length - dotIndex - 1;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Translation Manager
// ══════════════════════════════════════════════════════════════════════════════

export class TranslationManager {
  private messageFormatter: MessageFormatter;
  private localeManager: LocaleManager;

  constructor(localeManager: LocaleManager, messageFormatter: MessageFormatter) {
    this.localeManager = localeManager;
    this.messageFormatter = messageFormatter;
  }

  /** Import translations from a supported format. */
  import(format: TranslationFormat, data: string): MessageCatalog {
    switch (format) {
      case "json":
        return this.importJson(data);
      case "po":
        return this.importPo(data);
      case "xliff":
        return this.importXliff(data);
      default: {
        const _exhaustive: never = format;
        throw new Error(`Unsupported format: ${_exhaustive}`);
      }
    }
  }

  /** Export translations to a supported format. */
  export(locale: string, format: TranslationFormat): string {
    const catalog = this.messageFormatter.exportCatalog(locale);
    if (!catalog) {
      throw new Error(`No catalog found for locale "${locale}"`);
    }

    switch (format) {
      case "json":
        return this.exportJson(catalog);
      case "po":
        return this.exportPo(catalog);
      case "xliff":
        return this.exportXliff(catalog);
      default: {
        const _exhaustive: never = format;
        throw new Error(`Unsupported format: ${_exhaustive}`);
      }
    }
  }

  /** Get translation completion percentage per locale. */
  getCompletionStatus(): CompletionStatus[] {
    const defaultLocale = this.localeManager.getDefault().code;
    const defaultCatalog = this.messageFormatter.exportCatalog(defaultLocale);
    if (!defaultCatalog) return [];

    const totalKeys = Object.keys(defaultCatalog.messages).length;

    return this.localeManager.getAll().map((locale) => {
      const catalog = this.messageFormatter.exportCatalog(locale.code);
      const translatedKeys = catalog ? Object.keys(catalog.messages).length : 0;

      return {
        locale: locale.code,
        totalKeys,
        translatedKeys,
        percentage: totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0,
      };
    });
  }

  /** Find all keys that need translation for a given locale. */
  findUntranslated(locale: string): string[] {
    return this.messageFormatter.getMissingKeys(locale);
  }

  /** Generate a placeholder translation stub for a key. */
  suggestTranslation(
    key: string,
    sourceLocale: string,
    targetLocale: string
  ): { key: string; source: string; suggestion: string } {
    const sourceCatalog = this.messageFormatter.exportCatalog(sourceLocale);
    const sourceMessage = sourceCatalog?.messages[key] || key;

    // Return a stub with locale prefix indicating it needs human translation
    const targetLang = targetLocale.split("-")[0].toUpperCase();
    return {
      key,
      source: sourceMessage,
      suggestion: `[${targetLang}] ${sourceMessage}`,
    };
  }

  // ─── Import Helpers ───────────────────────────────────────────────────────

  private importJson(data: string): MessageCatalog {
    const parsed = JSON.parse(data) as {
      locale: string;
      namespace?: string;
      messages: Record<string, string>;
    };

    const catalog: MessageCatalog = {
      locale: parsed.locale,
      namespace: parsed.namespace || "default",
      messages: parsed.messages,
      version: 1,
      updatedAt: now(),
    };

    this.messageFormatter.addCatalog(catalog);
    return catalog;
  }

  private importPo(data: string): MessageCatalog {
    // Parse GNU gettext PO format
    const messages: Record<string, string> = {};
    let locale = "unknown";

    // Extract Language header
    const langMatch = data.match(/"Language:\s*([^\\]+)\\n"/);
    if (langMatch) {
      locale = langMatch[1].trim();
    }

    // Extract msgid/msgstr pairs
    const msgRegex = /msgid\s+"([^"]+)"\s*\nmsgstr\s+"([^"]*)"/g;
    let match: RegExpExecArray | null;

    while ((match = msgRegex.exec(data)) !== null) {
      const key = match[1];
      const value = match[2];
      if (key && value) {
        messages[key] = value;
      }
    }

    const catalog: MessageCatalog = {
      locale,
      namespace: "default",
      messages,
      version: 1,
      updatedAt: now(),
    };

    this.messageFormatter.addCatalog(catalog);
    return catalog;
  }

  private importXliff(data: string): MessageCatalog {
    // Parse simplified XLIFF format
    const messages: Record<string, string> = {};
    let locale = "unknown";

    // Extract target-language
    const targetLangMatch = data.match(/target-language="([^"]+)"/);
    if (targetLangMatch) {
      locale = targetLangMatch[1];
    }

    // Extract trans-unit entries
    const unitRegex = /<trans-unit\s+id="([^"]+)"[^>]*>\s*<source>([^<]*)<\/source>\s*<target>([^<]*)<\/target>/g;
    let match: RegExpExecArray | null;

    while ((match = unitRegex.exec(data)) !== null) {
      const key = match[1];
      const target = match[3];
      if (key && target) {
        messages[key] = target;
      }
    }

    const catalog: MessageCatalog = {
      locale,
      namespace: "default",
      messages,
      version: 1,
      updatedAt: now(),
    };

    this.messageFormatter.addCatalog(catalog);
    return catalog;
  }

  // ─── Export Helpers ───────────────────────────────────────────────────────

  private exportJson(catalog: MessageCatalog): string {
    return JSON.stringify(
      {
        locale: catalog.locale,
        namespace: catalog.namespace,
        messages: catalog.messages,
      },
      null,
      2
    );
  }

  private exportPo(catalog: MessageCatalog): string {
    const lines: string[] = [
      `# Translation file for ${catalog.locale}`,
      `# Generated by Social Perks i18n Engine`,
      `msgid ""`,
      `msgstr ""`,
      `"Language: ${catalog.locale}\\n"`,
      `"Content-Type: text/plain; charset=UTF-8\\n"`,
      ``,
    ];

    for (const [key, value] of Object.entries(catalog.messages)) {
      lines.push(`msgid "${key}"`);
      lines.push(`msgstr "${value}"`);
      lines.push(``);
    }

    return lines.join("\n");
  }

  private exportXliff(catalog: MessageCatalog): string {
    const units = Object.entries(catalog.messages)
      .map(
        ([key, value]) =>
          `    <trans-unit id="${key}">\n      <source>${value}</source>\n      <target>${value}</target>\n    </trans-unit>`
      )
      .join("\n");

    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">`,
      `  <file source-language="en-US" target-language="${catalog.locale}" datatype="plaintext">`,
      `    <body>`,
      units,
      `    </body>`,
      `  </file>`,
      `</xliff>`,
    ].join("\n");
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Dynamic Locale Loader
// ══════════════════════════════════════════════════════════════════════════════

export class DynamicLocaleLoader {
  private loadedLocales: Set<string> = new Set();
  private localeManager: LocaleManager;
  private messageFormatter: MessageFormatter;

  constructor(localeManager: LocaleManager, messageFormatter: MessageFormatter) {
    this.localeManager = localeManager;
    this.messageFormatter = messageFormatter;

    // Default locale is always considered loaded
    this.loadedLocales.add(localeManager.getDefault().code);
  }

  /** Lazy-load a locale's data and message catalogs. */
  loadLocale(code: string): boolean {
    const locale = this.localeManager.get(code);
    if (!locale) {
      throw new Error(`Locale "${code}" is not registered in LocaleManager`);
    }

    if (this.loadedLocales.has(code)) {
      return true; // Already loaded
    }

    // In production, this would fetch from a CDN or API.
    // For now, we register a stub catalog if none exists.
    const existingCatalog = this.messageFormatter.exportCatalog(code);
    if (!existingCatalog) {
      // Create a placeholder catalog with the locale code prefix
      const defaultCatalog = this.messageFormatter.exportCatalog(
        this.localeManager.getDefault().code
      );
      if (defaultCatalog) {
        const stubMessages: Record<string, string> = {};
        const langPrefix = code.split("-")[0].toUpperCase();
        for (const key of Object.keys(defaultCatalog.messages)) {
          stubMessages[key] = `[${langPrefix}] ${defaultCatalog.messages[key]}`;
        }
        this.messageFormatter.addCatalog({
          locale: code,
          namespace: "default",
          messages: stubMessages,
          version: 1,
          updatedAt: now(),
        });
      }
    }

    this.loadedLocales.add(code);
    return true;
  }

  /** Check if a locale's data has been loaded. */
  isLoaded(code: string): boolean {
    return this.loadedLocales.has(code);
  }

  /** Preload multiple locales at once. */
  preload(codes: string[]): { loaded: string[]; failed: string[] } {
    const loaded: string[] = [];
    const failed: string[] = [];

    for (const code of codes) {
      try {
        this.loadLocale(code);
        loaded.push(code);
      } catch {
        failed.push(code);
      }
    }

    return { loaded, failed };
  }

  /** Get list of currently loaded locale codes. */
  getLoadedLocales(): string[] {
    return Array.from(this.loadedLocales);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Factory — Quick Setup
// ══════════════════════════════════════════════════════════════════════════════

/** Create a fully initialized i18n system with all managers wired together. */
export function createI18nSystem(): {
  localeManager: LocaleManager;
  messageFormatter: MessageFormatter;
  formatter: I18nFormatter;
  translationManager: TranslationManager;
  localeLoader: DynamicLocaleLoader;
} {
  const localeManager = new LocaleManager();
  const messageFormatter = new MessageFormatter(localeManager);
  const formatter = new I18nFormatter(localeManager);
  const translationManager = new TranslationManager(localeManager, messageFormatter);
  const localeLoader = new DynamicLocaleLoader(localeManager, messageFormatter);

  return {
    localeManager,
    messageFormatter,
    formatter,
    translationManager,
    localeLoader,
  };
}
