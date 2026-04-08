import { describe, it, expect, beforeEach } from "vitest";
import {
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
  verificationEngine,
  type VerificationSubmission,
  type VerificationResult,
} from "@/lib/verification-engine";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Ensure SOCIAL_PERKS_SKIP_LATENCY is set so tests run without timeouts. */
process.env.SOCIAL_PERKS_SKIP_LATENCY = "1";

function makeSubmission(
  overrides: Partial<VerificationSubmission> = {}
): VerificationSubmission {
  return {
    submissionId: `sub-${Math.random().toString(36).slice(2, 8)}`,
    proofUrl: "https://instagram.com/p/abc123",
    proofType: "url",
    actionId: "ig_ps",
    platformId: "ig",
    ...overrides,
  };
}

// ─── containsRequiredContent (exported helper) ────────────────────────────────

describe("containsRequiredContent", () => {
  it("returns all items as found when text contains them", () => {
    const result = containsRequiredContent("Check out #SocialPerks and @mybiz!", [
      "#socialperks",
      "@mybiz",
    ]);
    expect(result.found).toEqual(["#socialperks", "@mybiz"]);
    expect(result.missing).toEqual([]);
  });

  it("returns missing items that are not in the text", () => {
    const result = containsRequiredContent("Just a regular post", [
      "#socialperks",
      "@mybiz",
    ]);
    expect(result.found).toEqual([]);
    expect(result.missing).toEqual(["#socialperks", "@mybiz"]);
  });

  it("is case-insensitive", () => {
    const result = containsRequiredContent("Check out #SOCIALPERKS!", [
      "#socialperks",
    ]);
    expect(result.found).toEqual(["#socialperks"]);
    expect(result.missing).toEqual([]);
  });

  it("handles partial matches correctly (found and missing)", () => {
    const result = containsRequiredContent("I love #SocialPerks", [
      "#socialperks",
      "#discount",
    ]);
    expect(result.found).toEqual(["#socialperks"]);
    expect(result.missing).toEqual(["#discount"]);
  });

  it("handles empty required list", () => {
    const result = containsRequiredContent("any text", []);
    expect(result.found).toEqual([]);
    expect(result.missing).toEqual([]);
  });

  it("handles empty text", () => {
    const result = containsRequiredContent("", ["#hashtag"]);
    expect(result.found).toEqual([]);
    expect(result.missing).toEqual(["#hashtag"]);
  });
});

// ─── Instagram Verifier ───────────────────────────────────────────────────────

describe("InstagramVerifier", () => {
  let verifier: InstanceType<typeof InstagramVerifier>;

  beforeEach(() => {
    verifier = new InstagramVerifier();
  });

  it("reports available", () => {
    expect(verifier.isAvailable()).toBe(true);
    expect(verifier.platformId).toBe("ig");
    expect(verifier.platformName).toBe("Instagram");
  });

  it("verifies a valid Instagram post URL with high confidence", async () => {
    const result = await verifier.verify(
      makeSubmission({
        proofUrl: "https://www.instagram.com/p/C1234abcXYZ/",
        proofType: "url",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    expect(result.details.contentType).toBe("post");
    expect(result.details.urlValid).toBe(true);
  });

  it("gives highest URL confidence to reels", async () => {
    const result = await verifier.verify(
      makeSubmission({
        proofUrl: "https://www.instagram.com/reel/C1234/",
        proofType: "url",
      })
    );
    expect(result.confidence).toBe(0.9);
    expect(result.details.contentType).toBe("reel");
  });

  it("gives slightly lower confidence to stories", async () => {
    const result = await verifier.verify(
      makeSubmission({
        proofUrl: "https://www.instagram.com/stories/user123/12345/",
        proofType: "url",
      })
    );
    expect(result.confidence).toBe(0.82);
    expect(result.details.contentType).toBe("story");
  });

  it("fails verification for non-Instagram URLs", async () => {
    const result = await verifier.verify(
      makeSubmission({
        proofUrl: "https://twitter.com/user/status/123",
        proofType: "url",
      })
    );
    expect(result.confidence).toBe(0.2);
    expect(result.status).toBe("failed");
    expect(result.details.urlValid).toBe(false);
  });

  it("assigns lower confidence for screenshot proof", async () => {
    const result = await verifier.verify(
      makeSubmission({ proofType: "screenshot" })
    );
    expect(result.confidence).toBe(0.55);
    expect(result.method).toBe("screenshot_ocr");
    expect(result.status).toBe("manual_review");
  });

  it("assigns highest confidence for api_verified proof", async () => {
    const result = await verifier.verify(
      makeSubmission({ proofType: "api_verified" })
    );
    expect(result.confidence).toBe(0.95);
    expect(result.status).toBe("verified");
  });

  it("handles unknown proof type with low confidence", async () => {
    const result = await verifier.verify(
      makeSubmission({ proofType: "video" as VerificationSubmission["proofType"] })
    );
    expect(result.confidence).toBeLessThanOrEqual(0.35);
    expect(result.status).toBe("failed");
  });

  it("applies action-specific confidence boosts", async () => {
    // ig_fo (follow) gets +0.05 boost
    const followResult = await verifier.verify(
      makeSubmission({
        proofUrl: "https://www.instagram.com/p/C1234/",
        proofType: "url",
        actionId: "ig_fo",
      })
    );
    // base confidence for /p/ is 0.88, +0.05 boost = 0.93
    expect(followResult.confidence).toBe(0.93);

    // ig_st (story) gets -0.05 penalty
    const storyResult = await verifier.verify(
      makeSubmission({
        proofUrl: "https://www.instagram.com/p/C1234/",
        proofType: "url",
        actionId: "ig_st",
      })
    );
    expect(storyResult.confidence).toBe(0.83);
  });

  it("includes all required fields in the result", async () => {
    const submission = makeSubmission();
    const result = await verifier.verify(submission);

    expect(result.submissionId).toBe(submission.submissionId);
    expect(result.actionId).toBe(submission.actionId);
    expect(result.platformId).toBe("ig");
    expect(typeof result.durationMs).toBe("number");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.verifiedAt).toBeTruthy();
    expect(new Date(result.verifiedAt).getTime()).not.toBeNaN();
  });
});

// ─── TikTok Verifier ──────────────────────────────────────────────────────────

describe("TikTokVerifier", () => {
  let verifier: InstanceType<typeof TikTokVerifier>;

  beforeEach(() => {
    verifier = new TikTokVerifier();
  });

  it("verifies a valid TikTok video URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "tt",
        proofUrl: "https://www.tiktok.com/@user/video/1234567",
        proofType: "url",
        actionId: "tt_ps",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.9);
    expect(result.details.contentType).toBe("video");
  });

  it("verifies TikTok photo URL with slightly lower confidence", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "tt",
        proofUrl: "https://www.tiktok.com/@user/photo/1234567",
        proofType: "url",
        actionId: "tt_ps",
      })
    );
    expect(result.confidence).toBe(0.87);
    expect(result.details.contentType).toBe("photo");
  });

  it("verifies short-form TikTok URL (vm.tiktok.com)", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "tt",
        proofUrl: "https://vm.tiktok.com/ABCDE/",
        proofType: "url",
        actionId: "tt_ps",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.85);
  });

  it("fails for non-TikTok URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "tt",
        proofUrl: "https://youtube.com/watch?v=abc",
        proofType: "url",
        actionId: "tt_ps",
      })
    );
    expect(result.status).toBe("failed");
    expect(result.confidence).toBe(0.2);
  });
});

// ─── Google Review Verifier ───────────────────────────────────────────────────

describe("GoogleReviewVerifier", () => {
  let verifier: InstanceType<typeof GoogleReviewVerifier>;

  beforeEach(() => {
    verifier = new GoogleReviewVerifier();
  });

  it("verifies a valid Google Maps URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "go",
        proofUrl: "https://www.google.com/maps/place/My+Biz/@12.34,56.78",
        proofType: "url",
        actionId: "go_rv",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.88);
    expect(result.details.urlValid).toBe(true);
  });

  it("adjusts confidence for photo-required actions", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "go",
        proofUrl: "https://www.google.com/maps/place/MyBiz",
        proofType: "url",
        actionId: "go_rp",
      })
    );
    expect(result.confidence).toBe(0.85);
    expect(result.details.requiresPhotos).toBe(true);
  });

  it("handles screenshot proof for Google reviews", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "go",
        proofType: "screenshot",
        proofUrl: "https://images.example.com/screenshot.png",
        actionId: "go_rv",
      })
    );
    expect(result.confidence).toBe(0.6);
    expect(result.method).toBe("screenshot_ocr");
  });

  it("rejects non-Google URLs with low confidence", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "go",
        proofUrl: "https://yelp.com/biz/my-business",
        proofType: "url",
        actionId: "go_rv",
      })
    );
    expect(result.confidence).toBe(0.15);
    expect(result.status).toBe("failed");
  });

  it("accepts api_verified with highest confidence", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "go",
        proofType: "api_verified",
        actionId: "go_rv",
      })
    );
    expect(result.confidence).toBe(0.96);
    expect(result.status).toBe("verified");
  });
});

// ─── Facebook Verifier ────────────────────────────────────────────────────────

describe("FacebookVerifier", () => {
  let verifier: InstanceType<typeof FacebookVerifier>;

  beforeEach(() => {
    verifier = new FacebookVerifier();
  });

  it("verifies a Facebook post URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "fb",
        proofUrl: "https://www.facebook.com/user/posts/1234567",
        proofType: "url",
        actionId: "fb_ps",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.details.contentType).toBe("post");
  });

  it("gives higher confidence to video/reel content", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "fb",
        proofUrl: "https://www.facebook.com/reel/12345",
        proofType: "url",
        actionId: "fb_ps",
      })
    );
    expect(result.confidence).toBe(0.87);
    expect(result.details.contentType).toBe("video");
  });

  it("identifies event content type", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "fb",
        proofUrl: "https://www.facebook.com/events/12345",
        proofType: "url",
        actionId: "fb_ps",
      })
    );
    expect(result.confidence).toBe(0.82);
    expect(result.details.contentType).toBe("event");
  });

  it("fails for non-Facebook URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "fb",
        proofUrl: "https://instagram.com/p/abc",
        proofType: "url",
        actionId: "fb_ps",
      })
    );
    expect(result.status).toBe("failed");
    expect(result.details.urlValid).toBe(false);
  });
});

// ─── X (Twitter) Verifier ─────────────────────────────────────────────────────

describe("XVerifier", () => {
  let verifier: InstanceType<typeof XVerifier>;

  beforeEach(() => {
    verifier = new XVerifier();
  });

  it("verifies x.com tweet URL with high confidence", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "xw",
        proofUrl: "https://x.com/user/status/1234567890",
        proofType: "url",
        actionId: "xw_tw",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.9);
    expect(result.details.contentType).toBe("tweet");
  });

  it("verifies legacy twitter.com URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "xw",
        proofUrl: "https://twitter.com/user/status/1234567890",
        proofType: "url",
        actionId: "xw_tw",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.9);
  });

  it("accepts t.co short URLs with base X confidence", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "xw",
        proofUrl: "https://t.co/abcdef",
        proofType: "url",
        actionId: "xw_tw",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.86);
  });
});

// ─── YouTube Verifier ─────────────────────────────────────────────────────────

describe("YouTubeVerifier", () => {
  let verifier: InstanceType<typeof YouTubeVerifier>;

  beforeEach(() => {
    verifier = new YouTubeVerifier();
  });

  it("verifies standard YouTube watch URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "yt",
        proofUrl: "https://www.youtube.com/watch?v=abc123",
        proofType: "url",
        actionId: "yt_ps",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.9);
    expect(result.details.contentType).toBe("video");
  });

  it("verifies youtu.be short URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "yt",
        proofUrl: "https://youtu.be/abc123",
        proofType: "url",
        actionId: "yt_ps",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.9);
    expect(result.details.contentType).toBe("video");
  });

  it("verifies YouTube Shorts URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "yt",
        proofUrl: "https://www.youtube.com/shorts/abc123",
        proofType: "url",
        actionId: "yt_ps",
      })
    );
    expect(result.confidence).toBe(0.88);
    expect(result.details.contentType).toBe("short");
  });

  it("gives low confidence to screenshots (OCR not yet implemented)", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "yt",
        proofType: "screenshot",
        proofUrl: "https://example.com/proof.png",
        actionId: "yt_ps",
      })
    );
    expect(result.confidence).toBe(0.48);
    expect(result.status).toBe("manual_review");
  });
});

// ─── Yelp Verifier ────────────────────────────────────────────────────────────

describe("YelpVerifier", () => {
  let verifier: InstanceType<typeof YelpVerifier>;

  beforeEach(() => {
    verifier = new YelpVerifier();
  });

  it("verifies a Yelp business page URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "yp",
        proofUrl: "https://www.yelp.com/biz/my-business-sf",
        proofType: "url",
        actionId: "yp_rv",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.8);
    expect(result.details.contentType).toBe("business_page");
  });

  it("accepts Yelp screenshot with medium confidence", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "yp",
        proofType: "screenshot",
        proofUrl: "https://example.com/proof.png",
        actionId: "yp_rv",
      })
    );
    expect(result.confidence).toBe(0.58);
    expect(result.status).toBe("manual_review");
  });
});

// ─── LinkedIn Verifier ────────────────────────────────────────────────────────

describe("LinkedInVerifier", () => {
  let verifier: InstanceType<typeof LinkedInVerifier>;

  beforeEach(() => {
    verifier = new LinkedInVerifier();
  });

  it("verifies a LinkedIn post URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "li",
        proofUrl: "https://www.linkedin.com/posts/user_activity-123",
        proofType: "url",
        actionId: "li_ps",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.86);
    expect(result.details.contentType).toBe("post");
  });

  it("gives higher confidence to articles (pulse)", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "li",
        proofUrl: "https://www.linkedin.com/pulse/my-article-123",
        proofType: "url",
        actionId: "li_ps",
      })
    );
    expect(result.confidence).toBe(0.88);
    expect(result.details.contentType).toBe("article");
  });

  it("recognizes lnkd.in short URLs", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "li",
        proofUrl: "https://lnkd.in/abc123",
        proofType: "url",
        actionId: "li_ps",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.details.urlValid).toBe(true);
  });
});

// ─── Pinterest Verifier ───────────────────────────────────────────────────────

describe("PinterestVerifier", () => {
  let verifier: InstanceType<typeof PinterestVerifier>;

  beforeEach(() => {
    verifier = new PinterestVerifier();
  });

  it("verifies a Pinterest pin URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "pi",
        proofUrl: "https://www.pinterest.com/pin/1234567890/",
        proofType: "url",
        actionId: "pi_ps",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.87);
    expect(result.details.contentType).toBe("pin");
  });

  it("accepts pin.it short URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "pi",
        proofUrl: "https://pin.it/abc123",
        proofType: "url",
        actionId: "pi_ps",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.details.urlValid).toBe(true);
  });
});

// ─── Reddit Verifier ──────────────────────────────────────────────────────────

describe("RedditVerifier", () => {
  let verifier: InstanceType<typeof RedditVerifier>;

  beforeEach(() => {
    verifier = new RedditVerifier();
  });

  it("verifies a Reddit post with comments URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "rd",
        proofUrl: "https://www.reddit.com/r/local/comments/abc123/my_post/",
        proofType: "url",
        actionId: "rd_ps",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.88);
    expect(result.details.contentType).toBe("post");
  });

  it("accepts redd.it short URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "rd",
        proofUrl: "https://redd.it/abc123",
        proofType: "url",
        actionId: "rd_ps",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.details.urlValid).toBe(true);
  });
});

// ─── Threads Verifier ─────────────────────────────────────────────────────────

describe("ThreadsVerifier", () => {
  let verifier: InstanceType<typeof ThreadsVerifier>;

  beforeEach(() => {
    verifier = new ThreadsVerifier();
  });

  it("verifies a Threads URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "th",
        proofUrl: "https://www.threads.net/@user/post/abc123",
        proofType: "url",
        actionId: "th_ps",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.84);
  });

  it("fails for non-Threads URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "th",
        proofUrl: "https://twitter.com/user/status/123",
        proofType: "url",
        actionId: "th_ps",
      })
    );
    expect(result.status).toBe("failed");
  });
});

// ─── Snapchat Verifier ───────────────────────────────────────────────────────

describe("SnapchatVerifier", () => {
  let verifier: InstanceType<typeof SnapchatVerifier>;

  beforeEach(() => {
    verifier = new SnapchatVerifier();
  });

  it("verifies snapchat.com URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "sc",
        proofUrl: "https://www.snapchat.com/add/mybiz",
        proofType: "url",
        actionId: "sc_ps",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.75);
  });

  it("gives higher screenshot confidence than most platforms (ephemeral content)", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "sc",
        proofType: "screenshot",
        proofUrl: "https://example.com/snap_proof.png",
        actionId: "sc_ps",
      })
    );
    expect(result.confidence).toBe(0.6);
    expect(result.status).toBe("manual_review");
  });
});

// ─── TripAdvisor Verifier ─────────────────────────────────────────────────────

describe("TripAdvisorVerifier", () => {
  let verifier: InstanceType<typeof TripAdvisorVerifier>;

  beforeEach(() => {
    verifier = new TripAdvisorVerifier();
  });

  it("verifies TripAdvisor user review URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "ta",
        proofUrl: "https://www.tripadvisor.com/ShowUserReviews-g123-d456-Reviews",
        proofType: "url",
        actionId: "ta_rv",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.87);
    expect(result.details.contentType).toBe("review");
  });

  it("accepts tripadvisor.co domain variant", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "ta",
        proofUrl: "https://www.tripadvisor.co.uk/Restaurant_Review-123",
        proofType: "url",
        actionId: "ta_rv",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.details.urlValid).toBe(true);
  });
});

// ─── Nextdoor Verifier ───────────────────────────────────────────────────────

describe("NextdoorVerifier", () => {
  let verifier: InstanceType<typeof NextdoorVerifier>;

  beforeEach(() => {
    verifier = new NextdoorVerifier();
  });

  it("verifies nextdoor.com URL", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "nd",
        proofUrl: "https://nextdoor.com/p/abc123",
        proofType: "url",
        actionId: "nd_ps",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.78);
  });

  it("uses url_check method (not api) since API is limited", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "nd",
        proofUrl: "https://nextdoor.com/p/abc123",
        proofType: "url",
        actionId: "nd_ps",
      })
    );
    expect(result.method).toBe("url_check");
  });
});

// ─── Direct Referral Verifier ─────────────────────────────────────────────────

describe("DirectReferralVerifier", () => {
  let verifier: InstanceType<typeof DirectReferralVerifier>;

  beforeEach(() => {
    verifier = new DirectReferralVerifier();
  });

  it("gives high confidence when referral code is present in metadata", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "dr",
        proofUrl: "https://example.com/ref/abc123",
        proofType: "url",
        actionId: "dr_rf",
        metadata: { referralCode: "REF-ABC-123" },
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.92);
    expect(result.method).toBe("api");
    expect(result.details.referralCode).toBe("REF-ABC-123");
    expect(result.details.tracked).toBe(true);
  });

  it("gives moderate confidence for URL proof without referral code", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "dr",
        proofUrl: "https://example.com/ref/abc123",
        proofType: "url",
        actionId: "dr_rf",
      })
    );
    expect(result.confidence).toBe(0.7);
    expect(result.method).toBe("manual");
  });

  it("gives manual_review for screenshot proof", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "dr",
        proofType: "screenshot",
        proofUrl: "https://example.com/proof.png",
        actionId: "dr_rf",
      })
    );
    expect(result.confidence).toBe(0.5);
    expect(result.status).toBe("manual_review");
  });

  it("handles unknown proof type with manual_review", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "dr",
        proofType: "video" as VerificationSubmission["proofType"],
        proofUrl: "https://example.com",
        actionId: "dr_rf",
      })
    );
    expect(result.confidence).toBe(0.4);
    expect(result.status).toBe("manual_review");
  });
});

// ─── Generic URL Verifier ─────────────────────────────────────────────────────

describe("URLVerifier", () => {
  let verifier: InstanceType<typeof URLVerifier>;

  beforeEach(() => {
    verifier = new URLVerifier();
  });

  it("gives medium confidence for valid HTTPS URLs", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "_url",
        proofUrl: "https://example.com/some-proof",
        proofType: "url",
        actionId: "test",
      })
    );
    expect(result.confidence).toBe(0.7);
    expect(result.details.secure).toBe(true);
    expect(result.method).toBe("url_check");
  });

  it("gives slightly lower confidence for HTTP URLs", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "_url",
        proofUrl: "http://example.com/some-proof",
        proofType: "url",
        actionId: "test",
      })
    );
    expect(result.confidence).toBe(0.65);
    expect(result.details.secure).toBeUndefined();
  });

  it("fails for invalid URL format", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "_url",
        proofUrl: "not-a-url",
        proofType: "url",
        actionId: "test",
      })
    );
    expect(result.confidence).toBe(0.1);
    expect(result.status).toBe("failed");
    expect(result.details.urlValid).toBe(false);
  });

  it("handles non-URL proof type gracefully", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "_url",
        proofType: "screenshot",
        proofUrl: "https://example.com/proof.png",
        actionId: "test",
      })
    );
    expect(result.confidence).toBe(0.3);
    expect(result.status).toBe("failed");
  });

  it("uses the submission platformId (not _url) in the result", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "unknown_platform",
        proofUrl: "https://example.com/proof",
        proofType: "url",
        actionId: "test",
      })
    );
    expect(result.platformId).toBe("unknown_platform");
  });
});

// ─── Screenshot/OCR Verifier ──────────────────────────────────────────────────

describe("ScreenshotVerifier", () => {
  let verifier: InstanceType<typeof ScreenshotVerifier>;

  beforeEach(() => {
    verifier = new ScreenshotVerifier();
  });

  it("gives medium confidence for screenshot with valid image extension", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "ig",
        proofUrl: "https://uploads.example.com/screenshot.png",
        proofType: "screenshot",
        actionId: "ig_ps",
      })
    );
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.details.imageFormat).toBe("valid");
    expect(result.method).toBe("screenshot_ocr");
  });

  it("applies platform-specific boost to screenshot confidence", async () => {
    // Instagram boost is 0.08, base is 0.5 => 0.58
    const igResult = await verifier.verify(
      makeSubmission({
        platformId: "ig",
        proofUrl: "https://example.com/screenshot.jpg",
        proofType: "screenshot",
        actionId: "ig_ps",
      })
    );
    expect(igResult.confidence).toBe(0.58);

    // TikTok boost is 0.07, base is 0.5 => 0.57
    const ttResult = await verifier.verify(
      makeSubmission({
        platformId: "tt",
        proofUrl: "https://example.com/screenshot.jpg",
        proofType: "screenshot",
        actionId: "tt_ps",
      })
    );
    expect(ttResult.confidence).toBe(0.57);
  });

  it("gives lower confidence for URL-hosted images without extension", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "ig",
        proofUrl: "https://imgur.com/abcdef",
        proofType: "screenshot",
        actionId: "ig_ps",
      })
    );
    // Base 0.45 + ig boost 0.08 = 0.53
    expect(result.confidence).toBe(0.53);
    expect(result.details.imageFormat).toBe("url_hosted");
  });

  it("gives very low confidence for non-URL screenshot proof", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "ig",
        proofUrl: "blob:some-random-data",
        proofType: "screenshot",
        actionId: "ig_ps",
      })
    );
    // Base 0.2 + ig boost 0.08 = 0.28
    expect(result.confidence).toBe(0.28);
    expect(result.details.imageFormat).toBe("unknown");
  });

  it("handles non-screenshot proof type as baseline", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "ig",
        proofUrl: "https://example.com/proof",
        proofType: "url",
        actionId: "ig_ps",
      })
    );
    expect(result.confidence).toBe(0.2);
    expect(result.status).toBe("failed");
  });

  it("recognizes various image extensions", async () => {
    const extensions = ["jpg", "jpeg", "png", "webp", "gif", "bmp"];
    for (const ext of extensions) {
      const result = await verifier.verify(
        makeSubmission({
          platformId: "_screenshot",
          proofUrl: `https://example.com/proof.${ext}`,
          proofType: "screenshot",
          actionId: "test",
        })
      );
      expect(result.details.imageFormat).toBe("valid");
    }
  });

  it("recognizes image extensions with query parameters", async () => {
    const result = await verifier.verify(
      makeSubmission({
        platformId: "_screenshot",
        proofUrl: "https://example.com/proof.png?w=800&h=600",
        proofType: "screenshot",
        actionId: "test",
      })
    );
    expect(result.details.imageFormat).toBe("valid");
  });
});

// ─── VerificationEngine (Orchestrator) ────────────────────────────────────────

describe("VerificationEngine", () => {
  let engine: InstanceType<typeof VerificationEngine>;

  beforeEach(() => {
    engine = new VerificationEngine();
  });

  // ── Platform Registration ─────────────────────────────────────────────────

  describe("platform registration", () => {
    it("registers all 15 platform verifiers", () => {
      const platforms = engine.getRegisteredPlatforms();
      expect(platforms).toContain("ig");
      expect(platforms).toContain("tt");
      expect(platforms).toContain("go");
      expect(platforms).toContain("fb");
      expect(platforms).toContain("xw");
      expect(platforms).toContain("yt");
      expect(platforms).toContain("yp");
      expect(platforms).toContain("li");
      expect(platforms).toContain("pi");
      expect(platforms).toContain("rd");
      expect(platforms).toContain("th");
      expect(platforms).toContain("sc");
      expect(platforms).toContain("ta");
      expect(platforms).toContain("nd");
      expect(platforms).toContain("dr");
      expect(platforms.length).toBe(15);
    });

    it("hasVerifier returns true for registered platforms", () => {
      expect(engine.hasVerifier("ig")).toBe(true);
      expect(engine.hasVerifier("tt")).toBe(true);
      expect(engine.hasVerifier("go")).toBe(true);
    });

    it("hasVerifier returns false for unknown platforms", () => {
      expect(engine.hasVerifier("unknown")).toBe(false);
      expect(engine.hasVerifier("")).toBe(false);
    });
  });

  // ── Single Verification ───────────────────────────────────────────────────

  describe("verify (single)", () => {
    it("routes to the correct platform verifier", async () => {
      const result = await engine.verify(
        makeSubmission({
          platformId: "ig",
          proofUrl: "https://instagram.com/p/abc123",
          proofType: "url",
        })
      );
      expect(result.platformId).toBe("ig");
      expect(result.status).toBe("verified");
    });

    it("stores the result in the results map", async () => {
      const submission = makeSubmission({
        submissionId: "store-test-1",
        platformId: "ig",
        proofUrl: "https://instagram.com/p/abc123",
        proofType: "url",
      });
      await engine.verify(submission);

      const stored = engine.getVerificationStatus("store-test-1");
      expect(stored).not.toBeNull();
      expect(stored!.submissionId).toBe("store-test-1");
    });

    it("falls back to generic verifiers for unknown platforms", async () => {
      const result = await engine.verify(
        makeSubmission({
          platformId: "unknown_platform",
          proofUrl: "https://some-platform.com/post/123",
          proofType: "url",
        })
      );
      // Should use URL verifier fallback
      expect(result.method).toBe("url_check");
    });

    it("falls back to screenshot verifier for unknown platform with screenshot", async () => {
      const result = await engine.verify(
        makeSubmission({
          platformId: "unknown_platform",
          proofUrl: "https://example.com/screenshot.png",
          proofType: "screenshot",
        })
      );
      expect(result.method).toBe("screenshot_ocr");
    });

    it("returns manual_review for unknown platform with unknown proof type", async () => {
      const result = await engine.verify(
        makeSubmission({
          platformId: "unknown_platform",
          proofType: "video" as VerificationSubmission["proofType"],
          proofUrl: "https://example.com/video.mp4",
        })
      );
      expect(result.status).toBe("manual_review");
      expect(result.method).toBe("manual");
      expect(result.confidence).toBe(0.1);
    });
  });

  // ── Batch Verification ────────────────────────────────────────────────────

  describe("batchVerify", () => {
    it("verifies multiple submissions in parallel", async () => {
      const submissions = [
        makeSubmission({
          submissionId: "batch-1",
          platformId: "ig",
          proofUrl: "https://instagram.com/p/abc",
          proofType: "url",
        }),
        makeSubmission({
          submissionId: "batch-2",
          platformId: "tt",
          proofUrl: "https://tiktok.com/@user/video/123",
          proofType: "url",
        }),
        makeSubmission({
          submissionId: "batch-3",
          platformId: "xw",
          proofUrl: "https://nottwitter.example.com/123",
          proofType: "url",
        }),
      ];

      const batch = await engine.batchVerify(submissions);

      expect(batch.totalCount).toBe(3);
      expect(batch.results).toHaveLength(3);
      expect(batch.verifiedCount + batch.failedCount + batch.manualReviewCount).toBeLessThanOrEqual(3);
      expect(batch.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("correctly counts verified, failed, and manual_review statuses", async () => {
      const submissions = [
        // This should be verified (valid IG URL)
        makeSubmission({
          submissionId: "b-v",
          platformId: "ig",
          proofUrl: "https://instagram.com/p/abc",
          proofType: "url",
        }),
        // This should be failed (wrong URL for X)
        makeSubmission({
          submissionId: "b-f",
          platformId: "xw",
          proofUrl: "https://totally-wrong-domain.example.com/123",
          proofType: "url",
        }),
        // This should be manual_review (screenshot for IG)
        makeSubmission({
          submissionId: "b-m",
          platformId: "ig",
          proofUrl: "https://example.com/proof.png",
          proofType: "screenshot",
        }),
      ];

      const batch = await engine.batchVerify(submissions);

      expect(batch.verifiedCount).toBe(1);
      expect(batch.failedCount).toBe(1);
      expect(batch.manualReviewCount).toBe(1);
    });

    it("handles empty batch gracefully", async () => {
      const batch = await engine.batchVerify([]);

      expect(batch.totalCount).toBe(0);
      expect(batch.results).toHaveLength(0);
      expect(batch.verifiedCount).toBe(0);
      expect(batch.failedCount).toBe(0);
      expect(batch.manualReviewCount).toBe(0);
    });
  });

  // ── Fallback Chain ────────────────────────────────────────────────────────

  describe("verifyWithFallback", () => {
    it("returns immediately when platform verifier succeeds", async () => {
      const result = await engine.verifyWithFallback(
        makeSubmission({
          platformId: "ig",
          proofUrl: "https://instagram.com/p/abc123",
          proofType: "url",
        })
      );
      expect(result.status).toBe("verified");
      // Platform verifier succeeded, so API method
      expect(result.method).toBe("api");
    });

    it("falls through to URL verifier when platform verifier fails (URL proof)", async () => {
      const result = await engine.verifyWithFallback(
        makeSubmission({
          platformId: "xw",
          proofUrl: "https://not-twitter.example.com/post",
          proofType: "url",
        })
      );
      // Platform verifier gives 0.2 (failed), URL verifier gives 0.7 (HTTPS URL)
      // URL verifier should not return "verified" (0.7 < 0.75), so the best of the two
      // attempts is returned. 0.7 from URL verifier is > 0.2 from platform verifier.
      expect(result.confidence).toBeGreaterThanOrEqual(0.2);
    });

    it("falls through to screenshot verifier when platform verifier fails (screenshot proof)", async () => {
      const result = await engine.verifyWithFallback(
        makeSubmission({
          platformId: "ig",
          proofUrl: "https://example.com/proof.jpg",
          proofType: "screenshot",
        })
      );
      // Instagram screenshot gives 0.55 (manual_review), screenshot verifier gives ~0.58 with ig boost
      // Best of the two should be returned
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it("returns manual_review with zero confidence when no verification methods work", async () => {
      // Craft a submission for a totally unknown platform with a non-URL/screenshot proof type
      const result = await engine.verifyWithFallback(
        makeSubmission({
          platformId: "nonexistent_platform",
          proofType: "video" as VerificationSubmission["proofType"],
          proofUrl: "something",
        })
      );
      // No platform verifier, not URL proof, not screenshot proof => zero attempts
      expect(result.status).toBe("manual_review");
      expect(result.confidence).toBe(0);
      expect(result.method).toBe("manual");
      expect(result.details).toHaveProperty("reason");
    });

    it("stores the best fallback result", async () => {
      const submission = makeSubmission({
        submissionId: "fallback-store-test",
        platformId: "ig",
        proofUrl: "https://instagram.com/p/abc",
        proofType: "url",
      });
      await engine.verifyWithFallback(submission);

      const stored = engine.getVerificationStatus("fallback-store-test");
      expect(stored).not.toBeNull();
      expect(stored!.status).toBe("verified");
    });

    it("returns manual_review when all attempts are below manual_review threshold", async () => {
      // Use a platform with URL proof that doesn't match any platform pattern
      // and an invalid URL format
      const result = await engine.verifyWithFallback(
        makeSubmission({
          platformId: "xw",
          proofUrl: "not-a-url",
          proofType: "url",
        })
      );
      // Platform verifier: 0.2 (non-X URL), URL verifier: 0.1 (invalid URL format)
      // Both below 0.4 threshold => manual_review wrapper
      expect(result.status).toBe("manual_review");
      expect(result.method).toBe("manual");
      expect(result.details).toHaveProperty("attempts");
      expect(result.details).toHaveProperty("bestConfidence");
    });
  });

  // ── Result Storage & Stats ────────────────────────────────────────────────

  describe("result storage and statistics", () => {
    it("getVerificationStatus returns null for unknown submissionId", () => {
      expect(engine.getVerificationStatus("nonexistent")).toBeNull();
    });

    it("getAllResults returns all stored results", async () => {
      await engine.verify(
        makeSubmission({ submissionId: "r-1", platformId: "ig", proofUrl: "https://instagram.com/p/a", proofType: "url" })
      );
      await engine.verify(
        makeSubmission({ submissionId: "r-2", platformId: "tt", proofUrl: "https://tiktok.com/@u/video/1", proofType: "url" })
      );

      const results = engine.getAllResults();
      expect(results).toHaveLength(2);
      const ids = results.map((r) => r.submissionId);
      expect(ids).toContain("r-1");
      expect(ids).toContain("r-2");
    });

    it("clear() removes all stored results", async () => {
      await engine.verify(
        makeSubmission({ submissionId: "clear-1", platformId: "ig", proofUrl: "https://instagram.com/p/a", proofType: "url" })
      );
      expect(engine.getAllResults().length).toBe(1);

      engine.clear();
      expect(engine.getAllResults().length).toBe(0);
      expect(engine.getVerificationStatus("clear-1")).toBeNull();
    });

    it("getStats returns correct aggregate statistics", async () => {
      // Create a mix of results
      await engine.verify(
        makeSubmission({ submissionId: "s-1", platformId: "ig", proofUrl: "https://instagram.com/p/a", proofType: "url" })
      ); // verified
      await engine.verify(
        makeSubmission({ submissionId: "s-2", platformId: "xw", proofUrl: "https://totally-wrong-domain.example.com/123", proofType: "url" })
      ); // failed
      await engine.verify(
        makeSubmission({ submissionId: "s-3", platformId: "ig", proofType: "screenshot", proofUrl: "https://example.com/proof.png" })
      ); // manual_review

      const stats = engine.getStats();

      expect(stats.totalVerifications).toBe(3);
      expect(stats.verified).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.manualReview).toBe(1);
      expect(stats.pending).toBe(0);
      expect(stats.averageConfidence).toBeGreaterThan(0);
      expect(stats.byPlatform).toHaveProperty("ig");
      expect(stats.byPlatform).toHaveProperty("xw");
      expect(stats.byPlatform.ig.count).toBe(2);
      expect(stats.byPlatform.xw.count).toBe(1);
    });

    it("getStats returns zeroes when no results exist", () => {
      const stats = engine.getStats();
      expect(stats.totalVerifications).toBe(0);
      expect(stats.averageConfidence).toBe(0);
      expect(Object.keys(stats.byPlatform)).toHaveLength(0);
    });

    it("getStats computes per-platform average confidence", async () => {
      await engine.verify(
        makeSubmission({ submissionId: "avg-1", platformId: "ig", proofUrl: "https://instagram.com/p/a", proofType: "url" })
      );
      await engine.verify(
        makeSubmission({ submissionId: "avg-2", platformId: "ig", proofType: "api_verified", proofUrl: "" })
      );

      const stats = engine.getStats();
      expect(stats.byPlatform.ig.avgConfidence).toBeGreaterThan(0);
      expect(stats.byPlatform.ig.count).toBe(2);
    });
  });

  // ── Result Eviction ───────────────────────────────────────────────────────

  describe("result eviction", () => {
    it("does not evict results when under the max limit", async () => {
      for (let i = 0; i < 10; i++) {
        await engine.verify(
          makeSubmission({
            submissionId: `evict-${i}`,
            platformId: "ig",
            proofUrl: "https://instagram.com/p/a",
            proofType: "url",
          })
        );
      }
      expect(engine.getAllResults().length).toBe(10);
    });

    it("getResultsStore exposes the internal Map", () => {
      const store = engine.getResultsStore();
      expect(store).toBeInstanceOf(Map);
      expect(store.size).toBe(0);
    });
  });

  // ── Overwrites on re-verification ─────────────────────────────────────────

  describe("re-verification", () => {
    it("overwrites a previous result for the same submissionId", async () => {
      const id = "overwrite-test";

      // First: screenshot proof (lower confidence)
      await engine.verify(
        makeSubmission({
          submissionId: id,
          platformId: "ig",
          proofType: "screenshot",
          proofUrl: "https://example.com/proof.png",
        })
      );
      const first = engine.getVerificationStatus(id);
      expect(first!.status).toBe("manual_review");

      // Second: URL proof (higher confidence)
      await engine.verify(
        makeSubmission({
          submissionId: id,
          platformId: "ig",
          proofUrl: "https://instagram.com/p/abc",
          proofType: "url",
        })
      );
      const second = engine.getVerificationStatus(id);
      expect(second!.status).toBe("verified");
      expect(second!.confidence).toBeGreaterThan(first!.confidence);

      // Only one entry should exist
      expect(engine.getAllResults().filter((r) => r.submissionId === id)).toHaveLength(1);
    });
  });
});

// ─── Singleton Export ─────────────────────────────────────────────────────────

describe("verificationEngine singleton", () => {
  beforeEach(() => {
    verificationEngine.clear();
  });

  it("is an instance of VerificationEngine", () => {
    expect(verificationEngine).toBeDefined();
    expect(verificationEngine.getRegisteredPlatforms().length).toBe(15);
  });

  it("can verify submissions", async () => {
    const result = await verificationEngine.verify(
      makeSubmission({
        platformId: "ig",
        proofUrl: "https://instagram.com/p/abc",
        proofType: "url",
      })
    );
    expect(result.status).toBe("verified");
  });
});

// ─── Confidence-to-Status Mapping (via verifier outputs) ──────────────────────

describe("confidence-to-status thresholds", () => {
  let engine: InstanceType<typeof VerificationEngine>;

  beforeEach(() => {
    engine = new VerificationEngine();
  });

  it("maps confidence >= 0.75 to verified", async () => {
    // api_verified always gets >= 0.90 confidence
    const result = await engine.verify(
      makeSubmission({
        platformId: "ig",
        proofType: "api_verified",
        proofUrl: "",
      })
    );
    expect(result.status).toBe("verified");
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it("maps confidence between 0.4 and 0.75 to manual_review", async () => {
    // screenshot proof for IG gives 0.55
    const result = await engine.verify(
      makeSubmission({
        platformId: "ig",
        proofType: "screenshot",
        proofUrl: "https://example.com/proof.png",
      })
    );
    expect(result.status).toBe("manual_review");
    expect(result.confidence).toBeGreaterThanOrEqual(0.4);
    expect(result.confidence).toBeLessThan(0.75);
  });

  it("maps confidence < 0.4 to failed", async () => {
    // Non-matching URL for any platform gives 0.2
    const result = await engine.verify(
      makeSubmission({
        platformId: "ig",
        proofUrl: "https://totally-wrong-domain.com/something",
        proofType: "url",
      })
    );
    expect(result.status).toBe("failed");
    expect(result.confidence).toBeLessThan(0.4);
  });
});

// ─── Edge Cases ───────────────────────────────────────────────────────────────

describe("edge cases", () => {
  let engine: InstanceType<typeof VerificationEngine>;

  beforeEach(() => {
    engine = new VerificationEngine();
  });

  it("handles empty proof URL", async () => {
    const result = await engine.verify(
      makeSubmission({
        platformId: "ig",
        proofUrl: "",
        proofType: "url",
      })
    );
    // Empty URL won't match Instagram domain patterns
    expect(result.status).toBe("failed");
  });

  it("handles submission with all optional metadata", async () => {
    const result = await engine.verify(
      makeSubmission({
        platformId: "dr",
        proofUrl: "https://example.com/ref",
        proofType: "url",
        actionId: "dr_rf",
        metadata: {
          referralCode: "REF-123",
          userId: "user-abc",
          campaignId: "camp-xyz",
        },
      })
    );
    // DirectReferralVerifier should use the referral code
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(0.92);
  });

  it("handles case-insensitive URL matching", async () => {
    const result = await engine.verify(
      makeSubmission({
        platformId: "ig",
        proofUrl: "HTTPS://WWW.INSTAGRAM.COM/P/ABC123/",
        proofType: "url",
      })
    );
    // urlMatchesPlatform uses .toLowerCase()
    expect(result.status).toBe("verified");
    expect(result.details.urlValid).toBe(true);
  });

  it("handles very long URLs", async () => {
    const longPath = "a".repeat(2000);
    const result = await engine.verify(
      makeSubmission({
        platformId: "ig",
        proofUrl: `https://instagram.com/p/${longPath}`,
        proofType: "url",
      })
    );
    expect(result.status).toBe("verified");
  });

  it("handles URLs with special characters", async () => {
    const result = await engine.verify(
      makeSubmission({
        platformId: "ig",
        proofUrl: "https://instagram.com/p/abc%20123?ref=test&foo=bar#section",
        proofType: "url",
      })
    );
    expect(result.status).toBe("verified");
  });

  it("result verifiedAt is a valid ISO date string", async () => {
    const result = await engine.verify(
      makeSubmission({
        platformId: "ig",
        proofUrl: "https://instagram.com/p/abc",
        proofType: "url",
      })
    );
    const date = new Date(result.verifiedAt);
    expect(date.getTime()).not.toBeNaN();
    expect(result.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("confidence is always between 0 and 1 (inclusive)", async () => {
    const platforms = engine.getRegisteredPlatforms();
    const proofTypes: VerificationSubmission["proofType"][] = [
      "url",
      "screenshot",
      "api_verified",
      "video",
    ];

    for (const pid of platforms) {
      for (const pt of proofTypes) {
        const result = await engine.verify(
          makeSubmission({
            platformId: pid,
            proofType: pt,
            proofUrl: "https://example.com/proof",
          })
        );
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }
    }
  });

  it("confidence values are rounded to 2 decimal places", async () => {
    const result = await engine.verify(
      makeSubmission({
        platformId: "ig",
        proofUrl: "https://instagram.com/p/abc",
        proofType: "url",
      })
    );
    const decimalPlaces = result.confidence.toString().split(".")[1]?.length ?? 0;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });
});
