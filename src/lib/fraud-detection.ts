// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Content Fraud & Abuse Detection Engine
// Detects duplicate submissions, rapid-fire abuse, self-reviews, bot-like
// patterns, low-quality proofs, engagement manipulation, and more.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Types ──────────────────────────────────────────────────────────────────

export type FraudSignal =
  | "duplicate_submission"
  | "rapid_fire"
  | "self_review"
  | "suspicious_pattern"
  | "low_quality_proof"
  | "engagement_manipulation"
  | "copy_paste_content"
  | "account_age";

export interface FraudCheck {
  submissionId: string;
  passed: boolean;
  score: number; // 0-100, higher = more suspicious
  signals: FraudSignal[];
  details: string[];
  action: "auto_approve" | "manual_review" | "auto_reject" | "flag";
}

export interface UserRiskProfile {
  userId: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  trustScore: number; // 0-100, higher = more trustworthy
  flagCount: number;
  totalSubmissions: number;
  approvedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  rapidFireCount: number;
  avgTimeBetweenSubmissions: number | null; // minutes, null if < 2 submissions
  accountAgeRisk: boolean;
  recentFlagRate: number; // fraction of recent submissions flagged (0-1)
}

export interface SubmissionInput {
  id: string;
  userId: string;
  campaignId: string;
  businessId: string;
  proofUrl: string;
  proofType: "screenshot" | "url" | "video" | "api_verified";
  content?: string; // Text content if applicable (review text, post caption)
  submittedAt: string; // ISO 8601
  platformId?: string;
  imageSize?: { width: number; height: number }; // For screenshot quality check
  contentLength?: number; // Character count for text submissions
}

export interface UserHistory {
  userId: string;
  accountCreatedAt: string; // ISO 8601
  submissions: readonly SubmissionRecord[];
  ownedBusinessIds: readonly string[]; // Business IDs owned by this user
}

export interface SubmissionRecord {
  id: string;
  campaignId: string;
  businessId: string;
  proofUrl: string;
  content?: string;
  submittedAt: string; // ISO 8601
  status: "pending" | "approved" | "rejected" | "expired";
  flagged: boolean;
  signals: FraudSignal[];
}

export interface CampaignData {
  campaignId: string;
  businessId: string;
  allSubmissions: readonly SubmissionRecord[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Weight of each fraud signal in the overall score. */
const SIGNAL_WEIGHTS: Record<FraudSignal, number> = {
  duplicate_submission: 40,
  rapid_fire: 25,
  self_review: 50,
  suspicious_pattern: 30,
  low_quality_proof: 15,
  engagement_manipulation: 35,
  copy_paste_content: 30,
  account_age: 20,
};

/** Default minimum time window (in minutes) for rapid-fire detection. */
const DEFAULT_RAPID_FIRE_WINDOW = 15;

/** Maximum number of submissions allowed within the rapid-fire window. */
const RAPID_FIRE_THRESHOLD = 5;

/** Default minimum account age in days before submissions are trusted. */
const DEFAULT_MIN_ACCOUNT_AGE_DAYS = 3;

/** Minimum screenshot dimensions (px) to be considered valid. */
const MIN_SCREENSHOT_WIDTH = 300;
const MIN_SCREENSHOT_HEIGHT = 300;

/** Minimum character count for text-based submissions (reviews, captions). */
const MIN_TEXT_LENGTH = 20;

/** Similarity threshold for copy-paste detection (0-1). */
const COPY_PASTE_SIMILARITY_THRESHOLD = 0.85;

// ─── In-Memory State ────────────────────────────────────────────────────────

/**
 * In-memory cache of known proof URLs for fast duplicate detection.
 * In production this would be backed by a database index.
 */
const knownProofUrls = new Map<string, { submissionId: string; userId: string }>();
const MAX_KNOWN_URLS = 100_000;

const contentFingerprints = new Map<string, string[]>();
const MAX_FINGERPRINTS = 50_000;

/**
 * Inverted index of word trigram shingles → submission IDs.
 * Used for O(1) candidate lookup in near-duplicate detection,
 * avoiding O(n) pairwise similarity comparisons.
 */
const shingleIndex = new Map<string, Set<string>>();
const submissionContent = new Map<string, string>(); // submissionId → original content
const MAX_SHINGLE_ENTRIES = 100_000;
const MAX_SUBMISSION_CONTENT = 100_000;

/** Extract word trigrams from normalized text for near-duplicate candidate lookup. */
function extractShingles(text: string): string[] {
  const words = fingerprint(text).split(" ").filter(w => w.length > 0);
  if (words.length < 3) return [words.join(" ")];
  const shingles: string[] = [];
  for (let i = 0; i <= words.length - 3; i++) {
    shingles.push(words.slice(i, i + 3).join(" "));
  }
  return shingles;
}

/** Find submission IDs that share enough shingles to be near-duplicate candidates. */
function findCandidates(text: string, minSharedShingles: number = 2): string[] {
  const shingles = extractShingles(text);
  const candidateCounts = new Map<string, number>();
  for (const shingle of shingles) {
    const ids = shingleIndex.get(shingle);
    if (ids) {
      for (const id of ids) {
        candidateCounts.set(id, (candidateCounts.get(id) ?? 0) + 1);
      }
    }
  }
  const results: string[] = [];
  for (const [id, count] of candidateCounts) {
    if (count >= minSharedShingles) results.push(id);
  }
  return results;
}

/** Index a submission's content shingles for future near-duplicate lookups. */
function indexContent(submissionId: string, content: string): void {
  const shingles = extractShingles(content);
  submissionContent.set(submissionId, content);
  // Evict oldest entries if submissionContent grows too large
  if (submissionContent.size > MAX_SUBMISSION_CONTENT) {
    const evictCount = Math.floor(MAX_SUBMISSION_CONTENT * 0.1);
    const keys = submissionContent.keys();
    for (let i = 0; i < evictCount; i++) {
      const key = keys.next().value;
      if (key !== undefined) submissionContent.delete(key);
    }
    console.warn(`[FraudDetection] submissionContent exceeded ${MAX_SUBMISSION_CONTENT}, evicted ${evictCount} entries`);
  }
  for (const shingle of shingles) {
    let ids = shingleIndex.get(shingle);
    if (!ids) {
      ids = new Set();
      shingleIndex.set(shingle, ids);
    }
    ids.add(submissionId);
  }
  // Evict oldest shingle entries if index grows too large
  if (shingleIndex.size > MAX_SHINGLE_ENTRIES) {
    const evictCount = Math.floor(MAX_SHINGLE_ENTRIES * 0.1);
    const keysToDelete = Array.from(shingleIndex.keys()).slice(0, evictCount);
    for (const key of keysToDelete) {
      shingleIndex.delete(key);
    }
    console.warn(`[FraudDetection] shingleIndex exceeded ${MAX_SHINGLE_ENTRIES}, evicted ${evictCount} entries`);
  }
}

// ─── Utility Functions ──────────────────────────────────────────────────────

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Strip tracking params and fragments for comparison
    parsed.hash = "";
    parsed.searchParams.delete("utm_source");
    parsed.searchParams.delete("utm_medium");
    parsed.searchParams.delete("utm_campaign");
    parsed.searchParams.delete("utm_content");
    parsed.searchParams.delete("utm_term");
    parsed.searchParams.delete("ref");
    parsed.searchParams.delete("fbclid");
    parsed.searchParams.delete("gclid");
    parsed.searchParams.delete("dclid");
    parsed.searchParams.delete("msclkid");
    parsed.searchParams.delete("twclid");
    parsed.searchParams.delete("igshid");
    parsed.searchParams.delete("share_id");
    parsed.searchParams.delete("_ga");
    parsed.searchParams.delete("mc_cid");
    parsed.searchParams.delete("mc_eid");
    return parsed.toString().toLowerCase().replace(/\/+$/, "");
  } catch {
    return url.toLowerCase().trim().replace(/\/+$/, "");
  }
}

/**
 * Generate a fingerprint from text content for copy-paste detection.
 * Normalizes whitespace, case, and common variations.
 */
function fingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // strip punctuation
    .replace(/\s+/g, " ") // normalize whitespace
    .trim();
}

/**
 * Simple string similarity using bigram overlap (Dice coefficient).
 * Returns 0-1 where 1 is identical.
 */
function stringSimilarity(a: string, b: string): number {
  const fa = fingerprint(a);
  const fb = fingerprint(b);

  if (fa === fb) return 1;
  if (fa.length < 2 || fb.length < 2) return 0;

  const bigramsA = new Set<string>();
  for (let i = 0; i < fa.length - 1; i++) {
    bigramsA.add(fa.substring(i, i + 2));
  }

  const bigramsB = new Set<string>();
  for (let i = 0; i < fb.length - 1; i++) {
    bigramsB.add(fb.substring(i, i + 2));
  }

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }

  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

function parseISODate(iso: string): Date {
  return new Date(iso);
}

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime());
  return ms / (1000 * 60 * 60 * 24);
}

function minutesBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime());
  return ms / (1000 * 60);
}

// ─── Individual Check Functions ─────────────────────────────────────────────

/**
 * Check if a proof URL has been submitted before.
 * Considers both the in-memory store and the provided existing submissions.
 */
export function checkDuplicate(
  proofUrl: string,
  existingSubmissions: readonly SubmissionRecord[]
): boolean {
  const normalized = normalizeUrl(proofUrl);

  // Check in-memory store
  if (knownProofUrls.has(normalized)) {
    return true;
  }

  // Check against provided submissions
  for (const sub of existingSubmissions) {
    if (normalizeUrl(sub.proofUrl) === normalized) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a user is submitting too many proofs in a short time window.
 * Returns true if the submission rate exceeds the threshold.
 */
export function checkRapidFire(
  _userId: string,
  recentSubmissions: readonly SubmissionRecord[],
  windowMinutes: number = DEFAULT_RAPID_FIRE_WINDOW
): boolean {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

  const submissionsInWindow = recentSubmissions.filter(sub => {
    const subDate = parseISODate(sub.submittedAt);
    return sub.id !== undefined && subDate >= windowStart;
  });

  return submissionsInWindow.length >= RAPID_FIRE_THRESHOLD;
}

/**
 * Check if an account is too new to be trusted.
 * Returns true if the account is younger than the minimum age.
 */
export function checkAccountAge(
  accountCreatedAt: string,
  minAgeDays: number = DEFAULT_MIN_ACCOUNT_AGE_DAYS
): boolean {
  const created = parseISODate(accountCreatedAt);
  const now = new Date();
  const ageDays = daysBetween(created, now);
  return ageDays < minAgeDays;
}

/**
 * Check if a user is reviewing their own business.
 */
function checkSelfReview(
  _userId: string,
  businessId: string,
  ownedBusinessIds: readonly string[]
): boolean {
  return ownedBusinessIds.includes(businessId);
}

/**
 * Check if the proof quality meets minimum standards.
 */
function checkLowQualityProof(submission: SubmissionInput): {
  isLow: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Check screenshot dimensions
  if (
    submission.proofType === "screenshot" &&
    submission.imageSize
  ) {
    if (
      submission.imageSize.width < MIN_SCREENSHOT_WIDTH ||
      submission.imageSize.height < MIN_SCREENSHOT_HEIGHT
    ) {
      reasons.push(
        `Screenshot too small (${submission.imageSize.width}x${submission.imageSize.height}px, minimum ${MIN_SCREENSHOT_WIDTH}x${MIN_SCREENSHOT_HEIGHT}px)`
      );
    }
  }

  // Check text content length
  if (submission.content !== undefined && submission.content !== null) {
    const trimmed = submission.content.trim();
    if (trimmed.length < MIN_TEXT_LENGTH && trimmed.length > 0) {
      reasons.push(
        `Content too short (${trimmed.length} characters, minimum ${MIN_TEXT_LENGTH})`
      );
    }
  }

  // Check contentLength if provided directly
  if (
    submission.contentLength !== undefined &&
    submission.contentLength < MIN_TEXT_LENGTH &&
    submission.contentLength > 0
  ) {
    reasons.push(
      `Content length below minimum (${submission.contentLength} characters, minimum ${MIN_TEXT_LENGTH})`
    );
  }

  // Check for empty or placeholder proof URLs
  const url = submission.proofUrl.trim().toLowerCase();
  if (
    !url ||
    url === "http://" ||
    url === "https://" ||
    url === "n/a" ||
    url === "none" ||
    url === "test" ||
    url.length < 10
  ) {
    reasons.push("Proof URL appears to be invalid or a placeholder");
  }

  return { isLow: reasons.length > 0, reasons };
}

/**
 * Check for copy-paste content across submissions.
 * Returns true if the content is too similar to previous submissions.
 */
function checkCopyPasteContent(
  content: string | undefined,
  _existingSubmissions: readonly SubmissionRecord[],
  _currentUserId: string
): { isCopyPaste: boolean; similarSubmissionId?: string } {
  if (!content || content.trim().length < MIN_TEXT_LENGTH) {
    return { isCopyPaste: false };
  }

  const fp = fingerprint(content);

  // Check in-memory fingerprint store for exact matches (O(1))
  const existingIds = contentFingerprints.get(fp);
  if (existingIds && existingIds.length > 0) {
    return { isCopyPaste: true, similarSubmissionId: existingIds[0] };
  }

  // Use shingle index to find near-duplicate candidates (O(shingles) instead of O(n))
  const candidates = findCandidates(content);
  for (const candidateId of candidates) {
    const candidateContent = submissionContent.get(candidateId);
    if (!candidateContent) continue;

    const similarity = stringSimilarity(content, candidateContent);
    if (similarity >= COPY_PASTE_SIMILARITY_THRESHOLD) {
      return { isCopyPaste: true, similarSubmissionId: candidateId };
    }
  }

  return { isCopyPaste: false };
}

/**
 * Check for suspicious patterns that suggest bot-like behavior.
 * Looks at submission timing patterns, repetitive behavior, etc.
 */
function checkSuspiciousPattern(
  _userId: string,
  userSubmissions: readonly SubmissionRecord[]
): { isSuspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (userSubmissions.length < 3) {
    return { isSuspicious: false, reasons };
  }

  // Sort submissions by time
  const sorted = [...userSubmissions].sort(
    (a, b) => parseISODate(a.submittedAt).getTime() - parseISODate(b.submittedAt).getTime()
  );

  // Check for machine-like precise intervals
  if (sorted.length >= 4) {
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = parseISODate(sorted[i - 1].submittedAt);
      const curr = parseISODate(sorted[i].submittedAt);
      intervals.push(minutesBetween(prev, curr));
    }

    // Check if intervals are suspiciously uniform (bot-like behavior)
    const avgInterval =
      intervals.reduce((s, v) => s + v, 0) / intervals.length;
    if (avgInterval > 0) {
      const variance =
        intervals.reduce((s, v) => s + Math.pow(v - avgInterval, 2), 0) /
        intervals.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / avgInterval;

      // Very low variance in timing = likely automated
      if (coefficientOfVariation < 0.05 && intervals.length >= 3) {
        reasons.push(
          `Submission intervals are suspiciously uniform (avg ${avgInterval.toFixed(1)}min, CV ${(coefficientOfVariation * 100).toFixed(1)}%)`
        );
      }
    }
  }

  // Check for high rejection rate
  const rejected = userSubmissions.filter(s => s.status === "rejected").length;
  const rejectionRate = rejected / userSubmissions.length;
  if (rejectionRate > 0.5 && userSubmissions.length >= 5) {
    reasons.push(
      `High rejection rate (${(rejectionRate * 100).toFixed(0)}% of ${userSubmissions.length} submissions)`
    );
  }

  // Check for submitting to many different campaigns in a short time
  const recentWindow = 24 * 60; // 24 hours in minutes
  const now = new Date();
  const recent = sorted.filter(
    s => minutesBetween(parseISODate(s.submittedAt), now) < recentWindow
  );
  const uniqueCampaigns = new Set(recent.map(s => s.campaignId));
  if (uniqueCampaigns.size > 10) {
    reasons.push(
      `Submitted to ${uniqueCampaigns.size} different campaigns in 24 hours`
    );
  }

  // Check for submitting to the same campaign many times
  const campaignCounts = new Map<string, number>();
  for (const sub of userSubmissions) {
    campaignCounts.set(sub.campaignId, (campaignCounts.get(sub.campaignId) ?? 0) + 1);
  }
  for (const [cid, count] of campaignCounts) {
    if (count > 10) {
      reasons.push(
        `${count} submissions for a single campaign (${cid})`
      );
    }
  }

  return { isSuspicious: reasons.length > 0, reasons };
}

/**
 * Check for engagement manipulation signals.
 * In a production system, this would query social media APIs for anomalies.
 * For now, we flag based on heuristic patterns in submission history.
 */
function checkEngagementManipulation(
  userSubmissions: readonly SubmissionRecord[]
): { isManipulated: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Flag if user only submits engagement-type proofs (likes, follows)
  // with URLs that look auto-generated or identical structures
  const urls = userSubmissions.map(s => s.proofUrl).filter(Boolean);
  if (urls.length >= 5) {
    // Check for templated URLs (all look the same pattern)
    const urlPatterns = urls.map(u => {
      try {
        const parsed = new URL(u);
        return `${parsed.hostname}${parsed.pathname.replace(/[0-9]+/g, "N")}`;
      } catch {
        return u.replace(/[0-9]+/g, "N");
      }
    });

    const patternCounts = new Map<string, number>();
    for (const p of urlPatterns) {
      patternCounts.set(p, (patternCounts.get(p) ?? 0) + 1);
    }

    for (const [, count] of patternCounts) {
      const ratio = count / urls.length;
      if (ratio > 0.8 && count >= 5) {
        reasons.push(
          `${count}/${urls.length} proof URLs follow the same pattern, suggesting automation`
        );
        break;
      }
    }
  }

  // Flag: many "approved" submissions with no actual engagement growth
  // (This is a placeholder for API-based verification in production)

  return { isManipulated: reasons.length > 0, reasons };
}

// ─── Score Calculation ──────────────────────────────────────────────────────

/**
 * Calculate an aggregate fraud score from detected signals.
 * Score 0-100 where higher = more suspicious.
 * Uses diminishing returns for multiple signals of the same type.
 */
export function calculateFraudScore(signals: FraudSignal[]): number {
  if (signals.length === 0) return 0;

  // Count occurrences of each signal
  const signalCounts = new Map<FraudSignal, number>();
  for (const s of signals) {
    signalCounts.set(s, (signalCounts.get(s) ?? 0) + 1);
  }

  let totalScore = 0;

  for (const [signal, count] of signalCounts) {
    const baseWeight = SIGNAL_WEIGHTS[signal];
    // Diminishing returns for repeated signals of the same type
    // Math.log2(1) = 0, so single occurrence = baseWeight exactly
    // Guard against count <= 0 which would produce -Infinity
    const safeCount = Math.max(1, count);
    const effectiveWeight = baseWeight * (1 + Math.log2(safeCount) * 0.3);
    totalScore += effectiveWeight;
  }

  // Cap at 100
  return Math.min(100, Math.round(totalScore));
}

/**
 * Determine the recommended action based on fraud score.
 */
export function getRecommendedAction(
  score: number
): "auto_approve" | "manual_review" | "auto_reject" | "flag" {
  if (score < 20) return "auto_approve";
  if (score <= 60) return "manual_review";
  if (score <= 80) return "flag";
  return "auto_reject";
}

// ─── Main Check Function ────────────────────────────────────────────────────

/**
 * Run all fraud checks on a submission.
 * Returns a comprehensive FraudCheck with all detected signals,
 * a combined score, and a recommended action.
 */
export function checkSubmission(
  submission: SubmissionInput,
  userHistory: UserHistory,
  campaignData: CampaignData
): FraudCheck {
  const signals: FraudSignal[] = [];
  const details: string[] = [];

  // 1. Duplicate submission check
  const isDuplicate = checkDuplicate(submission.proofUrl, campaignData.allSubmissions);
  if (isDuplicate) {
    signals.push("duplicate_submission");
    details.push(`Proof URL "${submission.proofUrl}" has been submitted before.`);
  }

  // 2. Rapid-fire check
  const userRecentSubmissions = userHistory.submissions.filter(
    s => s.id !== submission.id
  );
  const isRapidFire = checkRapidFire(
    submission.userId,
    userRecentSubmissions
  );
  if (isRapidFire) {
    signals.push("rapid_fire");
    details.push(
      `User has exceeded ${RAPID_FIRE_THRESHOLD} submissions within ${DEFAULT_RAPID_FIRE_WINDOW} minutes.`
    );
  }

  // 3. Self-review check
  const isSelfReview = checkSelfReview(
    submission.userId,
    submission.businessId,
    userHistory.ownedBusinessIds
  );
  if (isSelfReview) {
    signals.push("self_review");
    details.push(
      "User appears to be reviewing their own business."
    );
  }

  // 4. Account age check
  const isNewAccount = checkAccountAge(userHistory.accountCreatedAt);
  if (isNewAccount) {
    signals.push("account_age");
    const ageDays = daysBetween(
      parseISODate(userHistory.accountCreatedAt),
      new Date()
    );
    details.push(
      `Account is only ${ageDays.toFixed(1)} days old (minimum ${DEFAULT_MIN_ACCOUNT_AGE_DAYS} days recommended).`
    );
  }

  // 5. Low quality proof check
  const qualityCheck = checkLowQualityProof(submission);
  if (qualityCheck.isLow) {
    signals.push("low_quality_proof");
    details.push(...qualityCheck.reasons);
  }

  // 6. Copy-paste content check
  const copyPasteCheck = checkCopyPasteContent(
    submission.content,
    campaignData.allSubmissions,
    submission.userId
  );
  if (copyPasteCheck.isCopyPaste) {
    signals.push("copy_paste_content");
    details.push(
      `Content is nearly identical to submission ${copyPasteCheck.similarSubmissionId ?? "unknown"}.`
    );
  }

  // 7. Suspicious pattern check
  const patternCheck = checkSuspiciousPattern(
    submission.userId,
    userRecentSubmissions
  );
  if (patternCheck.isSuspicious) {
    signals.push("suspicious_pattern");
    details.push(...patternCheck.reasons);
  }

  // 8. Engagement manipulation check
  const manipulationCheck = checkEngagementManipulation(userRecentSubmissions);
  if (manipulationCheck.isManipulated) {
    signals.push("engagement_manipulation");
    details.push(...manipulationCheck.reasons);
  }

  // Calculate aggregate score and action
  const score = calculateFraudScore(signals);
  const action = getRecommendedAction(score);
  const passed = action === "auto_approve";

  // Register the proof URL in the in-memory store for future duplicate checks
  const normalizedUrl = normalizeUrl(submission.proofUrl);
  if (!knownProofUrls.has(normalizedUrl)) {
    knownProofUrls.set(normalizedUrl, {
      submissionId: submission.id,
      userId: submission.userId,
    });
    if (knownProofUrls.size > MAX_KNOWN_URLS) {
      // Evict oldest 10% of entries to prevent memory exhaustion
      const evictCount = Math.floor(MAX_KNOWN_URLS * 0.1);
      const keys = knownProofUrls.keys();
      for (let i = 0; i < evictCount; i++) {
        const key = keys.next().value;
        if (key !== undefined) knownProofUrls.delete(key);
      }
      console.warn(`[FraudDetection] knownProofUrls exceeded ${MAX_KNOWN_URLS}, evicted ${evictCount} entries`);
    }
  }

  // Register content fingerprint and shingle index
  if (submission.content && submission.content.trim().length >= MIN_TEXT_LENGTH) {
    const fp = fingerprint(submission.content);
    const existing = contentFingerprints.get(fp) ?? [];
    existing.push(submission.id);
    contentFingerprints.set(fp, existing);
    if (contentFingerprints.size > MAX_FINGERPRINTS) {
      // Evict oldest 10% of entries to prevent memory exhaustion
      const evictCount = Math.floor(MAX_FINGERPRINTS * 0.1);
      const keys = contentFingerprints.keys();
      for (let i = 0; i < evictCount; i++) {
        const key = keys.next().value;
        if (key !== undefined) contentFingerprints.delete(key);
      }
      console.warn(`[FraudDetection] contentFingerprints exceeded ${MAX_FINGERPRINTS}, evicted ${evictCount} entries`);
    }
    indexContent(submission.id, submission.content);
  }

  return {
    submissionId: submission.id,
    passed,
    score,
    signals,
    details,
    action,
  };
}

// ─── User Risk Profile ──────────────────────────────────────────────────────

/**
 * Build a risk profile for a user based on their submission history.
 * Useful for escalating review thresholds for repeat offenders
 * or fast-tracking trusted users.
 */
export function getUserRiskProfile(
  userId: string,
  submissionHistory: readonly SubmissionRecord[],
  accountCreatedAt?: string
): UserRiskProfile {
  const userSubs = [...submissionHistory];

  const totalSubmissions = userSubs.length;
  const approvedCount = userSubs.filter(s => s.status === "approved").length;
  const rejectedCount = userSubs.filter(s => s.status === "rejected").length;
  const flaggedSubs = userSubs.filter(s => s.flagged);
  const flagCount = flaggedSubs.length;

  // Count specific signal occurrences
  let duplicateCount = 0;
  let rapidFireCount = 0;
  for (const sub of userSubs) {
    if (sub.signals.includes("duplicate_submission")) duplicateCount++;
    if (sub.signals.includes("rapid_fire")) rapidFireCount++;
  }

  // Average time between submissions
  let avgTimeBetweenSubmissions: number | null = null;
  if (userSubs.length >= 2) {
    const sorted = [...userSubs].sort(
      (a, b) =>
        parseISODate(a.submittedAt).getTime() -
        parseISODate(b.submittedAt).getTime()
    );
    let totalMinutes = 0;
    for (let i = 1; i < sorted.length; i++) {
      totalMinutes += minutesBetween(
        parseISODate(sorted[i - 1].submittedAt),
        parseISODate(sorted[i].submittedAt)
      );
    }
    avgTimeBetweenSubmissions = totalMinutes / (sorted.length - 1);
  }

  // Recent flag rate (last 20 submissions)
  const recent = [...userSubs]
    .sort(
      (a, b) =>
        parseISODate(b.submittedAt).getTime() -
        parseISODate(a.submittedAt).getTime()
    )
    .slice(0, 20);
  const recentFlagRate =
    recent.length > 0
      ? recent.filter(s => s.flagged).length / recent.length
      : 0;

  // Account age risk
  const accountAgeRisk = accountCreatedAt
    ? checkAccountAge(accountCreatedAt, 7) // 7-day threshold for risk profile
    : false;

  // Calculate trust score (0-100, higher = more trustworthy)
  let trustScore = 50; // Start neutral

  if (totalSubmissions > 0) {
    // Approval rate boosts trust
    const approvalRate = approvedCount / totalSubmissions;
    trustScore += Math.round(approvalRate * 30); // Up to +30

    // Rejection rate decreases trust
    const rejectionRate = rejectedCount / totalSubmissions;
    trustScore -= Math.round(rejectionRate * 25); // Up to -25

    // Flag rate decreases trust
    const flagRate = flagCount / totalSubmissions;
    trustScore -= Math.round(flagRate * 20); // Up to -20

    // Volume bonus (more approved = more trusted)
    if (approvedCount >= 20) trustScore += 10;
    else if (approvedCount >= 10) trustScore += 5;
    else if (approvedCount >= 5) trustScore += 2;

    // Penalty for duplicates and rapid-fire
    trustScore -= duplicateCount * 5;
    trustScore -= rapidFireCount * 3;
  }

  // Account age penalty
  if (accountAgeRisk) trustScore -= 15;

  // Clamp to 0-100
  trustScore = Math.max(0, Math.min(100, trustScore));

  // Determine risk level
  let riskLevel: UserRiskProfile["riskLevel"];
  if (trustScore >= 70) riskLevel = "low";
  else if (trustScore >= 45) riskLevel = "medium";
  else if (trustScore >= 20) riskLevel = "high";
  else riskLevel = "critical";

  return {
    userId,
    riskLevel,
    trustScore,
    flagCount,
    totalSubmissions,
    approvedCount,
    rejectedCount,
    duplicateCount,
    rapidFireCount,
    avgTimeBetweenSubmissions,
    accountAgeRisk,
    recentFlagRate,
  };
}

// ─── Store Management (for in-memory state) ─────────────────────────────────

/**
 * Clear all in-memory fraud detection state.
 * Useful for testing or when resetting the system.
 */
export function clearFraudState(): void {
  knownProofUrls.clear();
  contentFingerprints.clear();
  shingleIndex.clear();
  submissionContent.clear();
}

/**
 * Seed the in-memory store with existing submission data.
 * Call this at startup to populate the duplicate-detection cache.
 */
export function seedFraudState(
  existingSubmissions: readonly SubmissionRecord[]
): void {
  for (const sub of existingSubmissions) {
    // Respect size limits during seeding to prevent memory exhaustion
    if (knownProofUrls.size >= MAX_KNOWN_URLS) {
      console.warn(`[FraudDetection] seedFraudState: knownProofUrls reached limit (${MAX_KNOWN_URLS}), skipping remaining URL entries`);
      break;
    }

    const normalizedUrl = normalizeUrl(sub.proofUrl);
    if (!knownProofUrls.has(normalizedUrl)) {
      knownProofUrls.set(normalizedUrl, {
        submissionId: sub.id,
        userId: "unknown", // We don't have userId in SubmissionRecord
      });
    }

    if (sub.content && sub.content.trim().length >= MIN_TEXT_LENGTH) {
      if (contentFingerprints.size < MAX_FINGERPRINTS) {
        const fp = fingerprint(sub.content);
        const existing = contentFingerprints.get(fp) ?? [];
        existing.push(sub.id);
        contentFingerprints.set(fp, existing);
        indexContent(sub.id, sub.content);
      }
    }
  }
}
