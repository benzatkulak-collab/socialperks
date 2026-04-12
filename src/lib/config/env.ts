/**
 * Environment configuration validation.
 * Validates required env vars at startup and provides typed access.
 */

interface EnvConfig {
  // Required
  AUTH_SECRET: string;
  NODE_ENV: "development" | "production" | "test";

  // Optional with defaults
  PORT: number;
  DATABASE_URL: string | null;
  REDIS_URL: string | null;
  STRIPE_SECRET_KEY: string | null;
  STRIPE_WEBHOOK_SECRET: string | null;
  RESEND_API_KEY: string | null;

  // OAuth (optional)
  GOOGLE_CLIENT_ID: string | null;
  GOOGLE_CLIENT_SECRET: string | null;
  GITHUB_CLIENT_ID: string | null;
  GITHUB_CLIENT_SECRET: string | null;

  // Feature flags
  ENABLE_WEBSOCKETS: boolean;
  ENABLE_REDIS_CACHE: boolean;
}

function required(name: string): string {
  const val = process.env[name];
  if (!val) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `FATAL: ${name} environment variable must be set in production`,
      );
    }
    console.warn(`[config] Missing env var: ${name} (using default for dev)`);
    return "";
  }
  return val;
}

function optional(name: string): string | null {
  return process.env[name] || null;
}

function bool(name: string, defaultValue = false): boolean {
  const val = process.env[name];
  if (!val) return defaultValue;
  return val === "true" || val === "1";
}

function num(name: string, defaultValue: number): number {
  const val = process.env[name];
  if (!val) return defaultValue;
  const n = parseInt(val, 10);
  return isNaN(n) ? defaultValue : n;
}

export const env: EnvConfig = {
  AUTH_SECRET: required("AUTH_SECRET"),
  NODE_ENV: (process.env.NODE_ENV || "development") as EnvConfig["NODE_ENV"],
  PORT: num("PORT", 3000),
  DATABASE_URL: optional("DATABASE_URL"),
  REDIS_URL: optional("REDIS_URL"),
  STRIPE_SECRET_KEY: optional("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: optional("STRIPE_WEBHOOK_SECRET"),
  RESEND_API_KEY: optional("RESEND_API_KEY"),
  GOOGLE_CLIENT_ID: optional("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: optional("GOOGLE_CLIENT_SECRET"),
  GITHUB_CLIENT_ID: optional("GITHUB_CLIENT_ID"),
  GITHUB_CLIENT_SECRET: optional("GITHUB_CLIENT_SECRET"),
  ENABLE_WEBSOCKETS: bool("ENABLE_WEBSOCKETS"),
  ENABLE_REDIS_CACHE: bool("ENABLE_REDIS_CACHE"),
};

export function validateEnv(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!process.env.AUTH_SECRET) missing.push("AUTH_SECRET");

  if (env.NODE_ENV === "production") {
    if (!env.DATABASE_URL) missing.push("DATABASE_URL");
    if (!env.STRIPE_SECRET_KEY)
      warnings.push("STRIPE_SECRET_KEY not set — billing disabled");
    if (!env.RESEND_API_KEY)
      warnings.push("RESEND_API_KEY not set — email disabled");
  }

  return { valid: missing.length === 0, missing, warnings };
}
