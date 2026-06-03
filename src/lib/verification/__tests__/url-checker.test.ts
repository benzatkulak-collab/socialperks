import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkProofUrl,
  detectPlatform,
  isValidHttpsUrl,
} from "../url-checker";
import { promises as dnsPromises } from "node:dns";

// checkProofUrl now resolves DNS via assertSafeUrl before fetching (SSRF guard).
// Mock node:dns so hostname cases resolve to a public IP — keeps these unit
// tests hermetic (no real network). Literal-IP / non-https cases reject before
// DNS, so they're unaffected.
vi.mock("node:dns", () => ({
  promises: { lookup: vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]) },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// URL FORMAT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("isValidHttpsUrl", () => {
  it("accepts valid https URLs", () => {
    expect(isValidHttpsUrl("https://instagram.com/p/abc123")).toBe(true);
    expect(isValidHttpsUrl("https://www.tiktok.com/@user/video/123")).toBe(true);
    expect(isValidHttpsUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
  });

  it("rejects http URLs (not https)", () => {
    expect(isValidHttpsUrl("http://instagram.com/p/abc123")).toBe(false);
  });

  it("rejects URLs without a protocol", () => {
    expect(isValidHttpsUrl("instagram.com/p/abc123")).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(isValidHttpsUrl("")).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(isValidHttpsUrl("not a url at all")).toBe(false);
    expect(isValidHttpsUrl("https://")).toBe(false);
  });

  it("rejects non-URL protocols", () => {
    expect(isValidHttpsUrl("ftp://files.example.com/proof.jpg")).toBe(false);
    expect(isValidHttpsUrl("javascript:alert(1)")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

describe("detectPlatform", () => {
  it("detects Instagram from instagram.com", () => {
    expect(detectPlatform("https://www.instagram.com/p/abc123")).toBe("ig");
  });

  it("detects Instagram from instagr.am", () => {
    expect(detectPlatform("https://instagr.am/p/abc123")).toBe("ig");
  });

  it("detects TikTok from tiktok.com", () => {
    expect(detectPlatform("https://www.tiktok.com/@user/video/123")).toBe("tt");
  });

  it("detects TikTok from vm.tiktok.com", () => {
    expect(detectPlatform("https://vm.tiktok.com/ZMeVbN3")).toBe("tt");
  });

  it("detects Google from google.com", () => {
    expect(detectPlatform("https://www.google.com/maps/place/test")).toBe("ggl");
  });

  it("detects Google from maps.google.com", () => {
    expect(detectPlatform("https://maps.google.com/place/test")).toBe("ggl");
  });

  it("detects Google from g.co", () => {
    expect(detectPlatform("https://g.co/kgs/abc123")).toBe("ggl");
  });

  it("detects Google from g.page", () => {
    expect(detectPlatform("https://g.page/mybusiness")).toBe("ggl");
  });

  it("detects YouTube from youtube.com", () => {
    expect(detectPlatform("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("yt");
  });

  it("detects YouTube from youtu.be", () => {
    expect(detectPlatform("https://youtu.be/dQw4w9WgXcQ")).toBe("yt");
  });

  it("detects Facebook from facebook.com", () => {
    expect(detectPlatform("https://www.facebook.com/post/123")).toBe("fb");
  });

  it("detects Facebook from fb.com", () => {
    expect(detectPlatform("https://fb.com/post/123")).toBe("fb");
  });

  it("detects Facebook from fb.watch", () => {
    expect(detectPlatform("https://fb.watch/abc123")).toBe("fb");
  });

  it("detects X/Twitter from x.com", () => {
    expect(detectPlatform("https://x.com/user/status/123")).toBe("xw");
  });

  it("detects X/Twitter from twitter.com", () => {
    expect(detectPlatform("https://twitter.com/user/status/123")).toBe("xw");
  });

  it("detects X/Twitter from t.co", () => {
    expect(detectPlatform("https://t.co/abc123")).toBe("xw");
  });

  it("detects Yelp", () => {
    expect(detectPlatform("https://www.yelp.com/biz/coffee-shop")).toBe("yelp");
  });

  it("detects LinkedIn", () => {
    expect(detectPlatform("https://www.linkedin.com/posts/user-123")).toBe("li");
  });

  it("detects Pinterest from pinterest.com", () => {
    expect(detectPlatform("https://www.pinterest.com/pin/123")).toBe("pi");
  });

  it("detects Pinterest from pin.it", () => {
    expect(detectPlatform("https://pin.it/abc123")).toBe("pi");
  });

  it("detects Reddit", () => {
    expect(detectPlatform("https://www.reddit.com/r/test/comments/abc")).toBe("rd");
  });

  it("detects Threads", () => {
    expect(detectPlatform("https://www.threads.net/@user/post/abc")).toBe("th");
  });

  it("detects Snapchat", () => {
    expect(detectPlatform("https://www.snapchat.com/add/user")).toBe("sc");
  });

  it("detects Nextdoor", () => {
    expect(detectPlatform("https://nextdoor.com/p/abc123")).toBe("nd");
  });

  it("detects TripAdvisor", () => {
    expect(detectPlatform("https://www.tripadvisor.com/Restaurant_Review-abc")).toBe("ta");
  });

  it("returns null for unknown domains", () => {
    expect(detectPlatform("https://example.com/page")).toBeNull();
  });

  it("returns null for malformed URLs", () => {
    expect(detectPlatform("not-a-url")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// checkProofUrl — INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("checkProofUrl", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn();
    // Re-arm the dns mock each test — afterEach's restoreAllMocks resets it,
    // and assertSafeUrl resolves the hostname before the (mocked) fetch.
    vi.mocked(dnsPromises.lookup).mockResolvedValue(
      [{ address: "93.184.216.34", family: 4 }] as never,
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ─── Invalid URL (no fetch attempted) ────────────────────────────────────

  it("returns early with low confidence for non-https URLs", async () => {
    const result = await checkProofUrl("http://instagram.com/p/abc", "ig");

    expect(result.reachable).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.platformMatch).toBe(false);
    expect(result.checks).toContain("url_format:fail");
    // fetch should not have been called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns early with low confidence for malformed URLs", async () => {
    const result = await checkProofUrl("not a url", "ig");

    expect(result.reachable).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.checks).toContain("url_format:fail");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // ─── Successful fetch (200 + text/html) ──────────────────────────────────

  it("returns full confidence (1.0) for valid URL, matching platform, 200, text/html", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      status: 200,
      url: "https://www.instagram.com/p/abc123",
      headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
    } as Response);

    const result = await checkProofUrl("https://www.instagram.com/p/abc123", "ig");

    expect(result.reachable).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.platformMatch).toBe(true);
    expect(result.confidence).toBe(1.0);
    expect(result.checks).toContain("url_format:pass");
    expect(result.checks).toContain("platform_match:pass");
    expect(result.checks).toContain("http_status:pass");
    expect(result.checks).toContain("content_type:pass");
  });

  it("scores 0.6 when platform does not match but URL is reachable", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      status: 200,
      url: "https://www.example.com/proof",
      headers: new Headers({ "content-type": "text/html" }),
    } as Response);

    const result = await checkProofUrl("https://www.example.com/proof", "ig");

    expect(result.reachable).toBe(true);
    expect(result.platformMatch).toBe(false);
    // 0.3 (format) + 0 (no platform match) + 0.3 (200) + 0.1 (html) = 0.7
    expect(result.confidence).toBe(0.7);
    expect(result.checks).toContain("platform_match:fail");
  });

  // ─── Non-200 response ─────────────────────────────────────────────────────

  it("handles 404 response — reachable false, reduced confidence", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      status: 404,
      url: "https://www.instagram.com/p/deleted",
      headers: new Headers({ "content-type": "text/html" }),
    } as Response);

    const result = await checkProofUrl("https://www.instagram.com/p/deleted", "ig");

    expect(result.reachable).toBe(false);
    expect(result.statusCode).toBe(404);
    // 0.3 (format) + 0.3 (platform) + 0 (not 200) + 0.1 (html) = 0.7
    expect(result.confidence).toBe(0.7);
    expect(result.checks).toEqual(
      expect.arrayContaining(["http_status:fail(404)"])
    );
  });

  // ─── Network error ────────────────────────────────────────────────────────

  it("handles network errors gracefully (no throw)", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await checkProofUrl("https://www.instagram.com/p/abc", "ig");

    expect(result.reachable).toBe(false);
    expect(result.statusCode).toBe(0);
    // 0.3 (format) + 0.3 (platform) = 0.6
    expect(result.confidence).toBe(0.6);
    expect(result.checks).toEqual(
      expect.arrayContaining([expect.stringContaining("http_request:fail")])
    );
  });

  it("handles abort/timeout errors gracefully", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new DOMException("Aborted", "AbortError"));

    const result = await checkProofUrl("https://www.tiktok.com/@user/video/123", "tt");

    expect(result.reachable).toBe(false);
    expect(result.confidence).toBe(0.6);
    expect(result.checks).toEqual(
      expect.arrayContaining([expect.stringContaining("http_request:fail")])
    );
  });

  // ─── Redirect detection ───────────────────────────────────────────────────

  it("detects redirects when response URL differs from request URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      status: 200,
      url: "https://www.instagram.com/p/abc123/",
      headers: new Headers({ "content-type": "text/html" }),
    } as Response);

    const result = await checkProofUrl("https://instagr.am/p/abc123", "ig");

    expect(result.redirectedUrl).toBe("https://www.instagram.com/p/abc123/");
    expect(result.reachable).toBe(true);
  });

  it("returns null redirectedUrl when no redirect occurs", async () => {
    const url = "https://www.instagram.com/p/abc123";
    vi.mocked(global.fetch).mockResolvedValue({
      status: 200,
      url,
      headers: new Headers({ "content-type": "text/html" }),
    } as Response);

    const result = await checkProofUrl(url, "ig");
    expect(result.redirectedUrl).toBeNull();
  });

  // ─── Content-Type edge cases ──────────────────────────────────────────────

  it("fails content-type check for non-HTML responses", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      status: 200,
      url: "https://www.instagram.com/p/abc123",
      headers: new Headers({ "content-type": "application/json" }),
    } as Response);

    const result = await checkProofUrl("https://www.instagram.com/p/abc123", "ig");

    // 0.3 + 0.3 + 0.3 + 0 (not html) = 0.9
    expect(result.confidence).toBe(0.9);
    expect(result.checks).toEqual(
      expect.arrayContaining([expect.stringContaining("content_type:fail")])
    );
  });

  it("handles missing content-type header", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      status: 200,
      url: "https://www.instagram.com/p/abc123",
      headers: new Headers(),
    } as Response);

    const result = await checkProofUrl("https://www.instagram.com/p/abc123", "ig");

    expect(result.contentType).toBeNull();
    expect(result.confidence).toBe(0.9);
    expect(result.checks).toEqual(
      expect.arrayContaining(["content_type:fail(none)"])
    );
  });

  // ─── Unknown platform ─────────────────────────────────────────────────────

  it("handles unknown platform — platformMatch is false", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      status: 200,
      url: "https://www.instagram.com/p/abc123",
      headers: new Headers({ "content-type": "text/html" }),
    } as Response);

    const result = await checkProofUrl("https://www.instagram.com/p/abc123", "unknown_platform");

    expect(result.platformMatch).toBe(false);
    // 0.3 (format) + 0 (no match) + 0.3 (200) + 0.1 (html) = 0.7
    expect(result.confidence).toBe(0.7);
  });

  // ─── Detected platform field ──────────────────────────────────────────────

  it("populates detectedPlatform even when expectedPlatform is wrong", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      status: 200,
      url: "https://www.tiktok.com/@user/video/123",
      headers: new Headers({ "content-type": "text/html" }),
    } as Response);

    const result = await checkProofUrl("https://www.tiktok.com/@user/video/123", "ig");

    expect(result.detectedPlatform).toBe("tt");
    expect(result.platformMatch).toBe(false);
  });

  // ─── Fetch called with correct parameters ─────────────────────────────────

  it("calls fetch with HEAD method, abort signal, and user-agent", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      status: 200,
      url: "https://www.instagram.com/p/abc",
      headers: new Headers({ "content-type": "text/html" }),
    } as Response);

    await checkProofUrl("https://www.instagram.com/p/abc", "ig");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://www.instagram.com/p/abc",
      expect.objectContaining({
        method: "HEAD",
        // SECURITY: redirect is "manual" (was "follow") so attackers
        // can't chain a public URL → 30x → internal IP for SSRF.
        redirect: "manual",
        headers: expect.objectContaining({
          "User-Agent": "SocialPerks-UrlChecker/1.0",
        }),
      })
    );
  });
});
