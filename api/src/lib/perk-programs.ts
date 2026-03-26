// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Perk Program Engine
//
// Replaces the one-shot campaign model with recurring, flexible perk programs.
// Businesses define programs with allowed platforms/actions, reward tiers,
// and cycle timing. Members earn tiered rewards by completing actions each cycle.
//
// In-memory store now, ready for Postgres + Prisma migration.
// ══════════════════════════════════════════════════════════════════════════════

import { PLATFORMS } from "./platforms";
import { legalGuard } from "./legal-compliance";

// ═══════════════ Types ═══════════════

export interface RewardTier {
  id: string;
  name: string; // e.g., "Bronze", "Silver", "Gold"
  requiredActions: number; // e.g., 3, 5, 8
  reward: {
    type: "percentage" | "dollar" | "cash_back" | "custom";
    value: number; // 10 for 10%, or 15 for $15, or 500 for $500 cash back
    description: string; // "10% off membership" or "Free smoothie bar access" or "$500 cash back via Venmo"
  };
  color: string; // for UI display
}

export interface PerkProgram {
  id: string;
  businessId: string;
  name: string; // "Monthly Social Perk"
  description: string;
  status: "active" | "paused" | "ended";

  // What members need to do
  rules: {
    allowedPlatforms: string[]; // platform IDs: ["ig", "tt", "go"]
    allowedActionTypes: string[]; // action type categories: ["content", "review", "engage", "share"]
    allowedActions: string[]; // specific action IDs (optional, empty = all actions on allowed platforms)
    minActionsPerCycle: number; // minimum to unlock first tier
    maxActionsPerCycle: number; // cap (prevents gaming)
    requireUniquePlatforms: boolean; // if true, can't do all 3 on same platform
    requireUniqueActionTypes: boolean; // if true, must mix content types
  };

  // Reward structure
  tiers: RewardTier[];

  // Program type
  programType: "membership" | "per_visit" | "one_time_service" | "subscription";

  // Timing
  cycle: "weekly" | "biweekly" | "monthly" | "quarterly" | "one_time";
  cycleStartDay: number; // 1-28 for monthly, 0-6 for weekly, ignored for one_time
  carryOverPartial: boolean; // if true, 2/3 actions carry to next cycle
  gracePeriodDays: number; // days after cycle end to still submit

  // High-ticket one-time service details (roofer, contractor, plumber, etc.)
  serviceDetails: {
    jobValue: number | null; // e.g., $15,000 roof
    cashBackAmount: number; // e.g., $500 flat
    cashBackPercentage: number | null; // or 3% of job value
    deadline: string | null; // "90 days after service"
    deadlineDays: number; // 90
  } | null;

  // Metadata
  maxMembers: number | null; // null = unlimited
  currentMembers: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemberProgress {
  id: string;
  programId: string;
  memberId: string; // user ID
  memberName: string;
  memberEmail: string;
  currentCycle: {
    startDate: string;
    endDate: string;
    completedActions: CompletedAction[];
    currentTier: RewardTier | null; // which tier they've unlocked
    nextTier: RewardTier | null; // next tier to unlock
    actionsToNextTier: number;
    progress: number; // 0-100 percentage
  };
  history: CycleHistory[];
  joinedAt: string;
  totalActionsAllTime: number;
  totalCyclesCompleted: number;
  currentStreak: number; // consecutive cycles meeting minimum
  longestStreak: number;
  // Payment method for cash back programs
  paymentMethod: {
    type: "venmo" | "check" | "stripe" | "paypal" | "cash" | "other" | null;
    details: string; // "@username", "123 Main St", etc.
  } | null;
  // For one-time programs: whether the member has completed the program
  oneTimeCompleted: boolean;
}

export interface CompletedAction {
  id: string;
  actionId: string;
  platformId: string;
  actionType: string;
  proofUrl: string;
  proofType: "url" | "screenshot" | "video";
  submittedAt: string;
  verifiedAt: string | null;
  status: "pending" | "verified" | "rejected";
}

export interface CycleHistory {
  cycleStart: string;
  cycleEnd: string;
  actionsCompleted: number;
  tierReached: string | null; // tier ID
  rewardEarned: string; // description
}

export interface CashBackPayout {
  id: string;
  programId: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  amount: number;
  method: "venmo" | "check" | "stripe" | "paypal" | "cash" | "other";
  methodDetails: string; // Venmo handle, address for check, etc.
  status: "pending" | "approved" | "sent" | "confirmed" | "failed";
  tierReached: string; // tier name
  actionsCompleted: number;
  requestedAt: string;
  approvedAt: string | null;
  sentAt: string | null;
  confirmedAt: string | null;
  notes: string;
}

export interface CashBackStats {
  totalPaidOut: number;
  totalPending: number;
  totalApproved: number;
  averagePerCustomer: number;
  payoutCount: number;
}

// ═══════════════ Config for createProgram ═══════════════

export interface CreateProgramConfig {
  name: string;
  description: string;
  rules: PerkProgram["rules"];
  tiers: RewardTier[];
  programType?: PerkProgram["programType"];
  cycle: PerkProgram["cycle"];
  cycleStartDay: number;
  carryOverPartial?: boolean;
  gracePeriodDays?: number;
  maxMembers?: number | null;
  serviceDetails?: PerkProgram["serviceDetails"];
}

export interface UpdateProgramConfig {
  name?: string;
  description?: string;
  rules?: Partial<PerkProgram["rules"]>;
  tiers?: RewardTier[];
  programType?: PerkProgram["programType"];
  cycle?: PerkProgram["cycle"];
  cycleStartDay?: number;
  carryOverPartial?: boolean;
  gracePeriodDays?: number;
  maxMembers?: number | null;
  serviceDetails?: PerkProgram["serviceDetails"];
}

export interface ActionSubmission {
  actionId: string;
  platformId: string;
  proofUrl: string;
  proofType: "url" | "screenshot" | "video";
}

export interface ProgramStats {
  totalMembers: number;
  avgCompletionRate: number;
  mostPopularPlatforms: { platformId: string; count: number }[];
  tierDistribution: { tierId: string; tierName: string; count: number }[];
  totalActionsSubmitted: number;
  activeMembers: number;
}

export interface BusinessStats {
  totalPrograms: number;
  activePrograms: number;
  totalMembers: number;
  totalActionsAllTime: number;
  avgCompletionRate: number;
}

// ═══════════════ Helpers ═══════════════

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

/**
 * Look up the action type for a given action ID across all platforms.
 */
function getActionType(actionId: string): string | null {
  for (const platform of PLATFORMS) {
    const action = platform.actions.find((a) => a.id === actionId);
    if (action) return action.type;
  }
  return null;
}

/**
 * Look up the platform ID for a given action ID.
 */
function getPlatformForAction(actionId: string): string | null {
  for (const platform of PLATFORMS) {
    if (platform.actions.some((a) => a.id === actionId)) {
      return platform.id;
    }
  }
  return null;
}

/**
 * Calculate the current cycle start and end dates for a program.
 */
export function calculateCycleDates(
  cycle: PerkProgram["cycle"],
  cycleStartDay: number,
  referenceDate?: Date
): { startDate: string; endDate: string } {
  const now = referenceDate ?? new Date();

  // One-time programs have no cycle — start is "now" and end is far in the future
  if (cycle === "one_time") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    // End date is 10 years from now (effectively no end)
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 10);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  if (cycle === "weekly") {
    const dayOfWeek = now.getDay();
    const diff = (dayOfWeek - cycleStartDay + 7) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  if (cycle === "biweekly") {
    const dayOfWeek = now.getDay();
    const diff = (dayOfWeek - cycleStartDay + 7) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    // Align to even weeks from epoch
    const epochWeek = Math.floor(start.getTime() / (7 * 24 * 60 * 60 * 1000));
    if (epochWeek % 2 !== 0) {
      start.setDate(start.getDate() - 7);
    }
    const end = new Date(start);
    end.setDate(start.getDate() + 14);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  if (cycle === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), cycleStartDay);
    if (start > now) {
      start.setMonth(start.getMonth() - 1);
    }
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  // quarterly
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), currentQuarter * 3, cycleStartDay);
  if (start > now) {
    start.setMonth(start.getMonth() - 3);
  }
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 3);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

// ═══════════════ PerkProgramManager ═══════════════

export class PerkProgramManager {
  private programs: Map<string, PerkProgram> = new Map();
  private members: Map<string, MemberProgress> = new Map(); // key: `${programId}:${memberId}`
  private actions: Map<string, CompletedAction> = new Map(); // key: action.id
  private cashBackPayouts: Map<string, CashBackPayout> = new Map(); // key: payout.id

  // ── Program CRUD ──────────────────────────────────────────────────────────

  createProgram(businessId: string, config: CreateProgramConfig): PerkProgram {
    // Validate at least 1 platform
    if (!config.rules.allowedPlatforms || config.rules.allowedPlatforms.length === 0) {
      throw new Error("At least one allowed platform is required");
    }

    // Validate at least 1 tier
    if (!config.tiers || config.tiers.length === 0) {
      throw new Error("At least one reward tier is required");
    }

    // Validate tiers sorted by requiredActions ascending
    const sortedTiers = [...config.tiers].sort((a, b) => a.requiredActions - b.requiredActions);

    // Validate min actions <= first tier
    if (config.rules.minActionsPerCycle > sortedTiers[0].requiredActions) {
      throw new Error("minActionsPerCycle cannot exceed the first tier's requiredActions");
    }

    // Validate max >= min
    if (config.rules.maxActionsPerCycle < config.rules.minActionsPerCycle) {
      throw new Error("maxActionsPerCycle must be >= minActionsPerCycle");
    }

    // Validate cycle start day (skip for one_time)
    if (config.cycle !== "one_time") {
      if (config.cycle === "weekly" || config.cycle === "biweekly") {
        if (config.cycleStartDay < 0 || config.cycleStartDay > 6) {
          throw new Error("cycleStartDay must be 0-6 for weekly/biweekly cycles");
        }
      } else {
        if (config.cycleStartDay < 1 || config.cycleStartDay > 28) {
          throw new Error("cycleStartDay must be 1-28 for monthly/quarterly cycles");
        }
      }
    }

    // Validate allowed action types
    const validTypes = ["content", "review", "engage", "share", "referral"];
    for (const at of config.rules.allowedActionTypes) {
      if (!validTypes.includes(at)) {
        throw new Error(`Invalid action type: ${at}`);
      }
    }

    // Legal compliance check: reject programs with non-incentivizable actions
    if (config.rules.allowedActions && config.rules.allowedActions.length > 0) {
      const scan = legalGuard.scanProgram(config.rules.allowedActions);
      if (!scan.safe) {
        const blockedList = scan.warnings
          .filter((w) => w.severity === "blocked")
          .map((w) => `${w.platform}: ${w.actionLabel} — ${w.legalBasis}`)
          .join("; ");
        throw new Error(
          `Program contains non-incentivizable actions that violate platform terms of service. ` +
          `Blocked actions: ${blockedList}. ${scan.suggestion}`
        );
      }
    }

    const id = generateId("prg");
    const now = new Date().toISOString();

    const program: PerkProgram = {
      id,
      businessId,
      name: config.name,
      description: config.description,
      status: "active",
      rules: {
        allowedPlatforms: config.rules.allowedPlatforms,
        allowedActionTypes: config.rules.allowedActionTypes,
        allowedActions: config.rules.allowedActions ?? [],
        minActionsPerCycle: config.rules.minActionsPerCycle,
        maxActionsPerCycle: config.rules.maxActionsPerCycle,
        requireUniquePlatforms: config.rules.requireUniquePlatforms ?? false,
        requireUniqueActionTypes: config.rules.requireUniqueActionTypes ?? false,
      },
      tiers: sortedTiers,
      programType: config.programType ?? "per_visit",
      cycle: config.cycle,
      cycleStartDay: config.cycleStartDay,
      carryOverPartial: config.carryOverPartial ?? false,
      gracePeriodDays: config.gracePeriodDays ?? 0,
      serviceDetails: config.serviceDetails ?? null,
      maxMembers: config.maxMembers ?? null,
      currentMembers: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.programs.set(id, program);
    return program;
  }

  getProgram(programId: string): PerkProgram | null {
    return this.programs.get(programId) ?? null;
  }

  listPrograms(businessId: string): PerkProgram[] {
    const results: PerkProgram[] = [];
    for (const program of this.programs.values()) {
      if (program.businessId === businessId) {
        results.push(program);
      }
    }
    return results;
  }

  updateProgram(programId: string, updates: UpdateProgramConfig): PerkProgram {
    const program = this.programs.get(programId);
    if (!program) throw new Error("Program not found");
    if (program.status === "ended") throw new Error("Cannot update an ended program");

    if (updates.name !== undefined) program.name = updates.name;
    if (updates.description !== undefined) program.description = updates.description;
    if (updates.programType !== undefined) program.programType = updates.programType;
    if (updates.cycle !== undefined) program.cycle = updates.cycle;
    if (updates.cycleStartDay !== undefined) program.cycleStartDay = updates.cycleStartDay;
    if (updates.carryOverPartial !== undefined) program.carryOverPartial = updates.carryOverPartial;
    if (updates.gracePeriodDays !== undefined) program.gracePeriodDays = updates.gracePeriodDays;
    if (updates.maxMembers !== undefined) program.maxMembers = updates.maxMembers;
    if (updates.serviceDetails !== undefined) program.serviceDetails = updates.serviceDetails;

    if (updates.rules) {
      program.rules = { ...program.rules, ...updates.rules };
    }

    if (updates.tiers) {
      if (updates.tiers.length === 0) throw new Error("At least one reward tier is required");
      program.tiers = [...updates.tiers].sort((a, b) => a.requiredActions - b.requiredActions);
    }

    program.updatedAt = new Date().toISOString();
    this.programs.set(programId, program);
    return program;
  }

  pauseProgram(programId: string): PerkProgram {
    const program = this.programs.get(programId);
    if (!program) throw new Error("Program not found");
    if (program.status === "ended") throw new Error("Cannot pause an ended program");
    program.status = "paused";
    program.updatedAt = new Date().toISOString();
    this.programs.set(programId, program);
    return program;
  }

  resumeProgram(programId: string): PerkProgram {
    const program = this.programs.get(programId);
    if (!program) throw new Error("Program not found");
    if (program.status !== "paused") throw new Error("Can only resume a paused program");
    program.status = "active";
    program.updatedAt = new Date().toISOString();
    this.programs.set(programId, program);
    return program;
  }

  endProgram(programId: string): PerkProgram {
    const program = this.programs.get(programId);
    if (!program) throw new Error("Program not found");
    program.status = "ended";
    program.updatedAt = new Date().toISOString();
    this.programs.set(programId, program);
    return program;
  }

  // ── Member Management ─────────────────────────────────────────────────────

  enrollMember(
    programId: string,
    memberId: string,
    name: string,
    email: string,
    paymentMethod?: MemberProgress["paymentMethod"]
  ): MemberProgress {
    const program = this.programs.get(programId);
    if (!program) throw new Error("Program not found");
    if (program.status !== "active") throw new Error("Program is not active");

    const key = `${programId}:${memberId}`;
    if (this.members.has(key)) {
      throw new Error("Member is already enrolled in this program");
    }

    if (program.maxMembers !== null && program.currentMembers >= program.maxMembers) {
      throw new Error("Program has reached maximum member capacity");
    }

    const { startDate, endDate } = this.getCurrentCycle(programId);

    const progress: MemberProgress = {
      id: generateId("mbr"),
      programId,
      memberId,
      memberName: name,
      memberEmail: email,
      currentCycle: {
        startDate,
        endDate,
        completedActions: [],
        currentTier: null,
        nextTier: program.tiers.length > 0 ? program.tiers[0] : null,
        actionsToNextTier: program.tiers.length > 0 ? program.tiers[0].requiredActions : 0,
        progress: 0,
      },
      history: [],
      joinedAt: new Date().toISOString(),
      totalActionsAllTime: 0,
      totalCyclesCompleted: 0,
      currentStreak: 0,
      longestStreak: 0,
      paymentMethod: paymentMethod ?? null,
      oneTimeCompleted: false,
    };

    this.members.set(key, progress);
    program.currentMembers += 1;
    this.programs.set(programId, program);

    return progress;
  }

  unenrollMember(programId: string, memberId: string): void {
    const key = `${programId}:${memberId}`;
    const member = this.members.get(key);
    if (!member) throw new Error("Member not found in this program");

    this.members.delete(key);

    const program = this.programs.get(programId);
    if (program) {
      program.currentMembers = Math.max(0, program.currentMembers - 1);
      this.programs.set(programId, program);
    }
  }

  getMemberProgress(programId: string, memberId: string): MemberProgress | null {
    const key = `${programId}:${memberId}`;
    return this.members.get(key) ?? null;
  }

  listMembers(programId: string): MemberProgress[] {
    const results: MemberProgress[] = [];
    for (const [key, progress] of this.members.entries()) {
      if (key.startsWith(`${programId}:`)) {
        results.push(progress);
      }
    }
    return results;
  }

  getMemberDashboard(memberId: string): { programId: string; progress: MemberProgress }[] {
    const results: { programId: string; progress: MemberProgress }[] = [];
    for (const [key, progress] of this.members.entries()) {
      if (key.endsWith(`:${memberId}`)) {
        results.push({ programId: progress.programId, progress });
      }
    }
    return results;
  }

  // ── Action Submission ─────────────────────────────────────────────────────

  submitAction(
    programId: string,
    memberId: string,
    actionData: ActionSubmission
  ): MemberProgress {
    const program = this.programs.get(programId);
    if (!program) throw new Error("Program not found");
    if (program.status !== "active") throw new Error("Program is not active");

    const key = `${programId}:${memberId}`;
    const progress = this.members.get(key);
    if (!progress) throw new Error("Member not found in this program");

    // Check max actions per cycle
    const verifiedOrPending = progress.currentCycle.completedActions.filter(
      (a) => a.status !== "rejected"
    );
    if (verifiedOrPending.length >= program.rules.maxActionsPerCycle) {
      throw new Error("Maximum actions per cycle reached");
    }

    // Validate platform is allowed
    if (!program.rules.allowedPlatforms.includes(actionData.platformId)) {
      throw new Error(`Platform '${actionData.platformId}' is not allowed in this program`);
    }

    // Validate action type is allowed
    const actionType = getActionType(actionData.actionId);
    if (!actionType) {
      throw new Error(`Unknown action: ${actionData.actionId}`);
    }
    if (
      program.rules.allowedActionTypes.length > 0 &&
      !program.rules.allowedActionTypes.includes(actionType)
    ) {
      throw new Error(`Action type '${actionType}' is not allowed in this program`);
    }

    // Validate specific action if allowedActions is set
    if (
      program.rules.allowedActions.length > 0 &&
      !program.rules.allowedActions.includes(actionData.actionId)
    ) {
      throw new Error(`Action '${actionData.actionId}' is not in the allowed actions list`);
    }

    // Validate action belongs to the claimed platform
    const actualPlatform = getPlatformForAction(actionData.actionId);
    if (actualPlatform !== actionData.platformId) {
      throw new Error(`Action '${actionData.actionId}' does not belong to platform '${actionData.platformId}'`);
    }

    // Legal compliance check: reject non-incentivizable actions
    if (!legalGuard.isIncentivizable(actionData.actionId)) {
      const warnings = legalGuard.getWarningsForAction(actionData.actionId);
      const reason = warnings.length > 0 ? warnings[0].legalBasis : "Platform terms of service prohibit incentivizing this action.";
      throw new Error(
        `Action '${actionData.actionId}' cannot be incentivized. ${reason} ` +
        `Please remove this action and ask for reviews separately without tying to any reward.`
      );
    }

    // Check unique platform requirement
    if (program.rules.requireUniquePlatforms) {
      const usedPlatforms = new Set(
        verifiedOrPending.map((a) => a.platformId)
      );
      if (usedPlatforms.has(actionData.platformId) && usedPlatforms.size > 0) {
        // Only block if they already have actions on this platform AND there
        // are other platforms they haven't used (i.e., enforce diversity)
        const allAllowed = new Set(program.rules.allowedPlatforms);
        const unusedPlatforms = [...allAllowed].filter((p) => !usedPlatforms.has(p));
        if (unusedPlatforms.length > 0) {
          throw new Error(
            "Unique platform requirement: you must use a different platform. " +
            `Unused platforms: ${unusedPlatforms.join(", ")}`
          );
        }
      }
    }

    // Check unique action type requirement
    if (program.rules.requireUniqueActionTypes) {
      const usedTypes = new Set(
        verifiedOrPending.map((a) => a.actionType)
      );
      if (usedTypes.has(actionType) && usedTypes.size > 0) {
        const allAllowed = new Set(program.rules.allowedActionTypes);
        const unusedTypes = [...allAllowed].filter((t) => !usedTypes.has(t));
        if (unusedTypes.length > 0) {
          throw new Error(
            "Unique action type requirement: you must use a different action type. " +
            `Unused types: ${unusedTypes.join(", ")}`
          );
        }
      }
    }

    // Create the completed action
    const completedAction: CompletedAction = {
      id: generateId("act"),
      actionId: actionData.actionId,
      platformId: actionData.platformId,
      actionType: actionType,
      proofUrl: actionData.proofUrl,
      proofType: actionData.proofType,
      submittedAt: new Date().toISOString(),
      verifiedAt: null,
      status: "pending",
    };

    this.actions.set(completedAction.id, completedAction);
    progress.currentCycle.completedActions.push(completedAction);
    progress.totalActionsAllTime += 1;

    // Recalculate tier progression
    this.recalculateProgress(progress, program);

    // Handle one-time programs: mark as completed when tier is reached
    if (program.cycle === "one_time" && progress.currentCycle.currentTier && !progress.oneTimeCompleted) {
      progress.oneTimeCompleted = true;

      // Auto-trigger cash back request if the reward type is cash_back
      const topTier = progress.currentCycle.currentTier;
      if (topTier.reward.type === "cash_back" && progress.paymentMethod?.type) {
        this.requestCashBack(
          programId,
          memberId,
          progress.paymentMethod.type,
          progress.paymentMethod.details
        );
      }
    }

    this.members.set(key, progress);
    return progress;
  }

  verifyAction(actionId: string): CompletedAction {
    const action = this.actions.get(actionId);
    if (!action) throw new Error("Action not found");
    if (action.status !== "pending") throw new Error("Action is not pending");

    action.status = "verified";
    action.verifiedAt = new Date().toISOString();
    this.actions.set(actionId, action);

    // Find the member progress that contains this action and recalculate
    for (const progress of this.members.values()) {
      const idx = progress.currentCycle.completedActions.findIndex((a) => a.id === actionId);
      if (idx !== -1) {
        progress.currentCycle.completedActions[idx] = action;
        const program = this.programs.get(progress.programId);
        if (program) {
          this.recalculateProgress(progress, program);
        }
        break;
      }
    }

    return action;
  }

  rejectAction(actionId: string): CompletedAction {
    const action = this.actions.get(actionId);
    if (!action) throw new Error("Action not found");
    if (action.status !== "pending") throw new Error("Action is not pending");

    action.status = "rejected";
    this.actions.set(actionId, action);

    // Find the member progress that contains this action and recalculate
    for (const progress of this.members.values()) {
      const idx = progress.currentCycle.completedActions.findIndex((a) => a.id === actionId);
      if (idx !== -1) {
        progress.currentCycle.completedActions[idx] = action;
        const program = this.programs.get(progress.programId);
        if (program) {
          this.recalculateProgress(progress, program);
        }
        break;
      }
    }

    return action;
  }

  // ── Cycle Management ──────────────────────────────────────────────────────

  getCurrentCycle(programId: string): { startDate: string; endDate: string } {
    const program = this.programs.get(programId);
    if (!program) throw new Error("Program not found");

    // For one-time programs, compute deadline-based end if serviceDetails is set
    if (program.cycle === "one_time") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      let end: Date;
      if (program.serviceDetails?.deadlineDays) {
        end = new Date(start);
        end.setDate(end.getDate() + program.serviceDetails.deadlineDays);
      } else {
        // No deadline: effectively forever
        end = new Date(start);
        end.setFullYear(end.getFullYear() + 10);
      }
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    return calculateCycleDates(program.cycle, program.cycleStartDay);
  }

  resetCycle(programId: string): void {
    const program = this.programs.get(programId);
    if (!program) throw new Error("Program not found");

    // One-time programs never reset
    if (program.cycle === "one_time") return;

    const { startDate, endDate } = this.getCurrentCycle(programId);

    for (const [key, progress] of this.members.entries()) {
      if (!key.startsWith(`${programId}:`)) continue;

      const completedCount = progress.currentCycle.completedActions.filter(
        (a) => a.status !== "rejected"
      ).length;

      const tierReached = this.calculateTier(completedCount, program.tiers);
      const rewardDesc = tierReached ? tierReached.reward.description : "No reward";
      const metMinimum = completedCount >= program.rules.minActionsPerCycle;

      // Record history
      progress.history.push({
        cycleStart: progress.currentCycle.startDate,
        cycleEnd: progress.currentCycle.endDate,
        actionsCompleted: completedCount,
        tierReached: tierReached?.id ?? null,
        rewardEarned: rewardDesc,
      });

      if (metMinimum) {
        progress.totalCyclesCompleted += 1;
        progress.currentStreak += 1;
        if (progress.currentStreak > progress.longestStreak) {
          progress.longestStreak = progress.currentStreak;
        }
      } else {
        progress.currentStreak = 0;
      }

      // Carry over partial actions if configured
      let carriedActions: CompletedAction[] = [];
      if (program.carryOverPartial && !metMinimum && completedCount > 0) {
        carriedActions = progress.currentCycle.completedActions.filter(
          (a) => a.status !== "rejected"
        );
      }

      // Reset to new cycle
      progress.currentCycle = {
        startDate,
        endDate,
        completedActions: carriedActions,
        currentTier: null,
        nextTier: program.tiers.length > 0 ? program.tiers[0] : null,
        actionsToNextTier: program.tiers.length > 0 ? program.tiers[0].requiredActions - carriedActions.length : 0,
        progress: 0,
      };

      // Recalculate if carried actions
      if (carriedActions.length > 0) {
        this.recalculateProgress(progress, program);
      }

      this.members.set(key, progress);
    }
  }

  checkGracePeriod(programId: string, memberId: string): boolean {
    const program = this.programs.get(programId);
    if (!program) return false;
    if (program.gracePeriodDays <= 0) return false;

    const key = `${programId}:${memberId}`;
    const progress = this.members.get(key);
    if (!progress) return false;

    // Check if we're within grace period of the previous cycle end
    const cycleEnd = new Date(progress.currentCycle.endDate);
    const now = new Date();
    const graceEnd = new Date(cycleEnd);
    graceEnd.setDate(graceEnd.getDate() + program.gracePeriodDays);

    return now <= graceEnd;
  }

  processAllCycleResets(): string[] {
    const resetProgramIds: string[] = [];
    const now = new Date();

    for (const program of this.programs.values()) {
      if (program.status !== "active") continue;
      if (program.cycle === "one_time") continue; // One-time programs never reset

      const { endDate } = calculateCycleDates(program.cycle, program.cycleStartDay);
      const cycleEnd = new Date(endDate);

      // If the cycle has ended, reset it
      if (now > cycleEnd) {
        this.resetCycle(program.id);
        resetProgramIds.push(program.id);
      }
    }

    return resetProgramIds;
  }

  // ── Tier Calculation ──────────────────────────────────────────────────────

  calculateTier(completedCount: number, tiers: RewardTier[]): RewardTier | null {
    const sorted = [...tiers].sort((a, b) => b.requiredActions - a.requiredActions);
    for (const tier of sorted) {
      if (completedCount >= tier.requiredActions) {
        return tier;
      }
    }
    return null;
  }

  getRewardForMember(programId: string, memberId: string): RewardTier | null {
    const key = `${programId}:${memberId}`;
    const progress = this.members.get(key);
    if (!progress) return null;
    return progress.currentCycle.currentTier;
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  getProgramStats(programId: string): ProgramStats {
    const program = this.programs.get(programId);
    if (!program) throw new Error("Program not found");

    const members = this.listMembers(programId);
    const totalMembers = members.length;

    // Track platform usage
    const platformCounts: Record<string, number> = {};
    let totalActions = 0;
    let activeMembers = 0;

    // Track tier distribution
    const tierCounts: Record<string, number> = {};
    for (const tier of program.tiers) {
      tierCounts[tier.id] = 0;
    }

    // Count completions for average
    let totalCompletionPct = 0;

    for (const member of members) {
      const actions = member.currentCycle.completedActions.filter(
        (a) => a.status !== "rejected"
      );
      totalActions += actions.length + (member.totalActionsAllTime - actions.length);

      if (actions.length > 0) {
        activeMembers += 1;
      }

      // Count platform usage
      for (const action of actions) {
        platformCounts[action.platformId] = (platformCounts[action.platformId] ?? 0) + 1;
      }

      // Track tier
      if (member.currentCycle.currentTier) {
        tierCounts[member.currentCycle.currentTier.id] =
          (tierCounts[member.currentCycle.currentTier.id] ?? 0) + 1;
      }

      // Completion rate: actions done / max tier's required actions
      const maxTierActions = program.tiers[program.tiers.length - 1]?.requiredActions ?? 1;
      totalCompletionPct += Math.min(100, (actions.length / maxTierActions) * 100);
    }

    const mostPopularPlatforms = Object.entries(platformCounts)
      .map(([platformId, count]) => ({ platformId, count }))
      .sort((a, b) => b.count - a.count);

    const tierDistribution = program.tiers.map((tier) => ({
      tierId: tier.id,
      tierName: tier.name,
      count: tierCounts[tier.id] ?? 0,
    }));

    return {
      totalMembers,
      avgCompletionRate: totalMembers > 0 ? Math.round(totalCompletionPct / totalMembers) : 0,
      mostPopularPlatforms,
      tierDistribution,
      totalActionsSubmitted: totalActions,
      activeMembers,
    };
  }

  getBusinessStats(businessId: string): BusinessStats {
    const programs = this.listPrograms(businessId);
    const activePrograms = programs.filter((p) => p.status === "active").length;

    let totalMembers = 0;
    let totalActions = 0;
    let totalCompletionPct = 0;
    let memberCount = 0;

    for (const program of programs) {
      const members = this.listMembers(program.id);
      totalMembers += members.length;

      for (const member of members) {
        totalActions += member.totalActionsAllTime;
        const maxTierActions = program.tiers[program.tiers.length - 1]?.requiredActions ?? 1;
        const actions = member.currentCycle.completedActions.filter(
          (a) => a.status !== "rejected"
        ).length;
        totalCompletionPct += Math.min(100, (actions / maxTierActions) * 100);
        memberCount += 1;
      }
    }

    return {
      totalPrograms: programs.length,
      activePrograms,
      totalMembers,
      totalActionsAllTime: totalActions,
      avgCompletionRate: memberCount > 0 ? Math.round(totalCompletionPct / memberCount) : 0,
    };
  }

  // ── Internal Helpers ──────────────────────────────────────────────────────

  private recalculateProgress(progress: MemberProgress, program: PerkProgram): void {
    const validActions = progress.currentCycle.completedActions.filter(
      (a) => a.status !== "rejected"
    );
    const completedCount = validActions.length;

    const currentTier = this.calculateTier(completedCount, program.tiers);
    progress.currentCycle.currentTier = currentTier;

    // Find next tier
    const sortedTiers = [...program.tiers].sort(
      (a, b) => a.requiredActions - b.requiredActions
    );
    let nextTier: RewardTier | null = null;
    for (const tier of sortedTiers) {
      if (completedCount < tier.requiredActions) {
        nextTier = tier;
        break;
      }
    }
    progress.currentCycle.nextTier = nextTier;

    // Calculate actions to next tier
    if (nextTier) {
      progress.currentCycle.actionsToNextTier = nextTier.requiredActions - completedCount;
    } else {
      progress.currentCycle.actionsToNextTier = 0;
    }

    // Calculate overall progress (0-100)
    const maxRequired = sortedTiers.length > 0
      ? sortedTiers[sortedTiers.length - 1].requiredActions
      : 1;
    progress.currentCycle.progress = Math.min(
      100,
      Math.round((completedCount / maxRequired) * 100)
    );
  }

  // ── Cash Back Management ──────────────────────────────────────────────────

  requestCashBack(
    programId: string,
    memberId: string,
    method: CashBackPayout["method"],
    methodDetails: string
  ): CashBackPayout {
    const program = this.programs.get(programId);
    if (!program) throw new Error("Program not found");

    const key = `${programId}:${memberId}`;
    const progress = this.members.get(key);
    if (!progress) throw new Error("Member not found in this program");

    // Validate the member has completed a tier
    if (!progress.currentCycle.currentTier) {
      throw new Error("Member has not completed any tier yet");
    }

    // For one-time programs, check they are actually completed
    if (program.cycle === "one_time" && !progress.oneTimeCompleted) {
      throw new Error("One-time program not yet completed");
    }

    // Check for deadline expiration on one-time service programs
    if (program.serviceDetails?.deadlineDays) {
      const enrolled = new Date(progress.joinedAt);
      const deadline = new Date(enrolled);
      deadline.setDate(deadline.getDate() + program.serviceDetails.deadlineDays);
      if (new Date() > deadline) {
        throw new Error("Cash back request deadline has passed");
      }
    }

    const tier = progress.currentCycle.currentTier;
    const validActions = progress.currentCycle.completedActions.filter(
      (a) => a.status !== "rejected"
    );

    // Determine cash back amount
    let amount = tier.reward.value;
    if (tier.reward.type === "cash_back") {
      amount = tier.reward.value;
    } else if (program.serviceDetails) {
      // For service programs, use the service details cash back amount
      if (program.serviceDetails.cashBackPercentage && program.serviceDetails.jobValue) {
        amount = Math.round(program.serviceDetails.jobValue * program.serviceDetails.cashBackPercentage / 100);
      } else {
        amount = program.serviceDetails.cashBackAmount;
      }
    }

    const payout: CashBackPayout = {
      id: generateId("pyt"),
      programId,
      memberId,
      memberName: progress.memberName,
      memberEmail: progress.memberEmail,
      amount,
      method,
      methodDetails,
      status: "pending",
      tierReached: tier.name,
      actionsCompleted: validActions.length,
      requestedAt: new Date().toISOString(),
      approvedAt: null,
      sentAt: null,
      confirmedAt: null,
      notes: "",
    };

    this.cashBackPayouts.set(payout.id, payout);
    return payout;
  }

  approveCashBack(payoutId: string): CashBackPayout {
    const payout = this.cashBackPayouts.get(payoutId);
    if (!payout) throw new Error("Payout not found");
    if (payout.status !== "pending") throw new Error("Payout is not pending");

    payout.status = "approved";
    payout.approvedAt = new Date().toISOString();
    this.cashBackPayouts.set(payoutId, payout);
    return payout;
  }

  markCashBackSent(payoutId: string, notes?: string): CashBackPayout {
    const payout = this.cashBackPayouts.get(payoutId);
    if (!payout) throw new Error("Payout not found");
    if (payout.status !== "approved") throw new Error("Payout must be approved before sending");

    payout.status = "sent";
    payout.sentAt = new Date().toISOString();
    if (notes) payout.notes = notes;
    this.cashBackPayouts.set(payoutId, payout);
    return payout;
  }

  confirmCashBackReceived(payoutId: string): CashBackPayout {
    const payout = this.cashBackPayouts.get(payoutId);
    if (!payout) throw new Error("Payout not found");
    if (payout.status !== "sent") throw new Error("Payout must be sent before confirming receipt");

    payout.status = "confirmed";
    payout.confirmedAt = new Date().toISOString();
    this.cashBackPayouts.set(payoutId, payout);
    return payout;
  }

  listCashBackPayouts(programId?: string, status?: CashBackPayout["status"]): CashBackPayout[] {
    const results: CashBackPayout[] = [];
    for (const payout of this.cashBackPayouts.values()) {
      if (programId && payout.programId !== programId) continue;
      if (status && payout.status !== status) continue;
      results.push(payout);
    }
    return results;
  }

  getCashBackStats(businessId: string): CashBackStats {
    const programs = this.listPrograms(businessId);
    const programIds = new Set(programs.map((p) => p.id));

    let totalPaidOut = 0;
    let totalPending = 0;
    let totalApproved = 0;
    let payoutCount = 0;

    for (const payout of this.cashBackPayouts.values()) {
      if (!programIds.has(payout.programId)) continue;
      payoutCount += 1;

      if (payout.status === "confirmed" || payout.status === "sent") {
        totalPaidOut += payout.amount;
      }
      if (payout.status === "pending") {
        totalPending += payout.amount;
      }
      if (payout.status === "approved") {
        totalApproved += payout.amount;
      }
    }

    return {
      totalPaidOut,
      totalPending,
      totalApproved,
      averagePerCustomer: payoutCount > 0 ? Math.round(totalPaidOut / payoutCount) : 0,
      payoutCount,
    };
  }

  // ── Testing Helpers ───────────────────────────────────────────────────────

  /** Clear all data. For testing only. */
  _reset(): void {
    this.programs.clear();
    this.members.clear();
    this.actions.clear();
    this.cashBackPayouts.clear();
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const perkProgramManager = new PerkProgramManager();
