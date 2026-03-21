// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — The Marketing Value Protocol
// Complete Type Definitions
// ══════════════════════════════════════════════════════════════════════════════

// ─── Primitives & Enums ──────────────────────────────────────────────────────

/** Supported marketing action types across all platforms. */
export type ActionType = "content" | "review" | "engage" | "share" | "referral";

/** Campaign tier indicating priority and expected ROI. */
export type CampaignTier = "essential" | "high_impact" | "growth" | "premium" | "starter";

/** User role within the platform. */
export type UserRole = "business_owner" | "influencer" | "admin" | "enterprise_manager";

/** Business size classification. */
export type BusinessSize = "solo" | "small" | "medium" | "enterprise";

/** Subscription plan tier. */
export type BusinessPlan = "free" | "starter" | "pro" | "enterprise";

/** Influencer tier based on follower count and engagement. */
export type InfluencerTier = "micro" | "mid" | "macro" | "mega";

/** Discount denomination type. */
export type DiscountType = "pct" | "dol";

/** Campaign lifecycle status. */
export type CampaignStatus = "active" | "paused" | "ended";

/** Submission review status. */
export type SubmissionStatus = "pending" | "approved" | "rejected" | "expired";

/** Perk lifecycle status. */
export type PerkStatus = "available" | "redeemed" | "expired";

/** Proof type for campaign submission verification. */
export type ProofType = "screenshot" | "url" | "video" | "api_verified";

/** Notification delivery channel. */
export type NotificationType =
  | "campaign_launched"
  | "submission_received"
  | "submission_approved"
  | "submission_rejected"
  | "perk_earned"
  | "perk_expiring"
  | "campaign_ended"
  | "new_influencer_match"
  | "agent_query"
  | "system";

/** Analytics event type. */
export type AnalyticsEventType =
  | "campaign_view"
  | "campaign_launch"
  | "campaign_complete"
  | "submission_create"
  | "submission_approve"
  | "perk_redeem"
  | "influencer_signup"
  | "business_signup"
  | "agent_query"
  | "api_call"
  | "page_view";

/** Entity types used in polymorphic references. */
export type EntityType =
  | "campaign"
  | "business"
  | "influencer"
  | "user"
  | "submission"
  | "perk"
  | "agent";

/** Deep link target screens for mobile. */
export type DeepLinkTarget =
  | "campaign_detail"
  | "business_profile"
  | "influencer_profile"
  | "submission"
  | "perk_wallet"
  | "settings";

// ─── Platform & Action Types ─────────────────────────────────────────────────

/** A social media platform with its available marketing actions. */
export interface Platform {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly color: string;
  readonly actions: readonly Action[];
}

/** A single marketing action a customer can perform on a platform. */
export interface Action {
  readonly id: string;
  readonly label: string;
  readonly type: ActionType;
  /** Effort level from 0 (trivial) to 5 (significant). */
  readonly effort: number;
  /** Estimated dollar value per completion. */
  readonly value: number;
  /** Whether this action can be legally incentivized. Review platforms like Google, Yelp, TripAdvisor prohibit incentivized reviews. */
  readonly incentivizable: boolean;
  readonly description?: string;
  /** Populated when action is flattened from its parent platform. */
  readonly platformId?: string;
  readonly platformName?: string;
  readonly platformIcon?: string;
  readonly platformColor?: string;
}

/** Metadata for an action type category used in filters and UI. */
export interface ActionCategory {
  readonly id: ActionType;
  readonly label: string;
  readonly icon: string;
  readonly color: string;
}

// ─── Follower Tiers ──────────────────────────────────────────────────────────

/** Bonus perk tier based on customer follower count. */
export interface FollowerTier {
  readonly label: string;
  readonly minFollowers: number;
  /** Additional percentage or dollar bonus on top of base perk. */
  readonly bonus: number;
  readonly color: string;
}

/** Display metadata for a campaign tier. */
export interface TierMeta {
  readonly label: string;
  readonly color: string;
  readonly icon: string;
}

// ─── Campaign Types ──────────────────────────────────────────────────────────

/** An AI-suggested campaign template before it is launched. */
export interface Campaign {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Action IDs required for this campaign. */
  readonly actions: readonly string[];
  readonly discountValue: number;
  readonly discountType: DiscountType;
  readonly category: string;
  readonly tier: CampaignTier;
  /** AI-generated reasoning for why this campaign was suggested. */
  readonly aiReason: string;
}

/** A campaign that has been configured and launched by a business. */
export interface LaunchedCampaign {
  readonly id: string;
  readonly businessId: string;
  readonly name: string;
  readonly description: string;
  readonly actions: readonly string[];
  readonly discountValue: number;
  readonly discountType: DiscountType;
  readonly guidelines?: string;
  readonly maxCompletions?: number | null;
  readonly expiresInDays: number;
  readonly useTiers: boolean;
  readonly status: CampaignStatus;
  readonly createdAt: string;
  /** ID of the AI-suggested campaign this was created from, if any. */
  readonly fromSuggestion?: string;
  /** Total number of approved submissions. */
  readonly completionCount?: number;
  /** Budget cap in dollars; null means unlimited. */
  readonly budgetCap?: number | null;
  /** Running total of perk value distributed. */
  readonly budgetUsed?: number;
  /** FTC disclosure requirements auto-injected per platform. */
  readonly ftcDisclosures?: readonly string[];
  /** Tags for filtering and categorization. */
  readonly tags?: readonly string[];
}

// ─── Business Types ──────────────────────────────────────────────────────────

/** Social media link for a business profile. */
export interface SocialLink {
  readonly platform: string;
  readonly url: string;
  readonly handle?: string;
}

/** A business registered on the platform. */
export interface Business {
  readonly id: string;
  readonly name: string;
  /** Business type / category (e.g., "Yoga Studio", "Restaurant"). */
  readonly type: string;
  readonly email: string;
  /** Legacy PIN-based auth. Will be replaced by proper auth. */
  readonly pin: string;
  readonly avatar: string;
  /** Industry vertical for benchmarking. */
  readonly industry?: string;
  /** Business size classification. */
  readonly size: BusinessSize;
  /** Physical location or service area. */
  readonly location?: string;
  readonly website?: string;
  /** Social media profiles for the business. */
  readonly socialLinks: readonly SocialLink[];
  /** Subscription plan tier. */
  readonly plan: BusinessPlan;
  /** ISO 8601 timestamp. */
  readonly createdAt: string;
  /** Business description shown to influencers. */
  readonly description?: string;
  /** Average customer rating aggregated from reviews. */
  readonly avgRating?: number;
  /** Total number of launched campaigns. */
  readonly campaignCount?: number;
  /** Whether the business has been verified by the platform. */
  readonly verified?: boolean;
}

// ─── User Types ──────────────────────────────────────────────────────────────

/** A user account on the platform. */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
  /** Associated business ID for business_owner and enterprise_manager roles. */
  readonly businessId?: string;
  /** Associated influencer profile ID for influencer role. */
  readonly influencerId?: string;
  readonly avatarUrl?: string;
  /** ISO 8601 timestamp. */
  readonly createdAt: string;
  /** Whether the email has been verified. */
  readonly emailVerified?: boolean;
  /** Last login timestamp. */
  readonly lastLoginAt?: string;
  /** User preferences and settings. */
  readonly preferences?: UserPreferences;
}

/** User-configurable preferences. */
export interface UserPreferences {
  readonly emailNotifications: boolean;
  readonly pushNotifications: boolean;
  readonly timezone?: string;
  readonly locale?: string;
  readonly theme?: "light" | "dark" | "system";
}

// ─── Influencer Types ────────────────────────────────────────────────────────

/** An influencer's connection to a specific social platform. */
export interface InfluencerPlatform {
  /** Platform ID matching Platform.id (e.g., "ig", "tt"). */
  readonly platformId: string;
  /** Handle or username on that platform. */
  readonly handle: string;
  readonly followers: number;
  /** Engagement rate as a decimal (e.g., 0.045 = 4.5%). */
  readonly engagementRate: number;
  /** Whether ownership has been verified via API or manual review. */
  readonly verified: boolean;
}

/** An influencer's rate card with pricing per action type. */
export interface RateCard {
  /** Price per action type in dollars. */
  readonly rates: Readonly<Record<ActionType, number>>;
  /** Currency code (default: USD). */
  readonly currency?: string;
  /** Whether rates are negotiable. */
  readonly negotiable?: boolean;
  /** Minimum campaign budget the influencer will accept. */
  readonly minimumBudget?: number;
}

/** A portfolio item showcasing past work. */
export interface PortfolioItem {
  readonly id: string;
  /** Platform the content was posted on. */
  readonly platform: string;
  readonly contentUrl: string;
  readonly thumbnailUrl?: string;
  /** Performance metrics for the content. */
  readonly metrics: ContentMetrics;
  /** Campaign this content was created for, if any. */
  readonly campaignId?: string;
  /** Brief description of the content. */
  readonly caption?: string;
  /** ISO 8601 timestamp when the content was posted. */
  readonly postedAt?: string;
}

/** Engagement metrics for a piece of content. */
export interface ContentMetrics {
  readonly views?: number;
  readonly likes?: number;
  readonly comments?: number;
  readonly shares?: number;
  readonly saves?: number;
  readonly clicks?: number;
  /** Engagement rate as a decimal. */
  readonly engagementRate?: number;
  /** Estimated reach. */
  readonly reach?: number;
  /** Estimated impressions. */
  readonly impressions?: number;
}

/** An influencer profile on the platform. */
export interface Influencer {
  readonly id: string;
  /** Associated user account ID. */
  readonly userId: string;
  /** Public display name. */
  readonly displayName: string;
  /** Bio / about text. */
  readonly bio: string;
  /** Connected social platforms. */
  readonly platforms: readonly InfluencerPlatform[];
  /** Aggregate follower count across all platforms. */
  readonly followerCount: number;
  /** Average engagement rate across platforms as a decimal. */
  readonly engagementRate: number;
  /** Content niches (e.g., ["food", "fitness", "travel"]). */
  readonly niches: readonly string[];
  /** Geographic location or market. */
  readonly location: string;
  readonly rateCard: RateCard;
  readonly portfolio: readonly PortfolioItem[];
  /** Whether the influencer has been verified by the platform. */
  readonly verified: boolean;
  /** Size tier based on follower count. */
  readonly tier: InfluencerTier;
  /** ISO 8601 timestamp. */
  readonly createdAt: string;
  /** Average response time to campaign invitations in hours. */
  readonly avgResponseTimeHours?: number;
  /** Campaign completion rate as a decimal. */
  readonly completionRate?: number;
  /** Total number of campaigns completed. */
  readonly campaignsCompleted?: number;
}

// ─── Submission & Perk Types ─────────────────────────────────────────────────

/** A campaign submission by a user (customer or influencer). */
export interface CampaignSubmission {
  readonly id: string;
  readonly campaignId: string;
  /** User who submitted the proof. */
  readonly userId: string;
  /** The specific action this submission is for. */
  readonly actionId: string;
  /** URL to the proof (screenshot, post URL, etc.). */
  readonly proofUrl: string;
  /** Type of proof submitted. */
  readonly proofType: ProofType;
  readonly status: SubmissionStatus;
  /** ISO 8601 timestamp. */
  readonly submittedAt: string;
  /** ISO 8601 timestamp when reviewed by business or auto-verification. */
  readonly reviewedAt?: string;
  /** Note from the reviewer explaining approval or rejection. */
  readonly reviewNote?: string;
  /** Platform the action was performed on. */
  readonly platformId?: string;
  /** Extracted metrics from the proof, if available. */
  readonly metrics?: ContentMetrics;
  /** Whether this was verified via platform API rather than manual review. */
  readonly autoVerified?: boolean;
}

/** An individual perk earned by completing a campaign action. */
export interface EarnedPerk {
  readonly id: string;
  readonly campaignId: string;
  /** Dollar or percentage value of the perk. */
  readonly value: number;
  /** Whether value is a percentage or dollar amount. */
  readonly type: DiscountType;
  readonly status: PerkStatus;
  /** ISO 8601 timestamp. */
  readonly earnedAt: string;
  /** ISO 8601 timestamp when the perk was redeemed. */
  readonly redeemedAt?: string;
  /** ISO 8601 timestamp when the perk expires. */
  readonly expiresAt: string;
  /** Redemption code or QR code data. */
  readonly redemptionCode?: string;
  /** Description of what the perk is for. */
  readonly description?: string;
}

/** A user's perk wallet for a specific business. */
export interface PerkWallet {
  readonly id: string;
  readonly userId: string;
  readonly businessId: string;
  readonly earnedPerks: readonly EarnedPerk[];
  /** Total available perk value (unredeemed, unexpired). */
  readonly totalAvailable?: number;
  /** Total lifetime perk value earned. */
  readonly totalLifetime?: number;
}

// ─── Analytics & Events ──────────────────────────────────────────────────────

/** A tracked analytics event for reporting and insights. */
export interface AnalyticsEvent {
  readonly id: string;
  readonly type: AnalyticsEventType;
  /** ID of the entity this event relates to. */
  readonly entityId: string;
  /** Type of entity this event relates to. */
  readonly entityType: EntityType;
  /** Arbitrary event data payload. */
  readonly data: Readonly<Record<string, unknown>>;
  /** ISO 8601 timestamp. */
  readonly timestamp: string;
  /** User who triggered the event, if applicable. */
  readonly userId?: string;
  /** Session ID for grouping related events. */
  readonly sessionId?: string;
  /** Source of the event (web, mobile, api, agent). */
  readonly source?: string;
}

/** An event from an AI agent interacting with the platform. */
export interface AgentEvent {
  /** Display name of the agent. */
  readonly agent: string;
  /** The action the agent performed. */
  readonly action: string;
  /** Human-readable detail about the action. */
  readonly detail: string;
  /** Relative time string for display. */
  readonly time: string;
  /** Unique identifier for the agent. */
  readonly agentId?: string;
  /** Classification of the agent (marketing, analytics, campaign_manager). */
  readonly agentType?: string;
  /** API endpoint the agent called. */
  readonly endpoint?: string;
  /** Response time in milliseconds. */
  readonly responseMs?: number;
  /** ISO 8601 timestamp. */
  readonly timestamp?: string;
}

// ─── Notification Types ──────────────────────────────────────────────────────

/** A notification delivered to a user. */
export interface Notification {
  readonly id: string;
  readonly userId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly read: boolean;
  /** URL to navigate to when the notification is tapped/clicked. */
  readonly actionUrl?: string;
  /** ISO 8601 timestamp. */
  readonly createdAt: string;
  /** ISO 8601 timestamp when the notification was read. */
  readonly readAt?: string;
  /** Related entity for contextual actions. */
  readonly entityId?: string;
  readonly entityType?: EntityType;
}

// ─── API & Integration Types ─────────────────────────────────────────────────

/** API key for programmatic access (businesses and AI agents). */
export interface ApiKey {
  readonly id: string;
  /** Business this key belongs to; null for platform-level keys. */
  readonly businessId?: string;
  /** Display name of the agent or integration using this key. */
  readonly agentName: string;
  /** The API key value (shown once at creation, stored hashed). */
  readonly key: string;
  /** Granted permission scopes. */
  readonly permissions: readonly string[];
  /** Rate limit in requests per minute. */
  readonly rateLimit: number;
  /** Cumulative usage counters. */
  readonly usage: ApiKeyUsage;
  /** ISO 8601 timestamp. */
  readonly createdAt: string;
  /** ISO 8601 timestamp of the last API call with this key. */
  readonly lastUsedAt?: string;
  /** Whether the key is currently active. */
  readonly active?: boolean;
  /** ISO 8601 timestamp when the key expires; null for no expiry. */
  readonly expiresAt?: string;
}

/** Usage metrics for an API key. */
export interface ApiKeyUsage {
  readonly totalRequests: number;
  readonly requestsToday: number;
  readonly requestsThisMonth: number;
  /** ISO 8601 date of last reset. */
  readonly lastResetDate: string;
}

/** Webhook subscription for real-time event delivery. */
export interface Webhook {
  readonly id: string;
  readonly businessId: string;
  readonly url: string;
  /** Event types this webhook subscribes to. */
  readonly events: readonly string[];
  readonly active: boolean;
  /** Shared secret for HMAC signature verification. */
  readonly secret: string;
  /** ISO 8601 timestamp. */
  readonly createdAt: string;
  /** Number of consecutive delivery failures. */
  readonly failureCount?: number;
  /** ISO 8601 timestamp of last successful delivery. */
  readonly lastSuccessAt?: string;
  /** ISO 8601 timestamp of last failed delivery. */
  readonly lastFailureAt?: string;
}

// ─── App State Types ─────────────────────────────────────────────────────────

/** Platform-wide aggregate statistics. */
export interface PlatformStats {
  /** Number of active AI agents. */
  readonly agents: number;
  /** Total API queries processed. */
  readonly queries: number;
  /** Total campaigns launched. */
  readonly campaigns: number;
  /** Total businesses on the platform. */
  readonly bizOnPlatform: number;
  /** Total marketing actions completed. */
  readonly actionsCompleted: number;
  /** Gross marketing value facilitated in dollars. */
  readonly gmv: number;
  /** Total influencers on the platform. */
  readonly influencers?: number;
  /** Total submissions processed. */
  readonly submissions?: number;
  /** Total perks redeemed. */
  readonly perksRedeemed?: number;
  /** Average campaign completion rate as a decimal. */
  readonly avgCompletionRate?: number;
  /** Platform uptime percentage. */
  readonly uptime?: number;
}

/** Root application data encompassing all entities. */
export interface AppData {
  readonly businesses: readonly Business[];
  readonly campaigns: readonly LaunchedCampaign[];
  readonly stats: PlatformStats;
  readonly users?: readonly User[];
  readonly influencers?: readonly Influencer[];
  readonly submissions?: readonly CampaignSubmission[];
  readonly perkWallets?: readonly PerkWallet[];
  readonly notifications?: readonly Notification[];
  readonly apiKeys?: readonly ApiKey[];
  readonly webhooks?: readonly Webhook[];
  readonly agentEvents?: readonly AgentEvent[];
  readonly analyticsEvents?: readonly AnalyticsEvent[];
}

// ─── API Response Types ──────────────────────────────────────────────────────

/** Standard paginated API response wrapper. */
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: ApiError;
  readonly pagination?: PaginationMeta;
  /** ISO 8601 timestamp of the response. */
  readonly timestamp?: string;
  /** Request ID for debugging. */
  readonly requestId?: string;
}

/** Structured API error. */
export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/** Pagination metadata included in list responses. */
export interface PaginationMeta {
  readonly page: number;
  readonly perPage: number;
  readonly total: number;
  readonly totalPages: number;
  /** Whether there is a next page. */
  readonly hasNext: boolean;
  /** Whether there is a previous page. */
  readonly hasPrev: boolean;
}

// ─── Filter Types ────────────────────────────────────────────────────────────

/** Filters for querying campaigns. */
export interface CampaignFilter {
  readonly businessId?: string;
  readonly tier?: CampaignTier;
  readonly status?: CampaignStatus;
  readonly category?: string;
  readonly actionType?: ActionType;
  readonly platformId?: string;
  /** Search term for name/description. */
  readonly search?: string;
  /** Minimum discount value. */
  readonly minValue?: number;
  /** Maximum discount value. */
  readonly maxValue?: number;
  readonly sortBy?: "created" | "value" | "completions" | "name";
  readonly sortOrder?: "asc" | "desc";
  readonly page?: number;
  readonly perPage?: number;
}

/** Filters for discovering influencers. */
export interface InfluencerFilter {
  readonly tier?: InfluencerTier;
  readonly niches?: readonly string[];
  readonly location?: string;
  readonly platformId?: string;
  readonly minFollowers?: number;
  readonly maxFollowers?: number;
  readonly minEngagementRate?: number;
  readonly maxEngagementRate?: number;
  readonly verified?: boolean;
  /** Maximum rate for the given action type. */
  readonly maxRate?: number;
  readonly actionType?: ActionType;
  readonly search?: string;
  readonly sortBy?: "followers" | "engagement" | "rate" | "completions" | "name";
  readonly sortOrder?: "asc" | "desc";
  readonly page?: number;
  readonly perPage?: number;
}

/** Filters for browsing actions across platforms. */
export interface ActionFilter {
  readonly platformId?: string;
  readonly type?: ActionType;
  readonly minEffort?: number;
  readonly maxEffort?: number;
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly search?: string;
  readonly sortBy?: "effort" | "value" | "name" | "platform";
  readonly sortOrder?: "asc" | "desc";
}

// ─── Pricing & Benchmark Types ───────────────────────────────────────────────

/** Query for the pricing oracle: what should a marketing action cost? */
export interface PricingQuery {
  /** Platform ID (e.g., "ig", "tt"). */
  readonly platformId: string;
  /** Action ID (e.g., "ig_rl"). */
  readonly actionId: string;
  /** Business type for context-aware pricing. */
  readonly businessType?: string;
  /** Location for regional pricing. */
  readonly location?: string;
  /** Follower count of the person performing the action. */
  readonly followerCount?: number;
  /** Engagement rate of the person performing the action. */
  readonly engagementRate?: number;
  /** Number of results to return for range queries. */
  readonly limit?: number;
}

/** Pricing oracle response with value estimates and confidence. */
export interface PricingResult {
  readonly actionId: string;
  readonly platformId: string;
  /** Suggested perk value in dollars. */
  readonly suggestedValue: number;
  /** Low end of the value range. */
  readonly rangeLow: number;
  /** High end of the value range. */
  readonly rangeHigh: number;
  /** Confidence score from 0 to 1. */
  readonly confidence: number;
  /** Basis for the pricing (e.g., "platform_average", "business_type_benchmark"). */
  readonly basis: string;
  /** Number of data points used for this estimate. */
  readonly dataPoints: number;
  /** Comparable action values for context. */
  readonly comparables?: readonly PricingComparable[];
}

/** A comparable data point for pricing context. */
export interface PricingComparable {
  readonly businessType: string;
  readonly value: number;
  readonly completionRate: number;
}

/** Query for industry benchmark data. */
export interface BenchmarkQuery {
  /** Business type or industry to benchmark. */
  readonly businessType: string;
  /** Specific platform to benchmark on (optional). */
  readonly platformId?: string;
  /** Specific action type to benchmark (optional). */
  readonly actionType?: ActionType;
  /** Geographic region for localized benchmarks. */
  readonly location?: string;
}

/** Industry benchmark results. */
export interface BenchmarkResult {
  readonly businessType: string;
  /** Average campaign completion rate as a decimal. */
  readonly avgCompletionRate: number;
  /** Average perk value offered in dollars. */
  readonly avgPerkValue: number;
  /** Most popular platforms for this business type. */
  readonly topPlatforms: readonly BenchmarkPlatformStat[];
  /** Most effective action types. */
  readonly topActionTypes: readonly BenchmarkActionStat[];
  /** Number of businesses in this benchmark cohort. */
  readonly sampleSize: number;
  /** How fresh the data is. */
  readonly dataFreshness: string;
}

/** Platform-specific benchmark statistics. */
export interface BenchmarkPlatformStat {
  readonly platformId: string;
  readonly platformName: string;
  /** Percentage of businesses using this platform. */
  readonly adoptionRate: number;
  /** Average ROI for campaigns on this platform. */
  readonly avgRoi: number;
}

/** Action type benchmark statistics. */
export interface BenchmarkActionStat {
  readonly actionType: ActionType;
  /** Average completion rate for this action type. */
  readonly avgCompletionRate: number;
  /** Average value per completion. */
  readonly avgValue: number;
  /** Relative effectiveness score from 0 to 1. */
  readonly effectivenessScore: number;
}

// ─── Shared / Mobile Interop Types ───────────────────────────────────────────

/** Mobile-friendly campaign representation for cross-platform rendering. */
export interface SharedCampaignView {
  readonly id: string;
  readonly businessName: string;
  readonly businessAvatar: string;
  readonly businessId: string;
  readonly campaignName: string;
  readonly description: string;
  /** Formatted perk value string (e.g., "15% off" or "$10 off"). */
  readonly perkDisplay: string;
  readonly discountValue: number;
  readonly discountType: DiscountType;
  readonly tier: CampaignTier;
  readonly tierLabel: string;
  readonly tierColor: string;
  /** Simplified action list for mobile display. */
  readonly actions: readonly SharedActionView[];
  readonly status: CampaignStatus;
  /** Days remaining until expiration; null if no expiry. */
  readonly daysRemaining: number | null;
  /** Number of completions remaining; null if unlimited. */
  readonly completionsRemaining: number | null;
  readonly useTiers: boolean;
  readonly guidelines?: string;
  readonly createdAt: string;
}

/** Simplified action view for mobile display. */
export interface SharedActionView {
  readonly id: string;
  readonly label: string;
  readonly platformName: string;
  readonly platformIcon: string;
  readonly platformColor: string;
  readonly type: ActionType;
  readonly effort: number;
  readonly value: number;
}

/** Unified profile view that works for both business and influencer profiles. */
export interface SharedProfileView {
  readonly id: string;
  readonly type: "business" | "influencer";
  readonly displayName: string;
  readonly avatarUrl: string;
  readonly bio?: string;
  readonly location?: string;
  /** Key-value stats for display (e.g., "Campaigns: 12", "Followers: 50K"). */
  readonly stats: readonly ProfileStat[];
  /** Social links for external profiles. */
  readonly socialLinks: readonly SocialLink[];
  readonly verified: boolean;
  /** Influencer-specific fields. */
  readonly influencerTier?: InfluencerTier;
  readonly niches?: readonly string[];
  /** Business-specific fields. */
  readonly businessType?: string;
  readonly businessPlan?: BusinessPlan;
  readonly activeCampaignCount?: number;
}

/** A displayable stat on a profile. */
export interface ProfileStat {
  readonly label: string;
  readonly value: string;
  readonly icon?: string;
}

/** Payload for syncing offline-first mobile app data. */
export interface SyncPayload {
  /** ISO 8601 timestamp of the last successful sync. */
  readonly lastSyncedAt: string;
  /** User ID performing the sync. */
  readonly userId: string;
  /** Device identifier for conflict resolution. */
  readonly deviceId: string;
  /** Entities that have changed since last sync. */
  readonly changes: SyncChanges;
  /** Whether this is a full sync or incremental. */
  readonly fullSync: boolean;
}

/** Changed entities grouped by type for sync. */
export interface SyncChanges {
  readonly campaigns?: readonly LaunchedCampaign[];
  readonly submissions?: readonly CampaignSubmission[];
  readonly perks?: readonly EarnedPerk[];
  readonly notifications?: readonly Notification[];
  /** Deleted entity IDs grouped by type. */
  readonly deletions?: Readonly<Record<EntityType, readonly string[]>>;
}

/** Deep link action for navigating into the app from external sources. */
export interface DeepLinkAction {
  readonly target: DeepLinkTarget;
  /** Entity ID to navigate to. */
  readonly entityId: string;
  /** Additional query parameters. */
  readonly params?: Readonly<Record<string, string>>;
  /** Fallback URL if the app is not installed. */
  readonly fallbackUrl?: string;
  /** Referral source for attribution. */
  readonly source?: string;
}
