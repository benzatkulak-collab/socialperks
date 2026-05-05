// Public types exposed by @social-perks/sdk.
// These mirror the response shapes documented at /api/v1/openapi.

export interface SocialPerksConfig {
  /**
   * Base URL of the Social Perks deployment.
   * @example "https://social-perks.example.com"
   */
  baseUrl: string;

  /** API key. Format: `sp_live_...` or `sp_test_...`. */
  apiKey?: string;

  /** Bearer JWT (alternative to apiKey). */
  bearerToken?: string;

  /** Custom fetch implementation. Defaults to global `fetch`. */
  fetch?: typeof fetch;

  /** Default request timeout in milliseconds. */
  timeoutMs?: number;
}

export type SuccessEnvelope<T> = { success: true; data: T };
export type ErrorEnvelope = {
  success: false;
  error: { code: string; message: string };
};
export type ApiResponse<T> = SuccessEnvelope<T> | ErrorEnvelope;

export interface Action {
  id: string;
  label: string;
  type: "content" | "review" | "engage" | "share" | "referral";
  effort: number;
  value: number;
  incentivizable: boolean;
  platformId: string;
  platformName: string;
  platformIcon: string;
  platformColor: string;
}

export interface PricingEstimate {
  actionId: string;
  platformId: string;
  businessType: string;
  estimatedValueUsd: number;
  recommendedPerk: {
    type: "pct" | "amount" | "free_item";
    value: number;
  };
}

export interface Campaign {
  id: string;
  businessId: string;
  tier: "essential" | "high_impact" | "growth" | "premium" | "starter";
  actionId: string;
  platformId: string;
  rewardType: "pct" | "amount" | "free_item";
  rewardValue: number;
  status: "draft" | "active" | "paused" | "completed";
  createdAt: string;
}

/**
 * Paginated list responses on this API are domain-keyed: each endpoint
 * returns its data under its own key (e.g. `actions`, `influencers`)
 * rather than a generic `items` field. The SDK's list methods normalize
 * to this shape using a generic key parameter.
 */
export interface PaginatedActions {
  actions: Action[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export class SocialPerksError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = "SocialPerksError";
  }
}
