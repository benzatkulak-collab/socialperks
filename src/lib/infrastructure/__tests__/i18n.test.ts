import { describe, it, expect, beforeEach } from "vitest";
import {
  LocaleManager,
  MessageFormatter,
  I18nFormatter,
  TranslationManager,
  DynamicLocaleLoader,
} from "../i18n";

// ═══════════════════════════════════════════════════════════════════════════════
// LocaleManager
// ═══════════════════════════════════════════════════════════════════════════════

describe("LocaleManager", () => {
  let manager: LocaleManager;

  beforeEach(() => {
    manager = new LocaleManager();
  });

  it("register adds a new locale", () => {
    manager.register({
      code: "sw-TZ",
      name: "Swahili (Tanzania)",
      nativeName: "Kiswahili",
      direction: "ltr",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "HH:mm",
      numberFormat: { decimal: ".", thousands: ",", currency: "TZS" },
      pluralRules: "one_other",
    });
    expect(manager.get("sw-TZ")).toBeDefined();
    expect(manager.get("sw-TZ")!.name).toBe("Swahili (Tanzania)");
  });

  it("get returns a registered locale", () => {
    const enUS = manager.get("en-US");
    expect(enUS).toBeDefined();
    expect(enUS!.code).toBe("en-US");
    expect(enUS!.direction).toBe("ltr");
  });

  it("get returns undefined for unregistered locale", () => {
    expect(manager.get("xx-XX")).toBeUndefined();
  });

  it("isRtl returns true for ar-SA", () => {
    expect(manager.isRtl("ar-SA")).toBe(true);
  });

  it("isRtl returns false for en-US", () => {
    expect(manager.isRtl("en-US")).toBe(false);
  });

  it("isRtl throws for unregistered locale", () => {
    expect(() => manager.isRtl("xx-XX")).toThrow("not registered");
  });

  it("detectFromHeader parses Accept-Language header", () => {
    const locale = manager.detectFromHeader("fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7");
    expect(locale.code).toBe("fr-FR");
  });

  it("detectFromHeader falls back to prefix match", () => {
    const locale = manager.detectFromHeader("es;q=1.0");
    expect(locale.code).toBe("es-ES");
  });

  it("detectFromHeader returns default for unknown languages", () => {
    const locale = manager.detectFromHeader("xx-YY;q=1.0");
    expect(locale.code).toBe("en-US");
  });

  it("getAll returns all registered locales", () => {
    const all = manager.getAll();
    expect(all.length).toBeGreaterThanOrEqual(10);
  });

  it("setDefault changes the default locale", () => {
    manager.setDefault("fr-FR");
    expect(manager.getDefault().code).toBe("fr-FR");
  });

  it("setDefault throws for unregistered locale", () => {
    expect(() => manager.setDefault("xx-XX")).toThrow("not registered");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MessageFormatter
// ═══════════════════════════════════════════════════════════════════════════════

describe("MessageFormatter", () => {
  let manager: LocaleManager;
  let formatter: MessageFormatter;

  beforeEach(() => {
    manager = new LocaleManager();
    formatter = new MessageFormatter(manager);
  });

  it("simple replacement substitutes variables", () => {
    const result = formatter.format("welcome.greeting", "en-US", { name: "Alice" });
    expect(result).toBe("Welcome, Alice!");
  });

  it("plurals use correct form for count=1", () => {
    const result = formatter.format("campaign.actions_required", "en-US", {
      count: 1,
    });
    expect(result).toBe("1 action required");
  });

  it("plurals use other form for count>1", () => {
    const result = formatter.format("campaign.actions_required", "en-US", {
      count: 5,
    });
    expect(result).toBe("5 actions required");
  });

  it("select uses the matching option", () => {
    const result = formatter.format("welcome.select_role", "en-US", {
      gender: "female",
    });
    expect(result).toContain("She can");
  });

  it("select falls back to other when no match", () => {
    const result = formatter.format("welcome.select_role", "en-US", {
      gender: "nonbinary",
    });
    expect(result).toContain("They can");
  });

  it("missing key returns the key itself", () => {
    const result = formatter.format("nonexistent.key", "en-US");
    expect(result).toBe("nonexistent.key");
  });

  it("format without params returns raw message", () => {
    const result = formatter.format("common.save", "en-US");
    expect(result).toBe("Save");
  });

  it("addCatalog registers a new catalog", () => {
    formatter.addCatalog({
      locale: "test-XX",
      namespace: "default",
      messages: { "hello": "Hello Test" },
      version: 1,
      updatedAt: new Date().toISOString(),
    });

    // Need to register locale first for proper resolution
    manager.register({
      code: "test-XX",
      name: "Test",
      nativeName: "Test",
      direction: "ltr",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "HH:mm",
      numberFormat: { decimal: ".", thousands: ",", currency: "USD" },
      pluralRules: "one_other",
    });

    const result = formatter.format("hello", "test-XX");
    expect(result).toBe("Hello Test");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// I18nFormatter
// ═══════════════════════════════════════════════════════════════════════════════

describe("I18nFormatter", () => {
  let manager: LocaleManager;
  let formatter: I18nFormatter;

  beforeEach(() => {
    manager = new LocaleManager();
    formatter = new I18nFormatter(manager);
  });

  it("formatNumber with en-US locale", () => {
    const result = formatter.formatNumber(1234567.89, "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(result).toBe("1,234,567.89");
  });

  it("formatNumber with de-DE locale uses comma for decimal", () => {
    const result = formatter.formatNumber(1234567.89, "de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(result).toBe("1.234.567,89");
  });

  it("formatNumber throws for unregistered locale", () => {
    expect(() => formatter.formatNumber(100, "xx-XX")).toThrow("not registered");
  });

  it("formatCurrency with USD", () => {
    const result = formatter.formatCurrency(99.99, "USD", "en-US");
    expect(result).toBe("$99.99");
  });

  it("formatCurrency with JPY uses no decimals", () => {
    const result = formatter.formatCurrency(5000, "JPY", "ja-JP");
    expect(result).toContain("5,000");
    expect(result).toContain("\u00a5");
  });

  it("formatDate with short style", () => {
    const date = new Date("2024-03-15T12:00:00Z");
    const result = formatter.formatDate(date, "en-US", "short");
    expect(result).toContain("03");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });

  it("formatDate with medium style", () => {
    const date = new Date("2024-06-20T12:00:00Z");
    const result = formatter.formatDate(date, "en-US", "medium");
    expect(result).toContain("Jun");
    expect(result).toContain("20");
    expect(result).toContain("2024");
  });

  it("formatRelativeTime for past dates", () => {
    const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
    const result = formatter.formatRelativeTime(pastDate, "en-US");
    expect(result).toContain("ago");
  });

  it("formatRelativeTime for future dates", () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 3600 * 1000); // 2 days from now
    const result = formatter.formatRelativeTime(futureDate, "en-US");
    expect(result).toContain("in ");
    expect(result).toContain("day");
  });

  it("formatRelativeTime throws for unregistered locale", () => {
    expect(() => formatter.formatRelativeTime(new Date(), "xx-XX")).toThrow(
      "not registered",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TranslationManager
// ═══════════════════════════════════════════════════════════════════════════════

describe("TranslationManager", () => {
  let localeManager: LocaleManager;
  let messageFormatter: MessageFormatter;
  let translationManager: TranslationManager;

  beforeEach(() => {
    localeManager = new LocaleManager();
    messageFormatter = new MessageFormatter(localeManager);
    translationManager = new TranslationManager(localeManager, messageFormatter);
  });

  it("import JSON adds catalog to the formatter", () => {
    const json = JSON.stringify({
      locale: "es-ES",
      namespace: "default",
      messages: {
        "common.save": "Guardar",
        "common.cancel": "Cancelar",
      },
    });

    const catalog = translationManager.import("json", json);
    expect(catalog.locale).toBe("es-ES");
    expect(catalog.messages["common.save"]).toBe("Guardar");

    // Verify the catalog was registered
    const result = messageFormatter.format("common.save", "es-ES");
    expect(result).toBe("Guardar");
  });

  it("getCompletionStatus returns per-locale stats", () => {
    const status = translationManager.getCompletionStatus();
    expect(Array.isArray(status)).toBe(true);
    expect(status.length).toBeGreaterThan(0);

    // en-US should have 100% since it has the default catalog
    const enUS = status.find((s) => s.locale === "en-US");
    expect(enUS).toBeDefined();
    expect(enUS!.percentage).toBe(100);
  });

  it("getCompletionStatus shows 0 for untranslated locales", () => {
    const status = translationManager.getCompletionStatus();
    // Locales without catalogs should have 0%
    const jaJP = status.find((s) => s.locale === "ja-JP");
    expect(jaJP).toBeDefined();
    expect(jaJP!.percentage).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DynamicLocaleLoader
// ═══════════════════════════════════════════════════════════════════════════════

describe("DynamicLocaleLoader", () => {
  let localeManager: LocaleManager;
  let messageFormatter: MessageFormatter;
  let loader: DynamicLocaleLoader;

  beforeEach(() => {
    localeManager = new LocaleManager();
    messageFormatter = new MessageFormatter(localeManager);
    loader = new DynamicLocaleLoader(localeManager, messageFormatter);
  });

  it("loadLocale loads a registered locale", () => {
    const result = loader.loadLocale("fr-FR");
    expect(result).toBe(true);
    expect(loader.isLoaded("fr-FR")).toBe(true);
  });

  it("isLoaded returns true for default locale", () => {
    expect(loader.isLoaded("en-US")).toBe(true);
  });

  it("isLoaded returns false for unloaded locale", () => {
    expect(loader.isLoaded("ja-JP")).toBe(false);
  });

  it("loadLocale throws for unregistered locale", () => {
    expect(() => loader.loadLocale("xx-XX")).toThrow("not registered");
  });

  it("loadLocale creates stub catalog for locale without translations", () => {
    loader.loadLocale("de-DE");
    // After loading, the locale should have a stub catalog
    const catalog = messageFormatter.exportCatalog("de-DE");
    expect(catalog).not.toBeNull();
    // Stub messages should have [DE] prefix
    const firstKey = Object.keys(catalog!.messages)[0];
    expect(catalog!.messages[firstKey]).toContain("[DE]");
  });
});
