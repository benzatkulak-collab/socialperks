// Campaign tier metadata
export const CAMPAIGN_TIERS = {
  essential: { label: "Essential", color: "#34D399", icon: "◆" },
  high_impact: { label: "High Impact", color: "#FB923C", icon: "▲" },
  growth: { label: "Growth", color: "#22D3EE", icon: "●" },
  premium: { label: "Premium", color: "#F472B6", icon: "★" },
  starter: { label: "Starter", color: "#636B8A", icon: "○" },
} as const;

// Influencer tiers
export const INFLUENCER_TIERS = {
  micro: { label: "Micro", range: "1K-10K", color: "#22D3EE" },
  mid: { label: "Mid", range: "10K-100K", color: "#A78BFA" },
  macro: { label: "Macro", range: "100K-1M", color: "#FBBF24" },
  mega: { label: "Mega", range: "1M+", color: "#F472B6" },
} as const;

// Business sizes
export const BUSINESS_SIZES = {
  solo: { label: "Solo", maxEmployees: 1, description: "Just you" },
  small: { label: "Small", maxEmployees: 10, description: "Small team" },
  medium: { label: "Medium", maxEmployees: 50, description: "Growing business" },
  enterprise: { label: "Enterprise", maxEmployees: Infinity, description: "Large organization" },
} as const;

// Plan definitions
export const PLANS = {
  free: { name: "Free", price: 0, maxCampaigns: 1, maxCompletions: 50 },
  starter: { name: "Starter", price: 29, maxCampaigns: 5, maxCompletions: 500 },
  pro: { name: "Pro", price: 79, maxCampaigns: -1, maxCompletions: -1 },
  enterprise: { name: "Enterprise", price: -1, maxCampaigns: -1, maxCompletions: -1 },
} as const;

// API endpoints (for mobile interop)
export const API_ENDPOINTS = {
  campaigns: "/api/v1/campaigns",
  pricing: "/api/v1/pricing",
  actions: "/api/v1/actions",
  influencers: "/api/v1/influencers",
  benchmarks: "/api/v1/benchmarks",
  aiGenerate: "/api/v1/ai/generate",
  aiRecommend: "/api/v1/ai/recommend",
  auth: "/api/v1/auth",
} as const;

// Brand colors (for mobile interop)
export const COLORS = {
  bg: "#0C0F1A", surface: "#141825", elevated: "#1C2036",
  border: "#2A2F45", subtle: "#3D4362", muted: "#636B8A", dim: "#8E95B4",
  text: "#E8EAF0", white: "#FAFBFD",
  cyan: "#22D3EE", green: "#34D399", amber: "#FBBF24", red: "#F87171",
  purple: "#A78BFA", pink: "#F472B6", orange: "#FB923C",
} as const;
