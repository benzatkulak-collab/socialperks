/** Public type contract for @socialperks/sdk. */

export type CampaignStatus = "draft" | "active" | "paused" | "ended";
export type RewardType = "pct" | "dol" | "free";
export type ResourceTier = "essential" | "high_impact" | "growth" | "premium" | "starter";

export interface Campaign {
  id: string;
  businessId: string;
  platformId: string;
  actionId: string;
  rewardType: RewardType;
  rewardValue: string;
  name?: string;
  status: CampaignStatus;
  completions: number;
  createdAt: string;
}

export interface CampaignCreateInput {
  platformId: string;
  actionId: string;
  rewardType: RewardType;
  rewardValue: string;
  name?: string;
}

export interface ActionIdea {
  id: string;
  platform: string;
  label: string;
  effort: number;
  estimatedValue: number;
  tier: ResourceTier;
  type?: "content" | "review" | "engage" | "share" | "referral";
}

export interface PosterParams {
  campaignId: string;
  businessName?: string;
  perk?: string;
}

export interface EnqueueSmsInput {
  businessId: string;
  campaignId: string;
  customerPhone: string;
  /** Defaults to 120 min server-side. */
  delayMinutes?: number;
}

export interface ClientOptions {
  /**
   * API key. Get one with `npx @socialperks/cli init` or from your
   * dashboard at https://socialperks.io/dashboard/api-keys.
   */
  apiKey: string;
  /** Override the API base URL. Defaults to https://socialperks.io. */
  baseUrl?: string;
  /** Optional fetch override (useful for tests + edge runtimes). */
  fetch?: typeof fetch;
  /** Request timeout in ms. Defaults to 30000. */
  timeoutMs?: number;
  /** Retry config. Defaults to 2 retries with exponential backoff. */
  retry?: {
    attempts: number;
    baseDelayMs: number;
  };
}
