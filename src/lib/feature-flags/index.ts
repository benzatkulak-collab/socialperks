/**
 * Feature Flags — Gradual Rollout System
 *
 * Provides a full-featured flag system with:
 * - Global kill switch (enabled=false always off)
 * - Percentage-based gradual rollout with consistent hashing
 * - Audience segment targeting (role, plan, businessId, userId, custom)
 * - Multi-variant A/B testing
 * - CRUD for flag management
 * - Bulk evaluation for loading all flags at once
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Segment {
  type: "role" | "plan" | "businessId" | "userId" | "custom";
  operator: "eq" | "neq" | "in" | "nin";
  value: string | string[];
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetSegments: Segment[];
  variants: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FlagContext {
  userId?: string;
  businessId?: string;
  role?: string;
  plan?: string;
  custom?: Record<string, string>;
}

// ─── In-Memory Store ────────────────────────────────────────────────────────

const flags = new Map<string, FeatureFlag>();

// ─── Consistent Hash ────────────────────────────────────────────────────────

/**
 * Simple deterministic hash that maps a string to 0-99.
 * Uses FNV-1a inspired approach for good distribution.
 */
export function consistentHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash % 100;
}

// ─── Segment Matching ───────────────────────────────────────────────────────

function getContextValue(context: FlagContext, segment: Segment): string | undefined {
  switch (segment.type) {
    case "role":
      return context.role;
    case "plan":
      return context.plan;
    case "businessId":
      return context.businessId;
    case "userId":
      return context.userId;
    case "custom": {
      // For custom segments, value[0] is the key name if it's an array with operator context
      // But typically custom checks against all custom keys — we match if any custom value matches
      if (context.custom) {
        // Custom segments: the segment value is matched against all custom field values
        // We need a key to look up; use the first element of value array as the key
        // For simplicity, custom segments check context.custom values directly
        const values = Object.values(context.custom);
        // Return a synthetic value for matching — handled specially below
        return values.join(",");
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

function matchesSegment(context: FlagContext, segment: Segment): boolean {
  if (segment.type === "custom") {
    return matchesCustomSegment(context, segment);
  }

  const contextValue = getContextValue(context, segment);
  if (contextValue === undefined) return false;

  const segmentValues = Array.isArray(segment.value) ? segment.value : [segment.value];

  switch (segment.operator) {
    case "eq":
      return segmentValues.includes(contextValue);
    case "neq":
      return !segmentValues.includes(contextValue);
    case "in":
      return segmentValues.includes(contextValue);
    case "nin":
      return !segmentValues.includes(contextValue);
    default:
      return false;
  }
}

function matchesCustomSegment(context: FlagContext, segment: Segment): boolean {
  if (!context.custom) return false;
  const customValues = Object.values(context.custom);
  const segmentValues = Array.isArray(segment.value) ? segment.value : [segment.value];

  switch (segment.operator) {
    case "eq":
    case "in":
      return customValues.some((v) => segmentValues.includes(v));
    case "neq":
    case "nin":
      return customValues.every((v) => !segmentValues.includes(v));
    default:
      return false;
  }
}

// ─── Evaluation ─────────────────────────────────────────────────────────────

/**
 * Check if a feature flag is enabled for the given context.
 *
 * Evaluation order:
 * 1. If flag doesn't exist -> false
 * 2. If enabled === false -> false (kill switch)
 * 3. If segments exist and context provided -> must match at least one
 * 4. Check rollout percentage via consistent hash
 */
export function isEnabled(flagId: string, context?: FlagContext): boolean {
  const flag = flags.get(flagId);
  if (!flag) return false;

  // Kill switch
  if (!flag.enabled) return false;

  // Segment targeting: if segments exist, at least one must match
  if (flag.targetSegments.length > 0) {
    if (!context) return false;
    const anySegmentMatches = flag.targetSegments.some((seg) => matchesSegment(context, seg));
    if (!anySegmentMatches) return false;
  }

  // Rollout percentage
  if (flag.rolloutPercentage >= 100) return true;
  if (flag.rolloutPercentage <= 0) return false;

  const userId = context?.userId ?? "anonymous";
  const hash = consistentHash(flagId + userId);
  return hash < flag.rolloutPercentage;
}

/**
 * Get the variant value for a multi-variant flag.
 * Returns the variant selected by consistent hashing, or defaultValue.
 */
export function getVariant<T = unknown>(
  flagId: string,
  context?: FlagContext,
  defaultValue?: T
): T {
  const flag = flags.get(flagId);
  if (!flag || !flag.enabled) return defaultValue as T;

  // Check segments
  if (flag.targetSegments.length > 0) {
    if (!context) return defaultValue as T;
    const anyMatch = flag.targetSegments.some((seg) => matchesSegment(context, seg));
    if (!anyMatch) return defaultValue as T;
  }

  const variantKeys = Object.keys(flag.variants);
  if (variantKeys.length === 0) return defaultValue as T;

  const userId = context?.userId ?? "anonymous";
  const hash = consistentHash(flagId + userId);
  const variantIndex = hash % variantKeys.length;
  return flag.variants[variantKeys[variantIndex]] as T;
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

export function createFlag(config: Partial<FeatureFlag> & { id: string }): FeatureFlag {
  const now = new Date().toISOString();
  const flag: FeatureFlag = {
    id: config.id,
    name: config.name ?? config.id,
    description: config.description ?? "",
    enabled: config.enabled ?? true,
    rolloutPercentage: config.rolloutPercentage ?? 100,
    targetSegments: config.targetSegments ?? [],
    variants: config.variants ?? {},
    createdAt: config.createdAt ?? now,
    updatedAt: config.updatedAt ?? now,
  };
  flags.set(flag.id, flag);
  return flag;
}

export function updateFlag(flagId: string, updates: Partial<FeatureFlag>): FeatureFlag {
  const flag = flags.get(flagId);
  if (!flag) throw new Error(`Flag "${flagId}" not found`);

  const updated: FeatureFlag = {
    ...flag,
    ...updates,
    id: flag.id, // ID cannot be changed
    updatedAt: new Date().toISOString(),
  };
  flags.set(flagId, updated);
  return updated;
}

export function deleteFlag(flagId: string): boolean {
  return flags.delete(flagId);
}

export function listFlags(): FeatureFlag[] {
  return Array.from(flags.values());
}

export function getFlag(flagId: string): FeatureFlag | null {
  return flags.get(flagId) ?? null;
}

// ─── Bulk Evaluation ────────────────────────────────────────────────────────

/**
 * Evaluate all flags for a given context.
 * Returns a record mapping flag IDs to their evaluated value:
 * - boolean for simple flags
 * - variant value for multi-variant flags
 */
export function evaluateAll(context: FlagContext): Record<string, boolean | unknown> {
  const result: Record<string, boolean | unknown> = {};
  for (const flag of flags.values()) {
    if (Object.keys(flag.variants).length > 0) {
      result[flag.id] = getVariant(flag.id, context);
    } else {
      result[flag.id] = isEnabled(flag.id, context);
    }
  }
  return result;
}

// ─── Reset (for testing) ───────────────────────────────────────────────────

export function _resetFlags(): void {
  flags.clear();
}

// ─── Pre-defined Flags ──────────────────────────────────────────────────────

export function seedDefaultFlags(): void {
  createFlag({
    id: "new_onboarding_wizard",
    name: "New Onboarding Wizard",
    description: "Redesigned onboarding flow for new users",
    enabled: true,
    rolloutPercentage: 100,
    targetSegments: [],
    variants: {},
  });

  createFlag({
    id: "semantic_search",
    name: "Semantic Search",
    description: "AI-powered semantic search across campaigns and influencers",
    enabled: true,
    rolloutPercentage: 50,
    targetSegments: [],
    variants: {},
  });

  createFlag({
    id: "weekly_digest_v2",
    name: "Weekly Digest V2",
    description: "Redesigned weekly digest email with richer analytics",
    enabled: true,
    rolloutPercentage: 100,
    targetSegments: [
      { type: "plan", operator: "eq", value: "enterprise" },
    ],
    variants: {},
  });

  createFlag({
    id: "dark_mode_toggle",
    name: "Dark Mode Toggle",
    description: "User-facing dark mode toggle in settings",
    enabled: false,
    rolloutPercentage: 0,
    targetSegments: [],
    variants: {},
  });
}

// Seed defaults on module load
seedDefaultFlags();
