/**
 * Campaign Submission & Proof Engine
 *
 * Full state machine for managing customer proof submissions.
 * Handles creation, validation, review (approve/reject), expiration,
 * and perk value calculation including follower tier bonuses.
 *
 * Storage: in-memory Map (canonical) + DB write-through via
 * `./submissions/persist.ts` when DATABASE_URL is set.
 */

import { persistSubmission } from "@/lib/submissions/persist";

import type {
  SubmissionStatus,
  ProofType,
  CampaignSubmission,
  LaunchedCampaign,
  DiscountType,
} from "./types";
import { findAction, FOLLOWER_TIERS } from "./platforms";
import { emitSubmissionEvent } from "./events";
import { pluginManager } from "./plugin-system";

// ─── In-Memory Store ─────────────────────────────────────────────────────────

const submissions: Map<string, Submission> = new Map();
const MAX_SUBMISSIONS = 50_000;

// ─── Secondary Indexes (O(1) lookups by userId / campaignId) ────────────────

/** userId → Set of submission IDs */
const userSubmissions: Map<string, Set<string>> = new Map();
/** campaignId → Set of submission IDs */
const campaignSubmissions: Map<string, Set<string>> = new Map();

function addToIndex(index: Map<string, Set<string>>, key: string, submissionId: string): void {
  let set = index.get(key);
  if (!set) {
    set = new Set();
    index.set(key, set);
  }
  set.add(submissionId);
}

function removeFromIndex(index: Map<string, Set<string>>, key: string, submissionId: string): void {
  const set = index.get(key);
  if (set) {
    set.delete(submissionId);
    if (set.size === 0) index.delete(key);
  }
}

/** Resolve submission IDs from an index into Submission objects. */
function resolveIndex(index: Map<string, Set<string>>, key: string): Submission[] {
  const ids = index.get(key);
  if (!ids) return [];
  const result: Submission[] = [];
  for (const id of ids) {
    const sub = submissions.get(id);
    if (sub) result.push(sub);
  }
  return result;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Submission {
  id: string;
  campaignId: string;
  userId: string;
  actionId: string;
  proofUrl: string;
  proofType: ProofType;
  status: SubmissionStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  perkAwarded: boolean;
  metadata: Record<string, unknown>;
}

export interface SubmissionFilters {
  campaignId?: string;
  userId?: string;
  status?: SubmissionStatus;
  actionId?: string;
}

export interface PaginatedSubmissions {
  submissions: Submission[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface PerkCalculation {
  baseValue: number;
  baseType: DiscountType;
  followerBonus: number;
  totalValue: number;
  tierLabel: string;
  actionValue: number;
}

export interface SubmissionResult {
  success: boolean;
  data?: Submission;
  error?: { code: string; message: string };
}

export interface ReviewResult {
  success: boolean;
  data?: Submission;
  error?: { code: string; message: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `sub_${crypto.randomUUID()}`;
}

const VALID_PROOF_TYPES: ProofType[] = ["screenshot", "url", "video", "api_verified"];

// Only allow alphanumeric characters, hyphens, and underscores in IDs
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

// Require protocol + domain with at least one dot (prevents "http://x" or "https://")
const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

// ─── Proof Validation ────────────────────────────────────────────────────────

export interface ProofValidation {
  valid: boolean;
  errors: string[];
}

export function validateProof(proof: {
  proofUrl: unknown;
  proofType: unknown;
}): ProofValidation {
  const errors: string[] = [];

  // Validate proofType
  if (!proof.proofType || typeof proof.proofType !== "string") {
    errors.push("proofType is required and must be a string");
  } else if (!VALID_PROOF_TYPES.includes(proof.proofType as ProofType)) {
    errors.push(
      `proofType must be one of: ${VALID_PROOF_TYPES.join(", ")}`
    );
  }

  // Validate proofUrl
  if (!proof.proofUrl || typeof proof.proofUrl !== "string") {
    errors.push("proofUrl is required and must be a string");
  } else {
    const trimmed = (proof.proofUrl as string).trim();
    if (trimmed.length === 0) {
      errors.push("proofUrl cannot be empty");
    } else if (trimmed.length > 2048) {
      errors.push("proofUrl cannot exceed 2048 characters");
    } else if (
      proof.proofType === "url" &&
      !URL_PATTERN.test(trimmed)
    ) {
      errors.push("proofUrl must be a valid HTTP(S) URL when proofType is 'url'");
    } else if (
      proof.proofType === "screenshot" &&
      !URL_PATTERN.test(trimmed)
    ) {
      errors.push("proofUrl must be a valid HTTP(S) URL pointing to the screenshot");
    } else if (
      proof.proofType === "video" &&
      !URL_PATTERN.test(trimmed)
    ) {
      errors.push("proofUrl must be a valid HTTP(S) URL pointing to the video");
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Create Submission ───────────────────────────────────────────────────────

export function createSubmission(
  campaignId: string,
  userId: string,
  actionId: string,
  proofUrl: string,
  proofType: ProofType,
  metadata: Record<string, unknown> = {}
): SubmissionResult {
  // Validate required fields
  if (!campaignId || typeof campaignId !== "string") {
    return {
      success: false,
      error: { code: "INVALID_CAMPAIGN_ID", message: "campaignId is required" },
    };
  }
  if (!SAFE_ID_PATTERN.test(campaignId)) {
    return {
      success: false,
      error: { code: "INVALID_CAMPAIGN_ID", message: "campaignId contains invalid characters (only alphanumeric, hyphens, underscores allowed)" },
    };
  }

  if (!userId || typeof userId !== "string") {
    return {
      success: false,
      error: { code: "INVALID_USER_ID", message: "userId is required" },
    };
  }
  if (!SAFE_ID_PATTERN.test(userId)) {
    return {
      success: false,
      error: { code: "INVALID_USER_ID", message: "userId contains invalid characters (only alphanumeric, hyphens, underscores allowed)" },
    };
  }

  if (!actionId || typeof actionId !== "string") {
    return {
      success: false,
      error: { code: "INVALID_ACTION_ID", message: "actionId is required" },
    };
  }
  if (!SAFE_ID_PATTERN.test(actionId)) {
    return {
      success: false,
      error: { code: "INVALID_ACTION_ID", message: "actionId contains invalid characters (only alphanumeric, hyphens, underscores allowed)" },
    };
  }

  // Validate proof
  const proofValidation = validateProof({ proofUrl, proofType });
  if (!proofValidation.valid) {
    return {
      success: false,
      error: {
        code: "INVALID_PROOF",
        message: proofValidation.errors.join("; "),
      },
    };
  }

  // Verify the action exists in our platform registry
  const action = findAction(actionId);
  if (!action) {
    return {
      success: false,
      error: {
        code: "UNKNOWN_ACTION",
        message: `Action '${actionId}' not found in platform registry`,
      },
    };
  }

  // Check for duplicate submissions (same user + campaign + action, pending OR approved)
  // Uses the userId index to avoid scanning all submissions
  const userSubs = resolveIndex(userSubmissions, userId);
  const existing = userSubs.find(
    (s) =>
      s.campaignId === campaignId &&
      s.actionId === actionId &&
      (s.status === "pending" || s.status === "approved")
  );
  if (existing) {
    return {
      success: false,
      error: {
        code: "DUPLICATE_SUBMISSION",
        message: `You already have a ${existing.status} submission for this action (${existing.id})`,
      },
    };
  }

  const submission: Submission = {
    id: generateId(),
    campaignId,
    userId,
    actionId,
    proofUrl: proofUrl.trim(),
    proofType,
    status: "pending",
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: null,
    perkAwarded: false,
    metadata,
  };

  submissions.set(submission.id, submission);
  addToIndex(userSubmissions, userId, submission.id);
  addToIndex(campaignSubmissions, campaignId, submission.id);

  // Phase 12: durable write-through. Best-effort.
  void persistSubmission({
    id: submission.id,
    campaignId: submission.campaignId,
    userId: submission.userId,
    actionId: submission.actionId,
    proofUrl: submission.proofUrl,
    proofType: submission.proofType,
    status: submission.status,
    submittedAt: submission.submittedAt,
    reviewedAt: submission.reviewedAt,
    reviewedBy: submission.reviewedBy,
    reviewNote: submission.reviewNote,
    perkAwarded: submission.perkAwarded,
    metadata: submission.metadata as Record<string, unknown>,
  });

  if (submissions.size > MAX_SUBMISSIONS) {
    const oldest = Array.from(submissions.keys()).slice(0, Math.floor(MAX_SUBMISSIONS * 0.2));
    for (const key of oldest) {
      const old = submissions.get(key);
      if (old) {
        removeFromIndex(userSubmissions, old.userId, key);
        removeFromIndex(campaignSubmissions, old.campaignId, key);
      }
      submissions.delete(key);
    }
  }

  return { success: true, data: submission };
}

// ─── Review Submission ───────────────────────────────────────────────────────

export async function reviewSubmission(
  submissionId: string,
  reviewerId: string,
  decision: "approve" | "reject",
  note?: string
): Promise<ReviewResult> {
  if (!submissionId || typeof submissionId !== "string") {
    return {
      success: false,
      error: { code: "INVALID_SUBMISSION_ID", message: "submissionId is required" },
    };
  }

  if (!reviewerId || typeof reviewerId !== "string") {
    return {
      success: false,
      error: { code: "INVALID_REVIEWER_ID", message: "reviewerId is required" },
    };
  }

  if (decision !== "approve" && decision !== "reject") {
    return {
      success: false,
      error: {
        code: "INVALID_DECISION",
        message: "decision must be 'approve' or 'reject'",
      },
    };
  }

  const submission = submissions.get(submissionId);
  if (!submission) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: `Submission '${submissionId}' not found` },
    };
  }

  if (submission.status !== "pending") {
    return {
      success: false,
      error: {
        code: "ALREADY_REVIEWED",
        message: `Submission has already been ${submission.status}`,
      },
    };
  }

  // Run plugin hooks before approval
  if (decision === "approve") {
    try {
      const hookResult = await pluginManager.executeHook(
        "submission.beforeApprove",
        { submissionId, userId: submission.userId, proofUrl: submission.proofUrl, actionId: submission.actionId },
        { actorId: reviewerId, actorType: "business" }
      );
      if (hookResult.aborted) {
        return {
          success: false,
          error: { code: "PLUGIN_BLOCKED", message: hookResult.abortReason || "Blocked by plugin" },
        };
      }
    } catch (err) {
      console.error('[Submissions] Plugin hook "submission.beforeApprove" failed:', err instanceof Error ? err.message : err);
      // Plugin errors are logged but don't block the review flow
    }
  }

  const now = new Date().toISOString();

  const updated: Submission = {
    ...submission,
    status: decision === "approve" ? "approved" : "rejected",
    reviewedAt: now,
    reviewedBy: reviewerId,
    reviewNote: note ? String(note).slice(0, 1000) : null,
    perkAwarded: decision === "approve",
  };

  submissions.set(submissionId, updated);

  // Emit event for analytics
  const eventType = decision === "approve" ? "submission.approved" : "submission.rejected";
  emitSubmissionEvent(eventType, submissionId, reviewerId, {
    campaignId: submission.campaignId, userId: submission.userId, actionId: submission.actionId,
  });

  return { success: true, data: updated };
}

// ─── Query Submissions ───────────────────────────────────────────────────────

export function getSubmissionsForCampaign(
  campaignId: string,
  filters: Omit<SubmissionFilters, "campaignId"> = {},
  page = 1,
  perPage = 20
): PaginatedSubmissions {
  let results = resolveIndex(campaignSubmissions, campaignId);

  if (filters.status) {
    results = results.filter((s) => s.status === filters.status);
  }
  if (filters.userId) {
    results = results.filter((s) => s.userId === filters.userId);
  }
  if (filters.actionId) {
    results = results.filter((s) => s.actionId === filters.actionId);
  }

  // Sort by submittedAt descending (newest first)
  results.sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  const total = results.length;
  const safePage = Math.max(1, page);
  const safePerPage = Math.min(100, Math.max(1, perPage));
  const offset = (safePage - 1) * safePerPage;
  const paginated = results.slice(offset, offset + safePerPage);

  return {
    submissions: paginated,
    total,
    page: safePage,
    perPage: safePerPage,
    totalPages: Math.ceil(total / safePerPage),
  };
}

export function getSubmissionsForUser(userId: string): Submission[] {
  return resolveIndex(userSubmissions, userId)
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
}

export function getSubmissionById(submissionId: string): Submission | undefined {
  return submissions.get(submissionId);
}

export function getSubmissions(
  filters: SubmissionFilters = {},
  page = 1,
  perPage = 20
): PaginatedSubmissions {
  // Start from the narrowest index available, then apply remaining filters
  let results: Submission[];
  let usedCampaignIndex = false;
  let usedUserIndex = false;

  if (filters.campaignId) {
    results = resolveIndex(campaignSubmissions, filters.campaignId);
    usedCampaignIndex = true;
  } else if (filters.userId) {
    results = resolveIndex(userSubmissions, filters.userId);
    usedUserIndex = true;
  } else {
    results = Array.from(submissions.values());
  }

  // Apply remaining filters (skip the one already used as the index key)
  if (filters.campaignId && !usedCampaignIndex) {
    results = results.filter((s) => s.campaignId === filters.campaignId);
  }
  if (filters.userId && !usedUserIndex) {
    results = results.filter((s) => s.userId === filters.userId);
  }
  if (filters.status) {
    results = results.filter((s) => s.status === filters.status);
  }
  if (filters.actionId) {
    results = results.filter((s) => s.actionId === filters.actionId);
  }

  // Sort by submittedAt descending
  results.sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  const total = results.length;
  const safePage = Math.max(1, page);
  const safePerPage = Math.min(100, Math.max(1, perPage));
  const offset = (safePage - 1) * safePerPage;
  const paginated = results.slice(offset, offset + safePerPage);

  return {
    submissions: paginated,
    total,
    page: safePage,
    perPage: safePerPage,
    totalPages: Math.ceil(total / safePerPage),
  };
}

// ─── Expire Stale Submissions ────────────────────────────────────────────────

export function expireStaleSubmissions(maxAgeDays = 30): {
  expired: number;
  ids: string[];
} {
  if (maxAgeDays < 1) {
    return { expired: 0, ids: [] };
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);
  const cutoffTime = cutoff.getTime();

  const expiredIds: string[] = [];

  for (const [id, submission] of submissions) {
    if (
      submission.status === "pending" &&
      new Date(submission.submittedAt).getTime() < cutoffTime
    ) {
      submissions.set(id, {
        ...submission,
        status: "expired",
        reviewNote: `Auto-expired after ${maxAgeDays} days without review`,
      });
      expiredIds.push(id);
    }
  }

  return { expired: expiredIds.length, ids: expiredIds };
}

// ─── Calculate Perk Value ────────────────────────────────────────────────────

export function calculatePerkValue(
  submission: Submission,
  campaign: LaunchedCampaign,
  followerCount = 0
): PerkCalculation {
  const action = findAction(submission.actionId);
  const actionValue = action?.value ?? 0;

  const baseValue = campaign.discountValue;
  const baseType = campaign.discountType;

  // Determine follower tier bonus
  let followerBonus = 0;
  let tierLabel = "Anyone";

  if (campaign.useTiers && followerCount > 0) {
    // Walk the tiers from highest to lowest to find the matching tier
    for (let i = FOLLOWER_TIERS.length - 1; i >= 0; i--) {
      if (followerCount >= FOLLOWER_TIERS[i].minFollowers) {
        followerBonus = FOLLOWER_TIERS[i].bonus;
        tierLabel = FOLLOWER_TIERS[i].label;
        break;
      }
    }
  }

  // Calculate total value
  // For percentage-based: base + bonus (both are percentages, so add them)
  // For dollar-based: base + (base * bonus / 100)
  let totalValue: number;
  if (baseType === "pct") {
    totalValue = Math.min(100, baseValue + followerBonus);
  } else {
    totalValue = baseValue + (baseValue * followerBonus) / 100;
  }

  // Round to 2 decimal places
  totalValue = Math.round(totalValue * 100) / 100;

  return {
    baseValue,
    baseType,
    followerBonus,
    totalValue,
    tierLabel,
    actionValue,
  };
}

// ─── Convert to API-safe CampaignSubmission ──────────────────────────────────

export function toApiSubmission(submission: Submission): CampaignSubmission {
  const action = findAction(submission.actionId);
  return {
    id: submission.id,
    campaignId: submission.campaignId,
    userId: submission.userId,
    actionId: submission.actionId,
    proofUrl: submission.proofUrl,
    proofType: submission.proofType,
    status: submission.status,
    submittedAt: submission.submittedAt,
    reviewedAt: submission.reviewedAt ?? undefined,
    reviewNote: submission.reviewNote ?? undefined,
    platformId: action?.platformId,
    autoVerified: submission.proofType === "api_verified",
  };
}

// ─── Store Access (for testing / admin) ──────────────────────────────────────

export function getStore(): Map<string, Submission> {
  return submissions;
}

export function clearStore(): void {
  submissions.clear();
  userSubmissions.clear();
  campaignSubmissions.clear();
}
