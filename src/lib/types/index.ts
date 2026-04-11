// ==============================================================================
// Social Perks -- Central Type Registry
//
// Re-exports all types from their source modules so consumers can import
// everything from `@/lib/types` (or `@/lib/types/index`).
//
// Types remain defined in the modules that own them -- this file is purely
// a convenience barrel.  Add new re-exports here when a module introduces
// public types that other parts of the codebase need.
// ==============================================================================

// ── Shared package (canonical domain types) ──────────────────────────────────
export type {
  ActionType,
  CampaignTier,
  UserRole,
  BusinessSize,
  BusinessPlan,
  InfluencerTier,
  DiscountType,
  CampaignStatus,
  SubmissionStatus,
  PerkStatus,
  ProofType,
  NotificationType,
  AnalyticsEventType,
  EntityType,
  DeepLinkTarget,
  Platform,
  Action,
  ActionCategory,
  FollowerTier,
  TierMeta,
  Campaign,
  LaunchedCampaign,
  SocialLink,
  Business,
  User,
  UserPreferences,
  InfluencerPlatform,
  RateCard,
  PortfolioItem,
  ContentMetrics,
  Influencer,
  CampaignSubmission,
  EarnedPerk,
  PerkWallet,
  AnalyticsEvent,
  AgentEvent,
  Notification as SharedNotification,
  ApiKey,
  ApiKeyUsage,
  Webhook,
  PlatformStats,
  AppData,
  ApiResponse,
  ApiError,
  PaginationMeta,
  CampaignFilter,
  InfluencerFilter,
  ActionFilter,
  PricingQuery,
  PricingResult,
  PricingComparable,
  BenchmarkQuery,
  BenchmarkResult,
  BenchmarkPlatformStat,
  BenchmarkActionStat,
  SharedCampaignView,
  SharedActionView,
  SharedProfileView,
  ProfileStat,
  SyncPayload,
  SyncChanges,
  DeepLinkAction,
} from "@social-perks/shared/types";

// ── AI Engine types ──────────────────────────────────────────────────────────
export type {
  BusinessTraits,
  GeneratedCampaign,
  GenerateOptions,
  RecommendationInput,
  Recommendation,
  PricingEstimate,
  Benchmark,
} from "../ai-engine";

// ── Submission Engine types ──────────────────────────────────────────────────
export type {
  Submission,
  SubmissionFilters,
  PaginatedSubmissions,
  PerkCalculation,
  SubmissionResult,
  ReviewResult,
  ProofValidation,
} from "../submissions";

// ── Perk Wallet types ────────────────────────────────────────────────────────
// Note: EarnedPerk and PerkWallet are already exported from the shared package
// with a slightly different shape. The engine-specific versions are available
// as direct imports from `@/lib/perk-wallet`.
export type {
  WalletSummary,
  AwardResult,
  RedeemResult,
} from "../perk-wallet";

// ── Event Sourcing types ─────────────────────────────────────────────────────
export type {
  EventType,
  EventEntityType,
  EventActorType,
  PlatformEvent,
  EventQueryFilters,
  EventCallback,
} from "../events";

// ── Campaign State Machine types ─────────────────────────────────────────────
export type {
  CampaignState,
  CampaignBudget,
  CampaignCompletions,
  CampaignExpiry,
  StateTransition,
  CampaignLifecycle,
  LaunchConfig,
} from "../campaign-state-machine";

// ── Analytics Engine types ───────────────────────────────────────────────────
export type {
  AnalyticsSnapshot,
  PlatformAnalytics,
  CampaignAnalyticsSummary,
} from "../analytics-engine";

// ── Fraud Detection types ────────────────────────────────────────────────────
export type {
  FraudSignal,
  FraudCheck,
  UserRiskProfile,
  SubmissionInput,
  UserHistory,
} from "../fraud-detection";

// ── Matching Engine types ────────────────────────────────────────────────────
export type { MatchScore } from "../matching-engine";

// ── Compliance Engine types ──────────────────────────────────────────────────
export type {
  ComplianceCheck,
  ComplianceIssue,
  PlatformDisclosure,
  ContentValidation,
  ComplianceReport,
  PlatformRules,
  ReviewPolicy,
  ContentDisclosureRules,
} from "../compliance-engine";

// ── Financial Ledger types ───────────────────────────────────────────────────
export type {
  LedgerEntryType,
  AccountOwnerType,
  AccountType,
  LedgerEntry,
  Account,
  RevenueReport,
  BusinessSpendReport,
  InfluencerEarningsReport,
  BalanceVerification,
} from "../financial-ledger";

// ── Plugin System types ──────────────────────────────────────────────────────
export type {
  PluginHook,
  PluginContext,
  PluginResult,
  PluginHandler,
  Plugin,
  PluginExecutionLog,
} from "../plugin-system";

// ── Graph Engine types ───────────────────────────────────────────────────────
export type {
  NodeType,
  EdgeType,
  GraphNode,
  GraphEdge,
  PathResult,
  CommunityResult,
  GrowthMetrics,
} from "../graph-engine";

// ── Embedding Engine types ───────────────────────────────────────────────────
export type {
  Vector,
  EmbeddableEntityType,
  EmbeddingRecord,
  CampaignInput,
  BusinessInput,
  InfluencerInput,
  ActionInput,
  ClusterResult,
} from "../embedding-engine";

// ── Verification Engine types ────────────────────────────────────────────────
export type {
  VerificationStatus,
  VerificationMethod,
  VerificationResult,
  VerificationSubmission,
  BatchVerificationResult,
} from "../verification-engine";

// ── Sync Engine types ────────────────────────────────────────────────────────
export type {
  SyncOperation,
  SyncItemStatus,
  ConflictStrategy,
  SyncQueueItem,
  SyncState,
  ConflictResolution,
  SyncResult,
  DeltaPacket,
  DeltaChange,
} from "../sync-engine";

// ── Logging types ────────────────────────────────────────────────────────────
export type { LogLevel, LogEntry, LoggerOptions } from "../logging/index";

// ── Perk Programs types ──────────────────────────────────────────────────────
export type {
  RewardTier,
  PerkProgram,
  MemberProgress,
  CompletedAction,
  CycleHistory,
  CashBackPayout,
  CashBackStats,
  CreateProgramConfig,
  UpdateProgramConfig,
  ActionSubmission,
  ProgramStats,
  BusinessStats,
} from "../perk-programs";
