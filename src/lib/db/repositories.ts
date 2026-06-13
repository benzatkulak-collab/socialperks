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

  // NOTE: Campaign + Submission repositories were removed (they wrote to the
  // dead v1 launched_campaigns / campaign_submissions tables). Live persistence
  // is in campaign-state-machine/persist.ts and submissions/persist.ts.

  // User
  UserRepository,
  type UserRow,
  type CreateUserInput,
  type UpdateUserInput,
  type UserFilter,

  // Singleton instances
  businessRepo,
  influencerRepo,
  userRepo,
} from "./repositories/index";
