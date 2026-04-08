/**
 * AI Marketing Campaign Agent — Re-export barrel
 *
 * This file preserves backward compatibility for existing imports.
 * The actual implementation lives in ./ai-agent/ sub-modules.
 */

export { marketingAgent } from "./ai-agent/agent";
export type { BusinessProfile, CampaignRecommendation, MarketingPlan, BusinessTypeProfile } from "./ai-agent/types";
