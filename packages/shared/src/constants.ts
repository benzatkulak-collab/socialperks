// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Shared Constants
//
// Single source of truth for magic values used across the codebase.
// Import from here instead of hardcoding IDs, statuses, or thresholds.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Platform Identifiers ────────────────────────────────────────────────────

/** Canonical short IDs for every supported social platform. */
export const PLATFORM_IDS = {
  INSTAGRAM: 'ig',
  TIKTOK: 'tt',
  GOOGLE: 'ggl',
  YELP: 'yelp',
  FACEBOOK: 'fb',
  YOUTUBE: 'yt',
  TWITTER: 'tw',
  LINKEDIN: 'li',
  PINTEREST: 'pin',
  SNAPCHAT: 'snap',
  REDDIT: 'reddit',
  NEXTDOOR: 'nd',
  TRIPADVISOR: 'ta',
  FOURSQUARE: '4sq',
  THREADS: 'threads',
} as const;

export type PlatformId = typeof PLATFORM_IDS[keyof typeof PLATFORM_IDS];

// ─── Campaign Tier Identifiers ───────────────────────────────────────────────

/** Canonical tier slugs used in API responses and filtering. */
export const CAMPAIGN_TIER_IDS = {
  ESSENTIAL: 'essential',
  HIGH_IMPACT: 'high-impact',
  GROWTH: 'growth',
  PREMIUM: 'premium',
  STARTER: 'starter',
} as const;

export type CampaignTierId = typeof CAMPAIGN_TIER_IDS[keyof typeof CAMPAIGN_TIER_IDS];

// ─── Follower Bonus Tiers ────────────────────────────────────────────────────

/** Bonus multipliers by follower count — ordered descending for first-match lookup. */
export const FOLLOWER_BONUS_TIERS = [
  { min: 50_000, bonus: 0.25, label: '50K+' },
  { min: 10_000, bonus: 0.15, label: '10K+' },
  { min: 2_000, bonus: 0.10, label: '2K+' },
  { min: 500, bonus: 0.05, label: '500+' },
  { min: 0, bonus: 0, label: 'Anyone' },
] as const;

// ─── Status Enums ────────────────────────────────────────────────────────────

/** Valid submission lifecycle statuses. */
export const SUBMISSION_STATUSES = ['pending', 'approved', 'rejected', 'expired'] as const;
export type SubmissionStatus = typeof SUBMISSION_STATUSES[number];

/** Valid campaign lifecycle statuses. */
export const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed', 'cancelled'] as const;
export type CampaignStatus = typeof CAMPAIGN_STATUSES[number];

// ─── API Defaults ────────────────────────────────────────────────────────────

/** Default values for API pagination, body limits, and timeouts. */
export const API_DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_BODY_SIZE: 1_048_576, // 1 MB
  REQUEST_TIMEOUT: 10_000,  // 10 s
} as const;

// ─── Rate Limiting ───────────────────────────────────────────────────────────

/** Per-tier rate limit configurations. */
export const RATE_LIMIT_CONFIGS = {
  AUTH: { maxRequests: 5, windowMs: 60_000 },
  API: { maxRequests: 30, windowMs: 60_000 },
  PUBLIC: { maxRequests: 120, windowMs: 60_000 },
} as const;

// ─── Tier Colors ─────────────────────────────────────────────────────────────

/** Hex color mapping for campaign and influencer tiers (used in UI badges/borders). */
export const TIER_COLORS: Record<string, string> = {
  essential: '#34D399',
  'high-impact': '#FB923C',
  growth: '#22D3EE',
  premium: '#F472B6',
  starter: '#9CA3AF',
  micro: '#22D3EE',
  mid: '#A78BFA',
  macro: '#F472B6',
  mega: '#FBBF24',
} as const;

// ─── Campaign Tier Metadata ──────────────────────────────────────────────────

// Campaign tier metadata
export const CAMPAIGN_TIERS = {
  essential: { label: "Essential", color: "#34D399", icon: "◆" },
  high_impact: { label: "High Impact", color: "#FB923C", icon: "▲" },
  growth: { label: "Growth", color: "#22D3EE", icon: "●" },
  premium: { label: "Premium", color: "#F472B6", icon: "★" },
  starter: { label: "Starter", color: "#636B8A", icon: "○" },
} as const;

// ─── Influencer Tier Metadata ─────────────────────────────────────────────────

// Influencer tiers
export const INFLUENCER_TIERS = {
  micro: { label: "Micro", range: "1K-10K", color: "#22D3EE" },
  mid: { label: "Mid", range: "10K-100K", color: "#A78BFA" },
  macro: { label: "Macro", range: "100K-1M", color: "#FBBF24" },
  mega: { label: "Mega", range: "1M+", color: "#F472B6" },
} as const;

// ─── Business Sizes ──────────────────────────────────────────────────────────

// Business sizes
export const BUSINESS_SIZES = {
  solo: { label: "Solo", maxEmployees: 1, description: "Just you" },
  small: { label: "Small", maxEmployees: 10, description: "Small team" },
  medium: { label: "Medium", maxEmployees: 50, description: "Growing business" },
  enterprise: { label: "Enterprise", maxEmployees: Infinity, description: "Large organization" },
} as const;

// ─── Plan Definitions ────────────────────────────────────────────────────────

// Plan definitions
export const PLANS = {
  free: { name: "Free", price: 0, maxCampaigns: 1, maxCompletions: 50 },
  starter: { name: "Starter", price: 29, maxCampaigns: 5, maxCompletions: 500 },
  pro: { name: "Pro", price: 79, maxCampaigns: -1, maxCompletions: -1 },
  enterprise: { name: "Enterprise", price: -1, maxCampaigns: -1, maxCompletions: -1 },
} as const;

// ─── API Endpoints ───────────────────────────────────────────────────────────

// API endpoints (for mobile interop)
export const API_ENDPOINTS = {
  campaigns: "/api/v1/campaigns",
  pricing: "/api/v1/pricing",
  actions: "/api/v1/actions",
  influencers: "/api/v1/influencers",
  benchmarks: "/api/v1/benchmarks",
  aiGenerate: "/api/v1/ai/generate",
  aiRecommend: "/api/v1/ai/recommend",
  submissions: "/api/v1/submissions",
  submissionsReview: "/api/v1/submissions/review",
  auth: "/api/v1/auth",
} as const;

// ─── Brand Colors ────────────────────────────────────────────────────────────

// Brand colors (for mobile interop)
export const COLORS = {
  bg: "#0C0F1A", surface: "#141825", elevated: "#1C2036",
  border: "#2A2F45", subtle: "#3D4362", muted: "#636B8A", dim: "#8E95B4",
  text: "#E8EAF0", white: "#FAFBFD",
  cyan: "#22D3EE", green: "#34D399", amber: "#FBBF24", red: "#F87171",
  purple: "#A78BFA", pink: "#F472B6", orange: "#FB923C",
} as const;
