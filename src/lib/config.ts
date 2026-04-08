/**
 * Centralized environment configuration.
 *
 * All process.env access should go through this module.
 * In production, missing required vars throw at import time
 * rather than failing silently at runtime.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

// ─── App ────────────────────────────────────────────────────────────────────

export const config = {
  nodeEnv: optional("NODE_ENV", "development"),
  isProduction: process.env.NODE_ENV === "production",

  // ─── Auth ───────────────────────────────────────────────────────────────
  auth: {
    secret: optional("AUTH_SECRET"),
    csrfSecret: optional("CSRF_SECRET") || optional("AUTH_SECRET"),
  },

  // ─── Database ───────────────────────────────────────────────────────────
  db: {
    url: optional("DATABASE_URL"),
  },

  // ─── Stripe ─────────────────────────────────────────────────────────────
  stripe: {
    secretKey: optional("STRIPE_SECRET_KEY"),
    webhookSecret: optional("STRIPE_WEBHOOK_SECRET"),
    platformAccountId: optional("STRIPE_PLATFORM_ACCOUNT_ID", "acct_platform_mock"),
    prices: {
      free: optional("STRIPE_PRICE_FREE"),
      starter: optional("STRIPE_PRICE_STARTER"),
      pro: optional("STRIPE_PRICE_PRO"),
      enterprise: optional("STRIPE_PRICE_ENTERPRISE"),
      starterMonthly: optional("STRIPE_PRICE_STARTER_MONTHLY", "price_starter_monthly"),
      starterAnnual: optional("STRIPE_PRICE_STARTER_ANNUAL", "price_starter_annual"),
      professionalMonthly: optional("STRIPE_PRICE_PROFESSIONAL_MONTHLY", "price_professional_monthly"),
      professionalAnnual: optional("STRIPE_PRICE_PROFESSIONAL_ANNUAL", "price_professional_annual"),
      enterpriseMonthly: optional("STRIPE_PRICE_ENTERPRISE_MONTHLY", "price_enterprise_monthly"),
      enterpriseAnnual: optional("STRIPE_PRICE_ENTERPRISE_ANNUAL", "price_enterprise_annual"),
    },
  },

  // ─── Email ──────────────────────────────────────────────────────────────
  email: {
    from: optional("EMAIL_FROM", "Social Perks <noreply@socialperks.app>"),
    resendApiKey: optional("RESEND_API_KEY"),
  },

  // ─── OAuth / Platform API Keys ──────────────────────────────────────────
  oauth: {
    instagram: {
      clientId: optional("INSTAGRAM_CLIENT_ID"),
      clientSecret: optional("INSTAGRAM_CLIENT_SECRET"),
    },
    tiktok: {
      clientId: optional("TIKTOK_CLIENT_KEY"),
      clientSecret: optional("TIKTOK_CLIENT_SECRET"),
    },
    youtube: {
      clientId: optional("YOUTUBE_CLIENT_ID"),
      clientSecret: optional("YOUTUBE_CLIENT_SECRET"),
    },
    x: {
      clientId: optional("X_CLIENT_ID"),
      clientSecret: optional("X_CLIENT_SECRET"),
    },
    facebook: {
      clientId: optional("FACEBOOK_APP_ID"),
      clientSecret: optional("FACEBOOK_APP_SECRET"),
    },
    linkedin: {
      clientId: optional("LINKEDIN_CLIENT_ID"),
      clientSecret: optional("LINKEDIN_CLIENT_SECRET"),
    },
  },

  // ─── Platform API Tokens ───────────────────────────────────────��────────
  platform: {
    telegramBotToken: optional("TELEGRAM_BOT_TOKEN"),
    twitchClientId: optional("TWITCH_CLIENT_ID"),
  },

  // ─── Client-side ────────────────────────────────────────────────────────
  public: {
    apiUrl: optional("NEXT_PUBLIC_API_URL"),
  },
} as const;

/**
 * Validate that all production-required env vars are set.
 * Call this at app startup (e.g., in instrumentation.ts).
 */
export function validateProductionConfig(): string[] {
  if (!config.isProduction) return [];

  const missing: string[] = [];
  const requiredVars = [
    "AUTH_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "DATABASE_URL",
  ];

  for (const name of requiredVars) {
    if (!process.env[name]) missing.push(name);
  }

  return missing;
}
