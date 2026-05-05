/**
 * Shared interface for platform-verification adapters.
 *
 * Every social platform we verify against (Instagram, TikTok,
 * Facebook, …) exposes the same shape so the verification engine
 * can swap mock-vs-real without conditional logic. The router in
 * `platform-router.ts` picks the implementation based on env at
 * module load.
 *
 * Design principle: this interface is the smallest viable API for
 * the use cases we actually have today (verify a post URL claimed
 * as proof). Engagement metrics, follower growth, content
 * recommendations — all live elsewhere; that scope creep is what
 * killed every internal "social SDK" project we benchmarked
 * against.
 */

export type PlatformId = "instagram" | "tiktok" | "facebook";

export interface PlatformPost {
  /** Platform-native id (Instagram media id, TikTok video id, etc.) */
  id: string;
  platform: PlatformId;
  /** The author's platform-native user id. Used for owner-match check. */
  ownerId: string;
  /** Optional handle if the API surfaces it. */
  ownerHandle?: string;
  /** Post body text — caption / desc / status — already concatenated. */
  caption: string;
  /** Hashtags extracted from caption + (where applicable) a separate field. */
  hashtags: string[];
  /** Mentions (@-handles) extracted from caption. */
  mentions: string[];
  /** Best-effort permalink the customer can show at redemption. */
  permalink?: string;
  /** ISO-8601 timestamp the post was created. */
  createdAt: string;
  /** Free-form metadata an adapter may include for ML/anti-fraud signals. */
  meta?: Record<string, unknown>;
}

export interface BusinessIdentity {
  /** The shop's display name. We look for this in caption + mentions. */
  name: string;
  /** Configured social handles per platform. The match list. */
  handles: string[];
  /** Hashtags the shop has configured for campaigns. */
  hashtags: string[];
}

export interface VerificationEvidence {
  /** Did the post exist when we checked? */
  exists: boolean;
  /** Does the customer's connected account own this post? */
  ownerMatches: boolean;
  /** Does the post mention/tag the business? */
  mentionsBusiness: boolean;
  /** FTC-required disclosure present? (#ad / #sponsored / similar) */
  hasFtcDisclosure: boolean;
  /** Free-form notes the engine may surface in the audit log. */
  notes?: string[];
  /** The full post object for downstream fraud-scoring. */
  post?: PlatformPost;
}

/**
 * Adapter interface. Each implementation (instagram.ts,
 * instagram-mock.ts, etc.) implements this — the router picks one.
 */
export interface PlatformVerifier {
  readonly platform: PlatformId;

  /** Whether this adapter requires the customer to have OAuth-connected
   *  their account before submission. Always true for real adapters;
   *  the mock returns true so behavior matches in dev. */
  readonly requiresOAuth: boolean;

  /** Tells the verification engine whether this adapter is talking
   *  to the real platform or a deterministic mock. Used in admin
   *  diagnostics and to refuse production-redemption when we'd be
   *  issuing perks based on fake data. */
  readonly isMock: boolean;

  /**
   * Parse a URL into a media id. Returns null if the URL doesn't
   * look like a post on this platform.
   */
  parseMediaId(url: string): string | null;

  /**
   * Fetch the post by id. Returns null if it doesn't exist or we
   * can't see it (private account, deleted, etc.). Adapter is
   * responsible for caching via platform_post_cache.
   */
  fetchPost(args: {
    mediaId: string;
    /** Customer's OAuth access token for this platform. */
    accessToken?: string;
    /** Force a fresh fetch (skips cache). Used at redemption time. */
    bypassCache?: boolean;
  }): Promise<PlatformPost | null>;

  /**
   * Run the full verification check. Composes parseMediaId +
   * fetchPost + the matchers below. Most callers use this rather
   * than the primitives.
   */
  verify(args: {
    proofUrl: string;
    accessToken?: string;
    business: BusinessIdentity;
    customerOwnerId?: string;
    bypassCache?: boolean;
  }): Promise<VerificationEvidence>;
}
