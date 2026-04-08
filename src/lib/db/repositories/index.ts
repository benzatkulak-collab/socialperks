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

export {
  CampaignRepository,
  type CampaignRow,
  type CreateCampaignInput,
  type UpdateCampaignInput,
  type CampaignFilter,
} from "./campaign-repository";

export {
  SubmissionRepository,
  type SubmissionRow,
  type CreateSubmissionInput,
  type UpdateSubmissionInput,
  type SubmissionFilter,
} from "./submission-repository";

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
import { CampaignRepository } from "./campaign-repository";
import { SubmissionRepository } from "./submission-repository";
import { UserRepository } from "./user-repository";

export const businessRepo = new BusinessRepository();
export const influencerRepo = new InfluencerRepository();
export const campaignRepo = new CampaignRepository();
export const submissionRepo = new SubmissionRepository();
export const userRepo = new UserRepository();
