/**
 * Screenshot Analysis System
 *
 * Lightweight image analysis and verification without external OCR libraries.
 * Analyzes image headers, metadata, dimensions, and file characteristics to
 * determine screenshot authenticity and detect potential manipulation.
 *
 * Used by the verification engine when proofType === "screenshot".
 */

import {
  getImageType,
  getPngDimensions,
  getJpegDimensions,
  getJpegExif,
  detectUniformBlocks,
  detectMultipleHeaders,
  type ImageType,
  type ExifData,
} from "./image-parser";
import { isSafeUrl } from "@/lib/security/url";
import {
  hashImage,
  findSimilarImages,
  findExactDuplicate,
} from "./image-hash";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ScreenshotAnalysis {
  isValid: boolean;
  fileType: string | null;
  dimensions: { width: number; height: number } | null;
  fileSize: number;
  platformIndicators: PlatformIndicator[];
  confidence: number;
  checks: string[];
  warnings: string[];
}

export interface PlatformIndicator {
  platform: string;
  indicator: string;
  confidence: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Platform filename patterns (case-insensitive) */
const PLATFORM_FILENAME_PATTERNS: Record<string, RegExp[]> = {
  instagram: [/instagram/i, /\bIG\b/, /insta/i],
  tiktok: [/tiktok/i, /\btk\b/i],
  twitter: [/twitter/i, /\bx\.com\b/i, /tweet/i],
  facebook: [/facebook/i, /\bfb\b/i],
  youtube: [/youtube/i, /\byt\b/i],
  google: [/google/i, /g_review/i, /gmaps/i],
  yelp: [/yelp/i],
  linkedin: [/linkedin/i, /\bli\b/i],
  pinterest: [/pinterest/i, /\bpin\b/i],
  reddit: [/reddit/i],
  snapchat: [/snapchat/i, /\bsnap\b/i],
  threads: [/threads/i],
  tripadvisor: [/tripadvisor/i, /trip_?advisor/i],
  nextdoor: [/nextdoor/i],
};

/** Common screenshot filename patterns */
const SCREENSHOT_FILENAME_PATTERNS = [
  /screenshot/i,
  /screen[\s_-]?shot/i,
  /IMG_\d+/,
  /image_?\d+/i,
  /capture/i,
  /screen[\s_-]?cap/i,
  /snap[\s_-]?\d+/i,
  /photo_?\d+/i,
];

/** Mobile device dimensions (common screen sizes in portrait) */
const MOBILE_DIMENSIONS = {
  minWidth: 320,
  maxWidth: 500,
  minHeight: 568,
  maxHeight: 1000,
};

/** Desktop screenshot dimensions */
const DESKTOP_DIMENSIONS = {
  minWidth: 1024,
  maxWidth: 3840,
  minHeight: 600,
  maxHeight: 2400,
};

/** Reasonable file size bounds */
const FILE_SIZE_LIMITS = {
  minBytes: 1_000,       // 1 KB — too small for a real screenshot
  maxBytes: 50_000_000,  // 50 MB — too large, likely not a screenshot
  /** Expected bytes per pixel for compressed screenshots */
  minBpp: 0.1,
  maxBpp: 8.0,
};

// ─── Core Analysis Functions ────────────────────────────────────────────────

/**
 * Analyze a screenshot from a URL by fetching it and inspecting the response.
 */
export async function analyzeScreenshotUrl(url: string): Promise<ScreenshotAnalysis> {
  const checks: string[] = [];
  const warnings: string[] = [];

  // Validate URL
  if (!url || typeof url !== "string") {
    return emptyAnalysis(0, "Invalid URL provided", checks, warnings);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      warnings.push("Non-HTTP(S) protocol");
      return emptyAnalysis(0, "URL must use HTTP or HTTPS", checks, warnings);
    }
    checks.push("URL format: valid");
  } catch {
    warnings.push("Malformed URL");
    return emptyAnalysis(0, "Malformed URL", checks, warnings);
  }

  // Fetch with timeout and size limit
  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    // SECURITY: SSRF guard. Reject internal-IP URLs and disable
    // redirect-follow.
    const safety = isSafeUrl(url);
    if (safety !== null) {
      warnings.push(`Unsafe URL: ${safety}`);
      return emptyAnalysis(0, `Unsafe URL: ${safety}`, checks, warnings);
    }
    response = await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
      headers: { "User-Agent": "SocialPerks-Verification/1.0" },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      warnings.push(`HTTP ${response.status}`);
      return emptyAnalysis(0, `Fetch failed: HTTP ${response.status}`, checks, warnings);
    }
    checks.push(`HTTP status: ${response.status}`);
  } catch (fetchError) {
    const message = fetchError instanceof Error ? fetchError.message : "Fetch failed";
    warnings.push(message);
    return emptyAnalysis(0, message, checks, warnings);
  }

  // Check content-type header
  const contentType = response.headers.get("content-type") || "";
  if (contentType.startsWith("image/")) {
    checks.push(`Content-Type: ${contentType}`);
  } else {
    warnings.push(`Unexpected Content-Type: ${contentType}`);
  }

  // Read body as buffer
  let buffer: Buffer;
  try {
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch {
    warnings.push("Failed to read response body");
    return emptyAnalysis(0, "Failed to read response body", checks, warnings);
  }

  // Extract filename from URL path
  const filename = parsedUrl.pathname.split("/").pop() || "";

  return analyzeScreenshotBuffer(buffer, filename);
}

/**
 * Analyze raw image data from a buffer.
 */
export function analyzeScreenshotBuffer(buffer: Buffer, filename?: string): ScreenshotAnalysis {
  const checks: string[] = [];
  const warnings: string[] = [];
  const platformIndicators: PlatformIndicator[] = [];
  let confidence = 0;

  // ── Image-similarity check (perceptual hash) ────────────────────────────
  // Detects the most common screenshot fraud: same image submitted under
  // different usernames. Both exact-byte (sha256) and visual-similarity
  // (pHash with Hamming distance) checked.
  const hashResult = hashImage(new Uint8Array(buffer));
  if (hashResult) {
    const exact = findExactDuplicate(hashResult.sha256);
    if (exact) {
      warnings.push(
        `Exact duplicate of submission ${exact.submissionId} (sha256 match)`
      );
      checks.push("image-hash: exact-duplicate-detected");
    } else {
      const similar = findSimilarImages(hashResult.pHash, 5);
      if (similar.length > 0) {
        warnings.push(
          `Visually similar to ${similar.length} prior submission(s); review carefully`
        );
        checks.push("image-hash: near-duplicate-detected");
      } else {
        checks.push("image-hash: novel");
      }
    }
  }

  // ── File size check ─────────────────────────────────────────────────────
  const fileSize = buffer.length;

  if (fileSize < FILE_SIZE_LIMITS.minBytes) {
    warnings.push(`File too small: ${fileSize} bytes`);
    return {
      isValid: false,
      fileType: null,
      dimensions: null,
      fileSize,
      platformIndicators,
      confidence: 0,
      checks: [...checks, "File size: too small"],
      warnings,
    };
  }

  if (fileSize > FILE_SIZE_LIMITS.maxBytes) {
    warnings.push(`File too large: ${fileSize} bytes`);
    return {
      isValid: false,
      fileType: null,
      dimensions: null,
      fileSize,
      platformIndicators,
      confidence: 0,
      checks: [...checks, "File size: too large"],
      warnings,
    };
  }

  checks.push(`File size: ${fileSize} bytes`);

  // ── Image type detection ────────────────────────────────────────────────
  const imageType = validateImageHeaders(buffer);

  if (!imageType) {
    warnings.push("Unrecognized image format");
    return {
      isValid: false,
      fileType: null,
      dimensions: null,
      fileSize,
      platformIndicators,
      confidence: 0,
      checks: [...checks, "Image type: unrecognized"],
      warnings,
    };
  }

  const mimeType = `image/${imageType}`;
  checks.push(`Image type: ${imageType}`);

  // Base confidence for any valid image
  confidence = 0.2;

  // ── File type scoring ───────────────────────────────────────────────────
  // PNG is the most common screenshot format; JPEG is typical for photos
  if (imageType === "png") {
    confidence += 0.15;
    checks.push("File type bonus: PNG (typical screenshot format)");
  } else if (imageType === "jpeg") {
    confidence += 0.08;
    checks.push("File type: JPEG (common for photo proofs)");
  } else if (imageType === "webp") {
    confidence += 0.10;
    checks.push("File type: WEBP");
  }

  // ── Dimension extraction and scoring ────────────────────────────────────
  const dimensions = extractDimensions(buffer, imageType);

  if (dimensions) {
    checks.push(`Dimensions: ${dimensions.width}x${dimensions.height}`);

    const isMobile = isMobileDimensions(dimensions.width, dimensions.height);
    const isDesktop = isDesktopDimensions(dimensions.width, dimensions.height);

    if (isMobile || isDesktop) {
      confidence += 0.15;
      checks.push(`Dimensions: ${isMobile ? "mobile" : "desktop"} screen size`);
    } else {
      checks.push("Dimensions: non-standard size");
    }

    // File size vs dimensions ratio check
    const totalPixels = dimensions.width * dimensions.height;
    const bpp = fileSize / totalPixels;
    if (bpp < FILE_SIZE_LIMITS.minBpp || bpp > FILE_SIZE_LIMITS.maxBpp) {
      warnings.push(`Unusual bytes-per-pixel ratio: ${bpp.toFixed(2)}`);
    }
  } else {
    checks.push("Dimensions: could not parse");
  }

  // ── EXIF metadata extraction and scoring ────────────────────────────────
  const exif = extractImageMetadata(buffer);

  if (exif) {
    checks.push("EXIF: present");

    // Date check — screenshots taken recently get a boost
    if (exif.dateTime) {
      const isRecent = isRecentDate(exif.dateTime);
      if (isRecent) {
        confidence += 0.15;
        checks.push(`EXIF date: recent (${exif.dateTime})`);
      } else {
        checks.push(`EXIF date: old (${exif.dateTime})`);
      }
    }

    // Device info — mobile devices indicate a real screenshot
    if (exif.make || exif.model) {
      const deviceInfo = [exif.make, exif.model].filter(Boolean).join(" ");
      const isMobileDevice = /iphone|ipad|samsung|pixel|oneplus|xiaomi|huawei|oppo|vivo|android/i.test(deviceInfo);
      if (isMobileDevice) {
        confidence += 0.15;
        checks.push(`EXIF device: mobile (${deviceInfo})`);
      } else {
        checks.push(`EXIF device: ${deviceInfo}`);
      }
    }

    if (exif.software) {
      checks.push(`EXIF software: ${exif.software}`);
    }
  } else {
    checks.push("EXIF: not present or not parseable");
  }

  // ── Filename analysis ──────────────────────────────────────────────────
  if (filename) {
    const filenameIndicators = detectPlatformFromFilename(filename);
    platformIndicators.push(...filenameIndicators);

    const isScreenshotFilename = SCREENSHOT_FILENAME_PATTERNS.some((p) => p.test(filename));
    const hasPlatformHint = filenameIndicators.length > 0;

    if (isScreenshotFilename || hasPlatformHint) {
      confidence += 0.1;
      checks.push(
        `Filename hints: ${isScreenshotFilename ? "screenshot pattern" : ""}${
          hasPlatformHint ? ` platform: ${filenameIndicators.map((i) => i.platform).join(", ")}` : ""
        }`
      );
    }
  }

  // ── Manipulation detection ─────────────────────────────────────────────
  const manipulation = detectManipulation(buffer);
  if (manipulation.suspicious) {
    confidence -= 0.2;
    warnings.push(...manipulation.warnings);
    checks.push("Manipulation check: suspicious");
  } else {
    checks.push("Manipulation check: passed");
  }

  // Clamp confidence
  confidence = Math.round(Math.max(0, Math.min(1, confidence)) * 100) / 100;

  return {
    isValid: true,
    fileType: mimeType,
    dimensions,
    fileSize,
    platformIndicators,
    confidence,
    checks,
    warnings,
  };
}

// ─── Detection Functions ────────────────────────────────────────────────────

/**
 * Detect platform hints from a filename.
 */
export function detectPlatformFromFilename(filename: string): PlatformIndicator[] {
  const indicators: PlatformIndicator[] = [];

  for (const [platform, patterns] of Object.entries(PLATFORM_FILENAME_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(filename)) {
        indicators.push({
          platform,
          indicator: `Filename matches pattern: ${pattern.source}`,
          confidence: 0.3,
        });
        break; // One match per platform is enough
      }
    }
  }

  return indicators;
}

/**
 * Validate image headers by checking magic bytes.
 * Returns the detected image type or null if invalid.
 */
export function validateImageHeaders(buffer: Buffer): ImageType {
  return getImageType(buffer);
}

/**
 * Extract EXIF metadata from a JPEG image.
 * Returns null for non-JPEG or images without EXIF data.
 */
export function extractImageMetadata(buffer: Buffer): ExifData | null {
  const imageType = getImageType(buffer);
  if (imageType !== "jpeg") return null;
  return getJpegExif(buffer);
}

/**
 * Run basic manipulation detection on the image buffer.
 */
export function detectManipulation(buffer: Buffer): {
  suspicious: boolean;
  warnings: string[];
  details: Record<string, unknown>;
} {
  const warnings: string[] = [];
  const details: Record<string, unknown> = {};
  let suspicious = false;

  const imageType = getImageType(buffer);
  if (!imageType) {
    return { suspicious: false, warnings: ["Cannot analyze: unknown format"], details };
  }

  // Check for multiple headers (image concatenation)
  if (imageType === "jpeg") {
    const headers = detectMultipleHeaders(buffer);
    details.jfifCount = headers.jfifCount;
    details.exifCount = headers.exifCount;

    if (headers.suspicious) {
      suspicious = true;
      warnings.push(
        `Multiple image headers detected (JFIF: ${headers.jfifCount}, EXIF: ${headers.exifCount}) — possible concatenation`
      );
    }
  }

  // Check for uniform color blocks
  const uniformity = detectUniformBlocks(buffer);
  details.uniformityScore = uniformity.score;

  if (uniformity.suspicious) {
    suspicious = true;
    warnings.push(`High uniformity in image data — possible content cover-up (score: ${uniformity.score})`);
  }

  // File size vs dimensions sanity check
  const dimensions = extractDimensions(buffer, imageType);
  if (dimensions) {
    const totalPixels = dimensions.width * dimensions.height;
    const bpp = buffer.length / totalPixels;
    details.bytesPerPixel = Math.round(bpp * 100) / 100;

    // Very low BPP for PNG suggests the image is mostly solid color
    if (imageType === "png" && bpp < 0.05) {
      suspicious = true;
      warnings.push(`Extremely low bytes-per-pixel for PNG (${bpp.toFixed(3)}) — may be mostly solid color`);
    }
  }

  return { suspicious, warnings, details };
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

function extractDimensions(
  buffer: Buffer,
  imageType: ImageType
): { width: number; height: number } | null {
  switch (imageType) {
    case "png":
      return getPngDimensions(buffer);
    case "jpeg":
      return getJpegDimensions(buffer);
    case "webp":
      return getWebpDimensions(buffer);
    default:
      return null;
  }
}

/**
 * Parse WEBP dimensions from the VP8/VP8L/VP8X chunk.
 */
function getWebpDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 30) return null;

  // VP8 (lossy): signature at offset 12, dimensions at 26-29
  if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x20) {
    if (buffer.length < 30) return null;
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    if (width > 0 && height > 0) return { width, height };
  }

  // VP8L (lossless): signature at offset 12 "VP8L"
  if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x4c) {
    if (buffer.length < 25) return null;
    // Dimensions encoded in bits 21-24
    const bits = buffer.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    if (width > 0 && height > 0 && width <= 16383 && height <= 16383) return { width, height };
  }

  // VP8X (extended): dimensions at offsets 24-29
  if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x58) {
    if (buffer.length < 30) return null;
    const width = (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)) + 1;
    const height = (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)) + 1;
    if (width > 0 && height > 0 && width <= 16383 && height <= 16383) return { width, height };
  }

  return null;
}

function isMobileDimensions(width: number, height: number): boolean {
  // Check both portrait and landscape
  const isPortrait =
    width >= MOBILE_DIMENSIONS.minWidth &&
    width <= MOBILE_DIMENSIONS.maxWidth &&
    height >= MOBILE_DIMENSIONS.minHeight &&
    height <= MOBILE_DIMENSIONS.maxHeight;

  const isLandscape =
    height >= MOBILE_DIMENSIONS.minWidth &&
    height <= MOBILE_DIMENSIONS.maxWidth &&
    width >= MOBILE_DIMENSIONS.minHeight &&
    width <= MOBILE_DIMENSIONS.maxHeight;

  return isPortrait || isLandscape;
}

function isDesktopDimensions(width: number, height: number): boolean {
  return (
    width >= DESKTOP_DIMENSIONS.minWidth &&
    width <= DESKTOP_DIMENSIONS.maxWidth &&
    height >= DESKTOP_DIMENSIONS.minHeight &&
    height <= DESKTOP_DIMENSIONS.maxHeight
  );
}

/**
 * Check if an EXIF date string is within the last 7 days.
 * EXIF dates are typically formatted as "YYYY:MM:DD HH:MM:SS".
 */
function isRecentDate(dateStr: string): boolean {
  // Parse "YYYY:MM:DD HH:MM:SS" or standard ISO format
  const normalized = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return false;

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - date.getTime() < sevenDaysMs;
}

function emptyAnalysis(
  fileSize: number,
  reason: string,
  checks: string[],
  warnings: string[]
): ScreenshotAnalysis {
  return {
    isValid: false,
    fileType: null,
    dimensions: null,
    fileSize,
    platformIndicators: [],
    confidence: 0,
    checks: [...checks, `Failed: ${reason}`],
    warnings,
  };
}
