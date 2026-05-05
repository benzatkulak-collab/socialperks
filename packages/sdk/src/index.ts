/**
 * @socialperks/sdk — Typed wrapper for the Social Perks REST API.
 *
 * The SDK is the canonical way for code (and AI agents) to integrate
 * Social Perks into another app. It exists because every agent-friendly
 * primitive that ever spread (Stripe, Twilio, Resend, Vercel) shipped
 * an SDK first; the REST API is the foundation but the SDK is the
 * shape developers actually pull into their projects.
 *
 * Design rules:
 *   - No runtime deps. Native fetch only. Works in Node, Bun, Deno,
 *     Cloudflare Workers, and the browser (use a publishable key,
 *     not the secret key).
 *   - Strict types from a single source of truth (./types.ts).
 *   - Errors are real classes (SocialPerksError) with discriminated
 *     codes, not opaque strings.
 *   - Every method returns the resource directly, not { data: ... },
 *     because nobody wants to write `result.data.campaign.id`.
 */

export { SocialPerks } from "./client.js";
export { SocialPerksError } from "./errors.js";
export type {
  Campaign,
  CampaignStatus,
  CampaignCreateInput,
  ActionIdea,
  PosterParams,
  EnqueueSmsInput,
  ClientOptions,
} from "./types.js";
