/**
 * Repository Layer for Social Perks
 * ──────────────────────────────────
 * Barrel export for all repository sub-modules.
 * Singleton instances are created here so every consumer shares
 * the same repository object.
 */

// ─── Shared types ───────────────────────────────────────────────────────────

export type {
  PaginationOptions,
  PaginatedResult,
  Repository,
} from "./shared";

// ─── Repository classes & types ─────────────────────────────────────────────

export {
  BusinessRepository,
  type BusinessRow,
  type CreateBusinessInput,
  type UpdateBusinessInput,
  type BusinessFilter,
} from "./business-repository";

export {
  InfluencerRepository,
  type InfluencerRow,
  type CreateInfluencerInput,
  type UpdateInfluencerInput,
  type InfluencerFilter,
} from "./influencer-repository";

// NOTE: CampaignRepository + SubmissionRepository were removed. They were
// schema-correct CRUD for the dead v1 `launched_campaigns` /
// `campaign_submissions` tables (UUID PK + FK to businesses/users), which no
// live route used. The durable, cold-start-safe campaign + submission
// persistence now lives in:
//   - src/lib/campaign-state-machine/persist.ts  → launched_campaign_state
//   - src/lib/submissions/persist.ts             → campaign_submissions_v2
// Do NOT reintroduce a repository against the v1 tables — they've been dropped
// from the schema.

export {
  UserRepository,
  type UserRow,
  type CreateUserInput,
  type UpdateUserInput,
  type UserFilter,
} from "./user-repository";

// ─── Singleton Instances ────────────────────────────────────────────────────

import { BusinessRepository } from "./business-repository";
import { InfluencerRepository } from "./influencer-repository";
import { UserRepository } from "./user-repository";

export const businessRepo = new BusinessRepository();
export const influencerRepo = new InfluencerRepository();
export const userRepo = new UserRepository();
