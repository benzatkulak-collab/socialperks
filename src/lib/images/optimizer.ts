// ==============================================================================
// Social Perks -- Image Optimization Pipeline
//
// Handles proof screenshots that influencers upload when submitting campaign
// actions. Uses Sharp when available for real optimization; falls back to
// pass-through when Sharp is not installed (e.g. in edge/serverless runtimes).
// ==============================================================================

import { logger } from "@/lib/logging";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ImageFormat = "webp" | "jpeg" | "png";

export interface OptimizeOptions {
  /** Maximum output width in pixels. Default: 1920 */
  maxWidth?: number;
  /** Maximum output height in pixels. Default: 1080 */
  maxHeight?: number;
  /** Compression quality 1-100. Default: 80 */
  quality?: number;
  /** Output format. Default: "webp" */
  format?: ImageFormat;
}

export interface OptimizedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: ImageFormat;
  originalSize: number;
  optimizedSize: number;
  /** Savings as a percentage (0-100) */
  savings: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
  /** EXIF orientation value if present */
  orientation?: number;
  /** Color space (e.g. "srgb") */
  space?: string;
}

// ─── Sharp Detection ────────────────────────────────────────────────────────

// Minimal type for the Sharp callable: covers the pipeline methods we use.
interface SharpInstance {
  rotate(): SharpInstance;
  resize(w: number, h: number, opts?: Record<string, unknown>): SharpInstance;
  webp(opts?: Record<string, unknown>): SharpInstance;
  jpeg(opts?: Record<string, unknown>): SharpInstance;
  png(opts?: Record<string, unknown>): SharpInstance;
  toBuffer(): Promise<Buffer>;
  metadata(): Promise<{
    width?: number;
    height?: number;
    format?: string;
    hasAlpha?: boolean;
    orientation?: number;
    space?: string;
  }>;
}

type SharpFn = (input: Buffer) => SharpInstance;

let sharpFn: SharpFn | null = null;
let sharpChecked = false;

function getSharp(): SharpFn | null {
  if (sharpChecked) return sharpFn;
  sharpChecked = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sharpFn = require("sharp") as SharpFn;
    logger.info("Image optimizer: Sharp loaded successfully");
  } catch {
    logger.warn(
      "Image optimizer: Sharp not available — using pass-through mode. " +
        "Install sharp for real image optimization: npm install sharp"
    );
    sharpFn = null;
  }
  return sharpFn;
}

// ─── Pass-Through Fallback ──────────────────────────────────────────────────

/**
 * Minimal image header parsing for when Sharp is unavailable.
 * Detects PNG, JPEG, and WebP dimensions from raw bytes.
 */
function parseImageHeader(buffer: Buffer): {
  width: number;
  height: number;
  format: string;
} {
  // PNG: bytes 16-23 contain width (4 bytes BE) and height (4 bytes BE)
  if (
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
      format: "png",
    };
  }

  // JPEG: scan for SOF0 (0xFFC0) or SOF2 (0xFFC2) markers
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      // SOF0 or SOF2
      if (marker === 0xc0 || marker === 0xc2) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
          format: "jpeg",
        };
      }
      // Skip this marker segment
      const segLen = buffer.readUInt16BE(offset + 2);
      offset += 2 + segLen;
    }
    return { width: 0, height: 0, format: "jpeg" };
  }

  // WebP: RIFF header, bytes 24-29 contain width (LE 16) and height (LE 16)
  // for VP8 lossy; VP8L and VP8X have different layouts
  if (
    buffer.length >= 30 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8 " && buffer.length >= 30) {
      // VP8 lossy: width at 26, height at 28 (little-endian 16-bit)
      return {
        width: buffer.readUInt16LE(26) & 0x3fff,
        height: buffer.readUInt16LE(28) & 0x3fff,
        format: "webp",
      };
    }
    return { width: 0, height: 0, format: "webp" };
  }

  return { width: 0, height: 0, format: "unknown" };
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Optimize an image buffer: resize to fit within max dimensions,
 * compress, and convert to the desired format.
 *
 * Falls back to pass-through (returning the original buffer with
 * parsed metadata) when Sharp is not installed.
 */
export async function optimizeImage(
  buffer: Buffer,
  options: OptimizeOptions = {}
): Promise<OptimizedImage> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 80,
    format = "webp",
  } = options;

  const originalSize = buffer.length;
  const sharpLib = getSharp();

  // ── Sharp path ──────────────────────────────────────────────────────────
  if (sharpLib) {
    const pipeline = sharpLib(buffer)
      .rotate() // auto-orient from EXIF
      .resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });

    // Apply format-specific compression
    switch (format) {
      case "webp":
        pipeline.webp({ quality });
        break;
      case "jpeg":
        pipeline.jpeg({ quality, progressive: true });
        break;
      case "png":
        pipeline.png({ compressionLevel: Math.round((100 - quality) / 10) });
        break;
    }

    const outputBuffer = await pipeline.toBuffer();
    const metadata = await sharpLib(outputBuffer).metadata();

    const optimizedSize = outputBuffer.length;
    const savings =
      originalSize > 0
        ? Math.round(((originalSize - optimizedSize) / originalSize) * 100)
        : 0;

    logger.debug("Image optimized with Sharp", {
      originalSize,
      optimizedSize,
      savings: `${savings}%`,
      format,
      width: metadata.width,
      height: metadata.height,
    });

    return {
      buffer: outputBuffer,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      format,
      originalSize,
      optimizedSize,
      savings: Math.max(0, savings),
    };
  }

  // ── Pass-through path ───────────────────────────────────────────────────
  const parsed = parseImageHeader(buffer);

  logger.debug("Image passed through (Sharp not available)", {
    size: originalSize,
    detectedFormat: parsed.format,
    width: parsed.width,
    height: parsed.height,
  });

  return {
    buffer,
    width: parsed.width,
    height: parsed.height,
    format: parsed.format === "unknown" ? format : (parsed.format as ImageFormat),
    originalSize,
    optimizedSize: originalSize,
    savings: 0,
  };
}

/**
 * Generate a square thumbnail from an image buffer.
 *
 * @param buffer - Source image data
 * @param size - Thumbnail side length in pixels. Default: 200
 */
export async function generateThumbnail(
  buffer: Buffer,
  size = 200
): Promise<Buffer> {
  const sharpLib = getSharp();

  if (sharpLib) {
    return sharpLib(buffer)
      .rotate()
      .resize(size, size, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: 70 })
      .toBuffer();
  }

  // Without Sharp, return the original buffer (clients should handle display sizing)
  logger.debug("Thumbnail generation skipped (Sharp not available)");
  return buffer;
}

/**
 * Extract metadata from an image buffer without decoding the full image.
 */
export async function getImageMetadata(
  buffer: Buffer
): Promise<ImageMetadata> {
  const sharpLib = getSharp();

  if (sharpLib) {
    const meta = await sharpLib(buffer).metadata();
    return {
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      format: meta.format ?? "unknown",
      size: buffer.length,
      hasAlpha: meta.hasAlpha ?? false,
      orientation: meta.orientation,
      space: meta.space,
    };
  }

  // Fallback: parse header bytes
  const parsed = parseImageHeader(buffer);
  return {
    width: parsed.width,
    height: parsed.height,
    format: parsed.format,
    size: buffer.length,
    hasAlpha: parsed.format === "png" || parsed.format === "webp",
  };
}
