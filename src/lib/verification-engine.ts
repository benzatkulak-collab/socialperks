/**
 * Social Media Verification Engine
 *
 * Verifies that customers and influencers actually performed the marketing
 * actions they claim. Each platform has a dedicated verifier that will
 * integrate with real APIs in production; for now they simulate verification
 * with realistic confidence scores and delays.
 *
 * Fallback chain: API verification -> URL check -> Screenshot Analysis -> Manual review
 *
 * Storage: in-memory Map for verification results.
 */

import {
  analyzeScreenshotUrl,
  analyzeScreenshotBuffer,
  type ScreenshotAnalysis,
} from "./verification/screenshot-analyzer";

// ─── Types ──────────────────────────────────────────────────────────────────

export type VerificationStatus = "pending" | "verified" | "failed" | "manual_review";

export type VerificationMethod = "api" | "screenshot_ocr" | "url_check" | "manual";

export interface VerificationResult {
  submissionId: string;
  actionId: string;
  platformId: string;
  status: VerificationStatus;
  /** Confidence score from 0 (no confidence) to 1 (certain). */
  confidence: number;
  method: VerificationMethod;
  details: Record<string, unknown>;
  verifiedAt: string;
  /** Duration of verification in milliseconds. */
  durationMs: number;
}

export interface VerificationSubmission {
  submissionId: string;
  proofUrl: string;
  proofType: "screenshot" | "url" | "video" | "api_verified";
  actionId: string;
  platformId: string;
  metadata?: Record<string, unknown>;
}

export interface BatchVerificationResult {
  results: VerificationResult[];
  totalCount: number;
  verifiedCount: number;
  failedCount: number;
  manualReviewCount: number;
  durationMs: number;
}

// ─── Platform Verifier Contract ─────────────────────────────────────────────

interface PlatformVerifier {
  readonly platformId: string;
  readonly platformName: string;

  /**
   * Verify a submission. Returns a result with a confidence score.
   * In production this calls the platform's API; for now it simulates.
   */
  verify(submission: VerificationSubmission): Promise<VerificationResult>;

  /** Whether this verifier can currently process requests (API key set, etc.). */
  isAvailable(): boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD_VERIFIED = 0.75;
const CONFIDENCE_THRESHOLD_MANUAL_REVIEW = 0.4;

function statusFromConfidence(confidence: number): VerificationStatus {
  if (confidence >= CONFIDENCE_THRESHOLD_VERIFIED) return "verified";
  if (confidence >= CONFIDENCE_THRESHOLD_MANUAL_REVIEW) return "manual_review";
  return "failed";
}

/**
 * Simulate an async API call with a small random delay.
 * In production, this should be removed — each verifier would make real API calls.
 * Set SOCIAL_PERKS_SKIP_LATENCY=1 in env to bypass for testing.
 */
function simulateLatency(_minMs: number = 50, _maxMs: number = 300): Promise<void> {
  // Skip simulated latency in test/production environments
  if (typeof process !== "undefined" && process.env?.SOCIAL_PERKS_SKIP_LATENCY === "1") {
    return Promise.resolve();
  }
  const delay = _minMs + Math.random() * (_maxMs - _minMs);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Check if a URL looks like it belongs to the expected platform.
 * Very basic heuristic — real verification would resolve the URL and
 * inspect the response.
 */
function urlMatchesPlatform(url: string, patterns: string[]): boolean {
  const lower = url.toLowerCase();
  return patterns.some((pattern) => lower.includes(pattern));
}

/** Check if required hashtags or mentions appear in text content. */
function containsRequiredContent(
  text: string,
  required: string[]
): { found: string[]; missing: string[] } {
  const lower = text.toLowerCase();
  const found: string[] = [];
  const missing: string[] = [];

  for (const item of required) {
    if (lower.includes(item.toLowerCase())) {
      found.push(item);
    } else {
      missing.push(item);
    }
  }

  return { found, missing };
}

// ─── Instagram Verifier ─────────────────────────────────────────────────────

class InstagramVerifier implements PlatformVerifier {
  readonly platformId = "ig";
  readonly platformName = "Instagram";

  /**
   * Production integration:
   * - Instagram Graph API: GET /me/media?fields=id,caption,media_type,timestamp,permalink
   * - Instagram Basic Display API for user-authorized access
   * - OAuth flow: exchange authorization code for access token
   * - Verify: post exists, caption contains required hashtags/tags, within timeframe
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const start = Date.now();
    await simulateLatency(100, 400);

    let confidence = 0;
    const details: Record<string, unknown> = {
      platformApi: "Instagram Graph API",
      endpoint: "GET /me/media",
    };

    // URL-based verification
    if (submission.proofType === "url") {
      const isInstagramUrl = urlMatchesPlatform(submission.proofUrl, [
        "instagram.com",
        "instagr.am",
      ]);

      if (isInstagramUrl) {
        confidence = 0.85;
        details.urlValid = true;
        details.urlDomain = "instagram.com";

        // Check for specific post types in URL
        if (submission.proofUrl.includes("/reel/")) {
          details.contentType = "reel";
          confidence = 0.9;
        } else if (submission.proofUrl.includes("/p/")) {
          details.contentType = "post";
          confidence = 0.88;
        } else if (submission.proofUrl.includes("/stories/")) {
          details.contentType = "story";
          confidence = 0.82;
        }
      } else {
        confidence = 0.2;
        details.urlValid = false;
        details.reason = "URL does not match Instagram domain";
      }
    } else if (submission.proofType === "screenshot") {
      // Screenshot-based — lower confidence without real OCR
      confidence = 0.55;
      details.method = "screenshot_analysis";
      details.note =
        "Screenshot submitted; OCR integration (Tesseract.js) would extract text and match hashtags/tags";
    } else if (submission.proofType === "api_verified") {
      confidence = 0.95;
      details.method = "api_direct";
      details.note = "Pre-verified via Instagram Graph API OAuth flow";
    } else {
      confidence = 0.3;
      details.method = "unknown_proof_type";
    }

    // Action-specific confidence adjustments
    const actionBoosts: Record<string, number> = {
      ig_fo: 0.05, // Follow is hard to fake with URL
      ig_lk: 0.03,
      ig_cm: 0.05,
      ig_st: -0.05, // Stories expire, harder to verify
      ig_sl: -0.05,
    };
    const boost = actionBoosts[submission.actionId] ?? 0;
    confidence = Math.min(1, Math.max(0, confidence + boost));

    const durationMs = Date.now() - start;

    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: this.platformId,
      status: statusFromConfidence(confidence),
      confidence: Math.round(confidence * 100) / 100,
      method: submission.proofType === "screenshot" ? "screenshot_ocr" : "api",
      details,
      verifiedAt: new Date().toISOString(),
      durationMs,
    };
  }

  isAvailable(): boolean {
    // In production: check if Instagram API key/token is configured
    return true;
  }
}

// ─── TikTok Verifier ────────────────────────────────────────────────────────

class TikTokVerifier implements PlatformVerifier {
  readonly platformId = "tt";
  readonly platformName = "TikTok";

  /**
   * Production integration:
   * - TikTok API v2: GET /video/query/ with video ID
   * - TikTok Login Kit for OAuth
   * - Verify: video exists, description contains hashtags, within timeframe
   * - Check engagement metrics (views, likes) if available
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const start = Date.now();
    await simulateLatency(120, 450);

    let confidence = 0;
    const details: Record<string, unknown> = {
      platformApi: "TikTok API v2",
      endpoint: "GET /video/query/",
    };

    if (submission.proofType === "url") {
      const isTikTokUrl = urlMatchesPlatform(submission.proofUrl, [
        "tiktok.com",
        "vm.tiktok.com",
      ]);

      if (isTikTokUrl) {
        confidence = 0.85;
        details.urlValid = true;

        if (submission.proofUrl.includes("/video/")) {
          details.contentType = "video";
          confidence = 0.9;
        } else if (submission.proofUrl.includes("/photo/")) {
          details.contentType = "photo";
          confidence = 0.87;
        }
      } else {
        confidence = 0.2;
        details.urlValid = false;
        details.reason = "URL does not match TikTok domain";
      }
    } else if (submission.proofType === "screenshot") {
      confidence = 0.5;
      details.method = "screenshot_analysis";
    } else if (submission.proofType === "api_verified") {
      confidence = 0.95;
      details.method = "api_direct";
    } else {
      confidence = 0.3;
    }

    const durationMs = Date.now() - start;

    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: this.platformId,
      status: statusFromConfidence(confidence),
      confidence: Math.round(confidence * 100) / 100,
      method: submission.proofType === "screenshot" ? "screenshot_ocr" : "api",
      details,
      verifiedAt: new Date().toISOString(),
      durationMs,
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

// ─── Google Review Verifier ─────────────────────────────────────────────────

class GoogleReviewVerifier implements PlatformVerifier {
  readonly platformId = "go";
  readonly platformName = "Google";

  /**
   * Production integration:
   * - Google My Business API: accounts.locations.reviews.list
   * - Google Places API for public review data
   * - Verify: review exists, author matches, content aligns, within timeframe
   * - Check star rating if required
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const start = Date.now();
    await simulateLatency(150, 500);

    let confidence = 0;
    const details: Record<string, unknown> = {
      platformApi: "Google My Business API",
      endpoint: "accounts.locations.reviews.list",
    };

    if (submission.proofType === "url") {
      const isGoogleUrl = urlMatchesPlatform(submission.proofUrl, [
        "google.com/maps",
        "maps.google.com",
        "goo.gl/maps",
        "g.page",
      ]);

      if (isGoogleUrl) {
        confidence = 0.88;
        details.urlValid = true;

        // Reviews with photos get higher confidence
        if (submission.actionId === "go_rp") {
          confidence = 0.85; // Slightly lower — harder to verify photo presence via URL
          details.requiresPhotos = true;
        } else if (submission.actionId === "go_rd") {
          confidence = 0.87;
          details.requiresDetailedContent = true;
        }
      } else {
        confidence = 0.15;
        details.urlValid = false;
        details.reason = "URL does not match Google Maps/Business domain";
      }
    } else if (submission.proofType === "screenshot") {
      confidence = 0.6;
      details.method = "screenshot_analysis";
      details.note =
        "Screenshot of Google review; OCR would extract review text, star rating, and author name";
    } else if (submission.proofType === "api_verified") {
      confidence = 0.96;
      details.method = "api_direct";
    } else {
      confidence = 0.25;
    }

    const durationMs = Date.now() - start;

    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: this.platformId,
      status: statusFromConfidence(confidence),
      confidence: Math.round(confidence * 100) / 100,
      method: submission.proofType === "screenshot" ? "screenshot_ocr" : "api",
      details,
      verifiedAt: new Date().toISOString(),
      durationMs,
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

// ─── Facebook Verifier ──────────────────────────────────────────────────────

class FacebookVerifier implements PlatformVerifier {
  readonly platformId = "fb";
  readonly platformName = "Facebook";

  /**
   * Production integration:
   * - Facebook Graph API: GET /{post-id}?fields=message,created_time,from
   * - Facebook Login for OAuth
   * - Verify: post/check-in/recommendation exists, matches business, within timeframe
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const start = Date.now();
    await simulateLatency(100, 350);

    let confidence = 0;
    const details: Record<string, unknown> = {
      platformApi: "Facebook Graph API",
      endpoint: "GET /{post-id}",
    };

    if (submission.proofType === "url") {
      const isFacebookUrl = urlMatchesPlatform(submission.proofUrl, [
        "facebook.com",
        "fb.com",
        "fb.watch",
      ]);

      if (isFacebookUrl) {
        confidence = 0.84;
        details.urlValid = true;

        if (submission.proofUrl.includes("/posts/")) {
          details.contentType = "post";
        } else if (submission.proofUrl.includes("/reel/") || submission.proofUrl.includes("/watch/")) {
          details.contentType = "video";
          confidence = 0.87;
        } else if (submission.proofUrl.includes("/events/")) {
          details.contentType = "event";
          confidence = 0.82;
        }
      } else {
        confidence = 0.2;
        details.urlValid = false;
      }
    } else if (submission.proofType === "screenshot") {
      confidence = 0.5;
      details.method = "screenshot_analysis";
    } else if (submission.proofType === "api_verified") {
      confidence = 0.94;
      details.method = "api_direct";
    } else {
      confidence = 0.3;
    }

    const durationMs = Date.now() - start;

    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: this.platformId,
      status: statusFromConfidence(confidence),
      confidence: Math.round(confidence * 100) / 100,
      method: submission.proofType === "screenshot" ? "screenshot_ocr" : "api",
      details,
      verifiedAt: new Date().toISOString(),
      durationMs,
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

// ─── X (Twitter) Verifier ───────────────────────────────────────────────────

class XVerifier implements PlatformVerifier {
  readonly platformId = "xw";
  readonly platformName = "X";

  /**
   * Production integration:
   * - X API v2: GET /tweets/{id}?tweet.fields=text,created_at,author_id
   * - OAuth 2.0 with PKCE
   * - Verify: tweet exists, contains required mentions/hashtags, within timeframe
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const start = Date.now();
    await simulateLatency(80, 300);

    let confidence = 0;
    const details: Record<string, unknown> = {
      platformApi: "X API v2",
      endpoint: "GET /tweets/{id}",
    };

    if (submission.proofType === "url") {
      const isXUrl = urlMatchesPlatform(submission.proofUrl, [
        "twitter.com",
        "x.com",
        "t.co",
      ]);

      if (isXUrl) {
        confidence = 0.86;
        details.urlValid = true;

        if (submission.proofUrl.includes("/status/")) {
          details.contentType = "tweet";
          confidence = 0.9;
        }
      } else {
        confidence = 0.2;
        details.urlValid = false;
      }
    } else if (submission.proofType === "screenshot") {
      confidence = 0.52;
      details.method = "screenshot_analysis";
    } else if (submission.proofType === "api_verified") {
      confidence = 0.95;
      details.method = "api_direct";
    } else {
      confidence = 0.3;
    }

    const durationMs = Date.now() - start;

    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: this.platformId,
      status: statusFromConfidence(confidence),
      confidence: Math.round(confidence * 100) / 100,
      method: submission.proofType === "screenshot" ? "screenshot_ocr" : "api",
      details,
      verifiedAt: new Date().toISOString(),
      durationMs,
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

// ─── YouTube Verifier ───────────────────────────────────────────────────────

class YouTubeVerifier implements PlatformVerifier {
  readonly platformId = "yt";
  readonly platformName = "YouTube";

  /**
   * Production integration:
   * - YouTube Data API v3: GET /videos?id={videoId}&part=snippet,statistics
   * - OAuth 2.0 for channel verification
   * - Verify: video exists, description/tags reference business, within timeframe
   * - Check view count thresholds for high-effort campaigns
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const start = Date.now();
    await simulateLatency(130, 400);

    let confidence = 0;
    const details: Record<string, unknown> = {
      platformApi: "YouTube Data API v3",
      endpoint: "GET /videos",
    };

    if (submission.proofType === "url") {
      const isYouTubeUrl = urlMatchesPlatform(submission.proofUrl, [
        "youtube.com",
        "youtu.be",
        "youtube.com/shorts",
      ]);

      if (isYouTubeUrl) {
        confidence = 0.87;
        details.urlValid = true;

        if (submission.proofUrl.includes("/shorts/")) {
          details.contentType = "short";
          confidence = 0.88;
        } else if (
          submission.proofUrl.includes("/watch") ||
          submission.proofUrl.includes("youtu.be/")
        ) {
          details.contentType = "video";
          confidence = 0.9;
        }
      } else {
        confidence = 0.2;
        details.urlValid = false;
      }
    } else if (submission.proofType === "screenshot") {
      confidence = 0.48;
      details.method = "screenshot_analysis";
    } else if (submission.proofType === "api_verified") {
      confidence = 0.96;
      details.method = "api_direct";
    } else {
      confidence = 0.3;
    }

    const durationMs = Date.now() - start;

    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: this.platformId,
      status: statusFromConfidence(confidence),
      confidence: Math.round(confidence * 100) / 100,
      method: submission.proofType === "screenshot" ? "screenshot_ocr" : "api",
      details,
      verifiedAt: new Date().toISOString(),
      durationMs,
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

// ─── Yelp Verifier ──────────────────────────────────────────────────────────

class YelpVerifier implements PlatformVerifier {
  readonly platformId = "yp";
  readonly platformName = "Yelp";

  /**
   * Production integration:
   * - Yelp Fusion API: GET /businesses/{id}/reviews
   * - Verify: review exists, author matches, content aligns, within timeframe
   * - Yelp API is read-only; review creation cannot be verified in real-time
   *   so we rely on periodic polling or screenshot verification
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const start = Date.now();
    await simulateLatency(140, 420);

    let confidence = 0;
    const details: Record<string, unknown> = {
      platformApi: "Yelp Fusion API",
      endpoint: "GET /businesses/{id}/reviews",
    };

    if (submission.proofType === "url") {
      const isYelpUrl = urlMatchesPlatform(submission.proofUrl, ["yelp.com"]);

      if (isYelpUrl) {
        confidence = 0.83;
        details.urlValid = true;

        if (submission.proofUrl.includes("/biz/")) {
          details.contentType = "business_page";
          confidence = 0.8;
        }
      } else {
        confidence = 0.18;
        details.urlValid = false;
      }
    } else if (submission.proofType === "screenshot") {
      confidence = 0.58;
      details.method = "screenshot_analysis";
      details.note = "Yelp review screenshots are common due to API limitations";
    } else if (submission.proofType === "api_verified") {
      confidence = 0.92;
      details.method = "api_direct";
    } else {
      confidence = 0.25;
    }

    const durationMs = Date.now() - start;

    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: this.platformId,
      status: statusFromConfidence(confidence),
      confidence: Math.round(confidence * 100) / 100,
      method: submission.proofType === "screenshot" ? "screenshot_ocr" : "api",
      details,
      verifiedAt: new Date().toISOString(),
      durationMs,
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

// ─── LinkedIn Verifier ──────────────────────────────────────────────────────

class LinkedInVerifier implements PlatformVerifier {
  readonly platformId = "li";
  readonly platformName = "LinkedIn";

  /**
   * Production integration:
   * - LinkedIn Marketing API: GET /shares/{shareId}
   * - LinkedIn Sign In with OpenID Connect
   * - Verify: post exists, author matches, content includes business mention
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const start = Date.now();
    await simulateLatency(110, 380);

    let confidence = 0;
    const details: Record<string, unknown> = {
      platformApi: "LinkedIn Marketing API",
      endpoint: "GET /shares/{shareId}",
    };

    if (submission.proofType === "url") {
      const isLinkedInUrl = urlMatchesPlatform(submission.proofUrl, [
        "linkedin.com",
        "lnkd.in",
      ]);

      if (isLinkedInUrl) {
        confidence = 0.82;
        details.urlValid = true;

        if (submission.proofUrl.includes("/posts/")) {
          details.contentType = "post";
          confidence = 0.86;
        } else if (submission.proofUrl.includes("/pulse/")) {
          details.contentType = "article";
          confidence = 0.88;
        }
      } else {
        confidence = 0.2;
        details.urlValid = false;
      }
    } else if (submission.proofType === "screenshot") {
      confidence = 0.5;
      details.method = "screenshot_analysis";
    } else if (submission.proofType === "api_verified") {
      confidence = 0.93;
      details.method = "api_direct";
    } else {
      confidence = 0.3;
    }

    const durationMs = Date.now() - start;

    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: this.platformId,
      status: statusFromConfidence(confidence),
      confidence: Math.round(confidence * 100) / 100,
      method: submission.proofType === "screenshot" ? "screenshot_ocr" : "api",
      details,
      verifiedAt: new Date().toISOString(),
      durationMs,
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

// ─── Pinterest Verifier ─────────────────────────────────────────────────────

class PinterestVerifier implements PlatformVerifier {
  readonly platformId = "pi";
  readonly platformName = "Pinterest";

  /**
   * Production integration:
   * - Pinterest API v5: GET /pins/{pin_id}
   * - OAuth 2.0 with authorization code flow
   * - Verify: pin exists, description references business, links back
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const start = Date.now();
    await simulateLatency(100, 350);

    let confidence = 0;
    const details: Record<string, unknown> = {
      platformApi: "Pinterest API v5",
      endpoint: "GET /pins/{pin_id}",
    };

    if (submission.proofType === "url") {
      const isPinterestUrl = urlMatchesPlatform(submission.proofUrl, [
        "pinterest.com",
        "pin.it",
      ]);

      if (isPinterestUrl) {
        confidence = 0.83;
        details.urlValid = true;

        if (submission.proofUrl.includes("/pin/")) {
          details.contentType = "pin";
          confidence = 0.87;
        }
      } else {
        confidence = 0.2;
        details.urlValid = false;
      }
    } else if (submission.proofType === "screenshot") {
      confidence = 0.5;
      details.method = "screenshot_analysis";
    } else if (submission.proofType === "api_verified") {
      confidence = 0.93;
      details.method = "api_direct";
    } else {
      confidence = 0.3;
    }

    const durationMs = Date.now() - start;

    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: this.platformId,
      status: statusFromConfidence(confidence),
      confidence: Math.round(confidence * 100) / 100,
      method: submission.proofType === "screenshot" ? "screenshot_ocr" : "api",
      details,
      verifiedAt: new Date().toISOString(),
      durationMs,
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

// ─── Reddit Verifier ────────────────────────────────────────────────────────

class RedditVerifier implements PlatformVerifier {
  readonly platformId = "rd";
  readonly platformName = "Reddit";

  /**
   * Production integration:
   * - Reddit API: GET /api/info?url={url} or GET /comments/{article}
   * - OAuth 2.0 (Reddit uses token-based auth)
   * - Verify: post/comment exists, content mentions business, within timeframe
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const start = Date.now();
    await simulateLatency(90, 320);

    let confidence = 0;
    const details: Record<string, unknown> = {
      platformApi: "Reddit API",
      endpoint: "GET /api/info",
    };

    if (submission.proofType === "url") {
      const isRedditUrl = urlMatchesPlatform(submission.proofUrl, [
        "reddit.com",
        "redd.it",
      ]);

      if (isRedditUrl) {
        confidence = 0.84;
        details.urlValid = true;

        if (submission.proofUrl.includes("/comments/")) {
          details.contentType = "post";
          confidence = 0.88;
        }
      } else {
        confidence = 0.2;
        details.urlValid = false;
      }
    } else if (submission.proofType === "screenshot") {
      confidence = 0.5;
      details.method = "screenshot_analysis";
    } else if (submission.proofType === "api_verified") {
      confidence = 0.93;
      details.method = "api_direct";
    } else {
      confidence = 0.3;
    }

    const durationMs = Date.now() - start;

    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: this.platformId,
      status: statusFromConfidence(confidence),
      confidence: Math.round(confidence * 100) / 100,
      method: submission.proofType === "screenshot" ? "screenshot_ocr" : "api",
      details,
      verifiedAt: new Date().toISOString(),
      durationMs,
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

// ─── Generic URL Verifier ───────────────────────────────────────────────────

class URLVerifier implements PlatformVerifier {
  readonly platformId = "_url";
  readonly platformName = "Generic URL";

  /**
   * Generic URL checker for platforms without dedicated verifiers.
   * Checks if the URL resolves and performs basic content matching.
   *
   * Production: HEAD/GET request to verify URL is accessible, then check
   * response for expected content (business name, hashtags) using cheerio
   * or similar HTML parser.
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const start = Date.now();
    await simulateLatency(60, 250);

    let confidence = 0;
    const details: Record<string, unknown> = {
      method: "url_resolution",
    };

    if (submission.proofType === "url" && submission.proofUrl) {
      // Basic URL format validation
      const isValidUrl = /^https?:\/\/.+\..+/.test(submission.proofUrl);

      if (isValidUrl) {
        confidence = 0.65;
        details.urlValid = true;
        details.note =
          "URL format valid; in production would perform HEAD request and content check";

        // HTTPS gets a small boost
        if (submission.proofUrl.startsWith("https://")) {
          confidence += 0.05;
          details.secure = true;
        }
      } else {
        confidence = 0.1;
        details.urlValid = false;
        details.reason = "Invalid URL format";
      }
    } else {
      confidence = 0.3;
      details.note = "Non-URL proof type — falling through to generic check";
    }

    const durationMs = Date.now() - start;

    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: submission.platformId,
      status: statusFromConfidence(confidence),
      confidence: Math.round(confidence * 100) / 100,
      method: "url_check",
      details,
      verifiedAt: new Date().toISOString(),
      durationMs,
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

// ─── Screenshot/OCR Verifier ────────────────────────────────────────────────

class ScreenshotVerifier implements PlatformVerifier {
  readonly platformId = "_screenshot";
  readonly platformName = "Screenshot Analysis";

  /**
   * Screenshot verification using image analysis.
   *
   * Analyzes image headers, EXIF metadata, dimensions, and file characteristics
   * to determine screenshot authenticity. Uses the screenshot-analyzer module
   * for real image inspection when a fetchable URL is provided, with graceful
   * fallback to heuristic-based scoring.
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const start = Date.now();

    let confidence = 0;
    const details: Record<string, unknown> = {
      method: "screenshot_analysis",
    };

    if (submission.proofType === "screenshot") {
      // Try real image analysis if the proof URL is fetchable
      let analysis: ScreenshotAnalysis | null = null;

      if (/^https?:\/\//.test(submission.proofUrl)) {
        try {
          analysis = await analyzeScreenshotUrl(submission.proofUrl);
        } catch {
          // Fallback to heuristic if fetch fails
          analysis = null;
        }
      }

      if (analysis && analysis.isValid) {
        // Use real analysis confidence
        confidence = analysis.confidence;
        details.analysisMethod = "image_inspection";
        details.fileType = analysis.fileType;
        details.dimensions = analysis.dimensions;
        details.fileSize = analysis.fileSize;
        details.checks = analysis.checks;
        details.warnings = analysis.warnings;
        details.platformIndicators = analysis.platformIndicators;
      } else {
        // Fallback: heuristic scoring based on URL patterns
        const hasImageExtension = /\.(jpg|jpeg|png|webp|gif|bmp)($|\?)/i.test(
          submission.proofUrl
        );

        if (hasImageExtension) {
          confidence = 0.5;
          details.imageFormat = "valid";
          details.note =
            "Screenshot URL detected; full image analysis unavailable";
        } else if (/^https?:\/\//.test(submission.proofUrl)) {
          confidence = 0.45;
          details.imageFormat = "url_hosted";
        } else {
          confidence = 0.2;
          details.imageFormat = "unknown";
        }

        if (analysis && !analysis.isValid) {
          details.analysisWarnings = analysis.warnings;
        }
      }

      // Platform context gives a small boost if we know what UI to expect
      const platformBoosts: Record<string, number> = {
        ig: 0.08,
        tt: 0.07,
        go: 0.06,
        fb: 0.05,
        xw: 0.06,
        yt: 0.07,
        yp: 0.06,
      };
      const boost = platformBoosts[submission.platformId] ?? 0;
      confidence = Math.min(1, confidence + boost);
    } else {
      confidence = 0.2;
      details.note = "Non-screenshot proof type — image analysis not applicable";
    }

    const durationMs = Date.now() - start;

    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: submission.platformId,
      status: statusFromConfidence(confidence),
      confidence: Math.round(confidence * 100) / 100,
      method: "screenshot_ocr",
      details,
      verifiedAt: new Date().toISOString(),
      durationMs,
    };
  }

  isAvailable(): boolean {
    return true;
  }

  /**
   * Analyze a screenshot buffer directly (for use outside the verify flow).
   */
  async analyzeBuffer(buffer: Buffer, filename?: string): Promise<ScreenshotAnalysis> {
    return analyzeScreenshotBuffer(buffer, filename);
  }
}

// ─── Threads Verifier ───────────────────────────────────────────────────────

class ThreadsVerifier implements PlatformVerifier {
  readonly platformId = "th";
  readonly platformName = "Threads";

  /**
   * Production integration:
   * - Threads API (via Meta): GET /{threads-media-id}?fields=text,timestamp,permalink
   * - Uses same Meta OAuth as Instagram
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const start = Date.now();
    await simulateLatency(100, 350);

    let confidence = 0;
    const details: Record<string, unknown> = {
      platformApi: "Threads API (Meta)",
      endpoint: "GET /{threads-media-id}",
    };

    if (submission.proofType === "url") {
      const isThreadsUrl = urlMatchesPlatform(submission.proofUrl, [
        "threads.net",
      ]);

      if (isThreadsUrl) {
        confidence = 0.84;
        details.urlValid = true;
      } else {
        confidence = 0.2;
        details.urlValid = false;
      }
    } else if (submission.proofType === "screenshot") {
      confidence = 0.5;
      details.method = "screenshot_analysis";
    } else if (submission.proofType === "api_verified") {
      confidence = 0.94;
      details.method = "api_direct";
    } else {
      confidence = 0.3;
    }

    const durationMs = Date.now() - start;

    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: this.platformId,
      status: statusFromConfidence(confidence),
      confidence: Math.round(confidence * 100) / 100,
      method: submission.proofType === "screenshot" ? "screenshot_ocr" : "api",
      details,
      verifiedAt: new Date().toISOString(),
      durationMs,
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

// ─── Snapchat Verifier ──────────────────────────────────────────────────────

class SnapchatVerifier implements PlatformVerifier {
  readonly platformId = "sc";
  readonly platformName = "Snapchat";

  /**
   * Production integration:
   * - Snap Kit: Story Kit for reading public stories
   * - Snap stories are ephemeral, so verification relies heavily on screenshots
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const start = Date.now();
    await simulateLatency(100, 350);

    let confidence = 0;
    const details: Record<string, unknown> = {
      platformApi: "Snap Kit / Story Kit",
      note: "Snapchat content is ephemeral; screenshot proof is primary method",
    };

    if (submission.proofType === "url") {
      const isSnapUrl = urlMatchesPlatform(submission.proofUrl, [
        "snapchat.com",
        "snap.com",
      ]);

      if (isSnapUrl) {
        confidence = 0.75;
        details.urlValid = true;
      } else {
        confidence = 0.2;
        details.urlValid = false;
      }
    } else if (submission.proofType === "screenshot") {
      // Screenshots are the primary proof method for Snapchat
      confidence = 0.6;
      details.method = "screenshot_analysis";
      details.note = "Screenshot is expected proof type for ephemeral Snapchat content";
    } else if (submission.proofType === "api_verified") {
      confidence = 0.9;
      details.method = "api_direct";
    } else {
      confidence = 0.3;
    }

    const durationMs = Date.now() - start;

    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: this.platformId,
      status: statusFromConfidence(confidence),
      confidence: Math.round(confidence * 100) / 100,
      method: submission.proofType === "screenshot" ? "screenshot_ocr" : "api",
      details,
      verifiedAt: new Date().toISOString(),
      durationMs,
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

// ─── TripAdvisor Verifier ───────────────────────────────────────────────────

class TripAdvisorVerifier implements PlatformVerifier {
  readonly platformId = "ta";
  readonly platformName = "TripAdvisor";

  /**
   * Production integration:
   * - TripAdvisor Content API: GET /location/{id}/reviews
   * - Verify: review exists, matches author, content, and timeframe
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const start = Date.now();
    await simulateLatency(130, 420);

    let confidence = 0;
    const details: Record<string, unknown> = {
      platformApi: "TripAdvisor Content API",
      endpoint: "GET /location/{id}/reviews",
    };

    if (submission.proofType === "url") {
      const isTripAdvisorUrl = urlMatchesPlatform(submission.proofUrl, [
        "tripadvisor.com",
        "tripadvisor.co",
      ]);

      if (isTripAdvisorUrl) {
        confidence = 0.83;
        details.urlValid = true;

        if (submission.proofUrl.includes("/ShowUserReviews")) {
          details.contentType = "review";
          confidence = 0.87;
        }
      } else {
        confidence = 0.18;
        details.urlValid = false;
      }
    } else if (submission.proofType === "screenshot") {
      confidence = 0.55;
      details.method = "screenshot_analysis";
    } else if (submission.proofType === "api_verified") {
      confidence = 0.92;
      details.method = "api_direct";
    } else {
      confidence = 0.25;
    }

    const durationMs = Date.now() - start;

    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: this.platformId,
      status: statusFromConfidence(confidence),
      confidence: Math.round(confidence * 100) / 100,
      method: submission.proofType === "screenshot" ? "screenshot_ocr" : "api",
      details,
      verifiedAt: new Date().toISOString(),
      durationMs,
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

// ─── Nextdoor Verifier ──────────────────────────────────────────────────────

class NextdoorVerifier implements PlatformVerifier {
  readonly platformId = "nd";
  readonly platformName = "Nextdoor";

  /**
   * Production integration:
   * - Nextdoor API (limited): primarily screenshot/URL based
   * - Nextdoor has limited API for third-party access
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const start = Date.now();
    await simulateLatency(100, 350);

    let confidence = 0;
    const details: Record<string, unknown> = {
      platformApi: "Nextdoor (limited API access)",
      note: "Nextdoor has restricted API; verification relies on URL/screenshot proof",
    };

    if (submission.proofType === "url") {
      const isNextdoorUrl = urlMatchesPlatform(submission.proofUrl, [
        "nextdoor.com",
      ]);

      if (isNextdoorUrl) {
        confidence = 0.78;
        details.urlValid = true;
      } else {
        confidence = 0.2;
        details.urlValid = false;
      }
    } else if (submission.proofType === "screenshot") {
      confidence = 0.55;
      details.method = "screenshot_analysis";
    } else if (submission.proofType === "api_verified") {
      confidence = 0.88;
      details.method = "api_direct";
    } else {
      confidence = 0.3;
    }

    const durationMs = Date.now() - start;

    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: this.platformId,
      status: statusFromConfidence(confidence),
      confidence: Math.round(confidence * 100) / 100,
      method: submission.proofType === "screenshot" ? "screenshot_ocr" : "url_check",
      details,
      verifiedAt: new Date().toISOString(),
      durationMs,
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

// ─── Direct Referral Verifier ───────────────────────────────────────────────

class DirectReferralVerifier implements PlatformVerifier {
  readonly platformId = "dr";
  readonly platformName = "Direct Referral";

  /**
   * Referral verification — checks referral codes and tracking links.
   * Verification is simpler here since we control the referral system.
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const start = Date.now();
    await simulateLatency(50, 150);

    let confidence = 0;
    const details: Record<string, unknown> = {
      method: "referral_tracking",
    };

    // Referrals are verified through our own tracking system
    if (submission.metadata?.referralCode) {
      confidence = 0.92;
      details.referralCode = submission.metadata.referralCode;
      details.tracked = true;
    } else if (submission.proofType === "url") {
      confidence = 0.7;
      details.note = "URL submitted but no referral code; manual verification may be needed";
    } else if (submission.proofType === "screenshot") {
      confidence = 0.5;
      details.note = "Screenshot of referral; would verify against referral database";
    } else {
      confidence = 0.4;
    }

    const durationMs = Date.now() - start;

    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: this.platformId,
      status: statusFromConfidence(confidence),
      confidence: Math.round(confidence * 100) / 100,
      method: submission.metadata?.referralCode ? "api" : "manual",
      details,
      verifiedAt: new Date().toISOString(),
      durationMs,
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

// ─── Verification Engine (Orchestrator) ─────────────────────────────────────

class VerificationEngine {
  private verifiers: Map<string, PlatformVerifier> = new Map();
  private results: Map<string, VerificationResult> = new Map();
  private readonly maxResults = 50_000;

  // Fallback verifiers used when the platform-specific one fails
  private urlVerifier: URLVerifier;
  private screenshotVerifier: ScreenshotVerifier;

  constructor() {
    // Register all platform verifiers
    const platforms: PlatformVerifier[] = [
      new InstagramVerifier(),
      new TikTokVerifier(),
      new GoogleReviewVerifier(),
      new FacebookVerifier(),
      new XVerifier(),
      new YouTubeVerifier(),
      new YelpVerifier(),
      new LinkedInVerifier(),
      new PinterestVerifier(),
      new RedditVerifier(),
      new ThreadsVerifier(),
      new SnapchatVerifier(),
      new TripAdvisorVerifier(),
      new NextdoorVerifier(),
      new DirectReferralVerifier(),
    ];

    for (const verifier of platforms) {
      this.verifiers.set(verifier.platformId, verifier);
    }

    this.urlVerifier = new URLVerifier();
    this.screenshotVerifier = new ScreenshotVerifier();
  }

  /**
   * Verify a single submission using the appropriate platform verifier.
   */
  async verify(submission: VerificationSubmission): Promise<VerificationResult> {
    const verifier = this.verifiers.get(submission.platformId);

    let result: VerificationResult;

    if (verifier && verifier.isAvailable()) {
      result = await verifier.verify(submission);
    } else {
      // No platform verifier — use generic URL or screenshot check
      result = await this.fallbackVerify(submission);
    }

    this.results.set(submission.submissionId, result);
    this.evictOldResults();
    return result;
  }

  /**
   * Verify multiple submissions in parallel.
   */
  async batchVerify(
    submissions: VerificationSubmission[]
  ): Promise<BatchVerificationResult> {
    const start = Date.now();

    const results = await Promise.all(
      submissions.map((s) => this.verify(s))
    );

    let verifiedCount = 0;
    let failedCount = 0;
    let manualReviewCount = 0;

    for (const result of results) {
      switch (result.status) {
        case "verified":
          verifiedCount++;
          break;
        case "failed":
          failedCount++;
          break;
        case "manual_review":
          manualReviewCount++;
          break;
      }
    }

    return {
      results,
      totalCount: results.length,
      verifiedCount,
      failedCount,
      manualReviewCount,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Get the current verification status for a submission.
   */
  getVerificationStatus(submissionId: string): VerificationResult | null {
    return this.results.get(submissionId) ?? null;
  }

  /**
   * Verify with fallback chain:
   * 1. Platform-specific API verification
   * 2. Generic URL check
   * 3. Screenshot OCR
   * 4. Manual review (returned as the final fallback status)
   *
   * Returns the highest-confidence result from the chain.
   */
  async verifyWithFallback(
    submission: VerificationSubmission
  ): Promise<VerificationResult> {
    const attempts: VerificationResult[] = [];

    // Step 1: Platform-specific verifier
    const platformVerifier = this.verifiers.get(submission.platformId);
    if (platformVerifier && platformVerifier.isAvailable()) {
      const platformResult = await platformVerifier.verify(submission);
      attempts.push(platformResult);

      if (platformResult.status === "verified") {
        this.results.set(submission.submissionId, platformResult);
        return platformResult;
      }
    }

    // Step 2: Generic URL check (if proof is a URL)
    if (submission.proofType === "url") {
      const urlResult = await this.urlVerifier.verify(submission);
      attempts.push(urlResult);

      if (urlResult.status === "verified") {
        this.results.set(submission.submissionId, urlResult);
        return urlResult;
      }
    }

    // Step 3: Screenshot OCR (if proof is a screenshot)
    if (submission.proofType === "screenshot") {
      const ocrResult = await this.screenshotVerifier.verify(submission);
      attempts.push(ocrResult);

      if (ocrResult.status === "verified") {
        this.results.set(submission.submissionId, ocrResult);
        return ocrResult;
      }
    }

    // Step 4: Return the best result we have, or manual review
    if (attempts.length > 0) {
      // Pick the attempt with the highest confidence
      const best = attempts.reduce((a, b) =>
        a.confidence >= b.confidence ? a : b
      );

      // If the best we got is still below manual review threshold, flag it
      if (best.confidence < CONFIDENCE_THRESHOLD_MANUAL_REVIEW) {
        const manualResult: VerificationResult = {
          submissionId: submission.submissionId,
          actionId: submission.actionId,
          platformId: submission.platformId,
          status: "manual_review",
          confidence: best.confidence,
          method: "manual",
          details: {
            reason: "All automated verification methods returned low confidence",
            attempts: attempts.length,
            bestConfidence: best.confidence,
            bestMethod: best.method,
          },
          verifiedAt: new Date().toISOString(),
          durationMs: attempts.reduce((sum, a) => sum + a.durationMs, 0),
        };

        this.results.set(submission.submissionId, manualResult);
        return manualResult;
      }

      this.results.set(submission.submissionId, best);
      return best;
    }

    // No attempts at all — shouldn't happen, but handle gracefully
    const fallback: VerificationResult = {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: submission.platformId,
      status: "manual_review",
      confidence: 0,
      method: "manual",
      details: {
        reason: "No verification method available for this platform and proof type",
      },
      verifiedAt: new Date().toISOString(),
      durationMs: 0,
    };

    this.results.set(submission.submissionId, fallback);
    return fallback;
  }

  /**
   * Check if a platform has a dedicated verifier registered.
   */
  hasVerifier(platformId: string): boolean {
    return this.verifiers.has(platformId);
  }

  /**
   * Get all registered platform verifier IDs.
   */
  getRegisteredPlatforms(): string[] {
    return Array.from(this.verifiers.keys());
  }

  /**
   * Get all stored verification results.
   */
  getAllResults(): VerificationResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Get verification statistics.
   */
  getStats(): {
    totalVerifications: number;
    verified: number;
    failed: number;
    manualReview: number;
    pending: number;
    averageConfidence: number;
    byPlatform: Record<string, { count: number; avgConfidence: number }>;
  } {
    const results = this.getAllResults();
    let verified = 0;
    let failed = 0;
    let manualReview = 0;
    let pending = 0;
    let confidenceSum = 0;

    const byPlatform: Record<
      string,
      { count: number; confidenceSum: number; avgConfidence: number }
    > = {};

    for (const result of results) {
      confidenceSum += result.confidence;

      switch (result.status) {
        case "verified":
          verified++;
          break;
        case "failed":
          failed++;
          break;
        case "manual_review":
          manualReview++;
          break;
        case "pending":
          pending++;
          break;
      }

      if (!byPlatform[result.platformId]) {
        byPlatform[result.platformId] = {
          count: 0,
          confidenceSum: 0,
          avgConfidence: 0,
        };
      }
      byPlatform[result.platformId].count++;
      byPlatform[result.platformId].confidenceSum += result.confidence;
    }

    // Calculate averages
    const platformStats: Record<
      string,
      { count: number; avgConfidence: number }
    > = {};
    for (const [pid, data] of Object.entries(byPlatform)) {
      platformStats[pid] = {
        count: data.count,
        avgConfidence:
          data.count > 0
            ? Math.round((data.confidenceSum / data.count) * 100) / 100
            : 0,
      };
    }

    return {
      totalVerifications: results.length,
      verified,
      failed,
      manualReview,
      pending,
      averageConfidence:
        results.length > 0
          ? Math.round((confidenceSum / results.length) * 100) / 100
          : 0,
      byPlatform: platformStats,
    };
  }

  // ── Internal ────────────────────────────────────────────────────────────

  /**
   * Fallback verification when no platform-specific verifier is available.
   */
  private async fallbackVerify(
    submission: VerificationSubmission
  ): Promise<VerificationResult> {
    if (submission.proofType === "screenshot") {
      return this.screenshotVerifier.verify(submission);
    }

    if (submission.proofType === "url") {
      return this.urlVerifier.verify(submission);
    }

    // No matching verifier and proof type is not URL or screenshot
    return {
      submissionId: submission.submissionId,
      actionId: submission.actionId,
      platformId: submission.platformId,
      status: "manual_review",
      confidence: 0.1,
      method: "manual",
      details: {
        reason: `No verifier for platform '${submission.platformId}' and proof type '${submission.proofType}'`,
      },
      verifiedAt: new Date().toISOString(),
      durationMs: 0,
    };
  }

  private evictOldResults(): void {
    if (this.results.size > this.maxResults) {
      const keys = Array.from(this.results.keys());
      const toRemove = keys.slice(0, Math.floor(this.maxResults * 0.2));
      for (const key of toRemove) {
        this.results.delete(key);
      }
    }
  }

  // ── Store Access (for testing / admin) ──────────────────────────────────

  /** Clear all stored results. */
  clear(): void {
    this.results.clear();
  }

  /** Get the raw results store. */
  getResultsStore(): Map<string, VerificationResult> {
    return this.results;
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const verificationEngine = new VerificationEngine();

export {
  VerificationEngine,
  InstagramVerifier,
  TikTokVerifier,
  GoogleReviewVerifier,
  FacebookVerifier,
  XVerifier,
  YouTubeVerifier,
  YelpVerifier,
  LinkedInVerifier,
  PinterestVerifier,
  RedditVerifier,
  ThreadsVerifier,
  SnapchatVerifier,
  TripAdvisorVerifier,
  NextdoorVerifier,
  DirectReferralVerifier,
  URLVerifier,
  ScreenshotVerifier,
  containsRequiredContent,
};

export type { PlatformVerifier };
