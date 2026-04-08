/**
 * AI Marketing Campaign Agent — BACKEND ONLY
 *
 * A sophisticated marketing agent that analyzes a business profile and
 * generates a complete, tailored marketing plan with campaign recommendations,
 * competitive insights, ROI projections, and phased implementation.
 *
 * This module is imported by API routes only.
 * The frontend calls /api/v1/ai/campaign-agent — it never runs this directly.
 */

export type { BusinessProfile, CampaignRecommendation, MarketingPlan, BusinessTypeProfile } from "./types";
export { marketingAgent } from "./agent";
