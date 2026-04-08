/**
 * Repository Layer for Social Perks
 * ──────────────────────────────────
 * Re-exports everything from the `repositories/` sub-modules so that
 * existing imports like `from "./repositories"` continue to work.
 */

export {
  // Shared types
  type PaginationOptions,
  type PaginatedResult,
  type Repository,

  // Business
  BusinessRepository,
  type BusinessRow,
  type CreateBusinessInput,
  type UpdateBusinessInput,
  type BusinessFilter,

  // Influencer
  InfluencerRepository,
  type InfluencerRow,
  type CreateInfluencerInput,
  type UpdateInfluencerInput,
  type InfluencerFilter,

  // Campaign
  CampaignRepository,
  type CampaignRow,
  type CreateCampaignInput,
  type UpdateCampaignInput,
  type CampaignFilter,

  // Submission
  SubmissionRepository,
  type SubmissionRow,
  type CreateSubmissionInput,
  type UpdateSubmissionInput,
  type SubmissionFilter,

  // User
  UserRepository,
  type UserRow,
  type CreateUserInput,
  type UpdateUserInput,
  type UserFilter,

  // Singleton instances
  businessRepo,
  influencerRepo,
  campaignRepo,
  submissionRepo,
  userRepo,
} from "./repositories/index";
