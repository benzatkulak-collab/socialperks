/**
 * Low-Level Image Parsing Utilities
 *
 * Pure TypeScript image header parsing — no external libraries required.
 * Supports PNG, JPEG, and WEBP format detection, dimension extraction,
 * basic EXIF parsing, and manipulation detection through pixel sampling.
 */

// ─── Magic Bytes ────────────────────────────────────────────────────────────

/** PNG: 89 50 4E 47 0D 0A 1A 0A */
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** JPEG: FF D8 FF */
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

/** WEBP: RIFF....WEBP */
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WEBP_SIG = [0x57, 0x45, 0x42, 0x50]; // "WEBP"

export type ImageType = "png" | "jpeg" | "webp" | null;

/**
 * Detect image type from magic bytes at the start of a buffer.
 */
export function getImageType(buffer: Buffer): ImageType {
  if (buffer.length < 12) return null;

  // PNG check
  if (matchesBytes(buffer, PNG_MAGIC, 0)) return "png";

  // JPEG check
  if (matchesBytes(buffer, JPEG_MAGIC, 0)) return "jpeg";

  // WEBP check: RIFF at offset 0, WEBP at offset 8
  if (matchesBytes(buffer, WEBP_RIFF, 0) && matchesBytes(buffer, WEBP_SIG, 8)) return "webp";

  return null;
}

// ─── PNG Dimensions ─────────────────────────────────────────────────────────

/**
 * Parse width and height from a PNG IHDR chunk.
 * IHDR starts at byte 16 (after 8-byte signature + 4-byte length + 4-byte "IHDR").
 * Width is at offset 16, height at offset 20 (both 4-byte big-endian).
 */
export function getPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;
  if (!matchesBytes(buffer, PNG_MAGIC, 0)) return null;

  // Verify IHDR chunk type at offset 12
  const ihdr = [0x49, 0x48, 0x44, 0x52]; // "IHDR"
  if (!matchesBytes(buffer, ihdr, 12)) return null;

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  // Sanity check — reject implausibly large dimensions
  if (width === 0 || height === 0 || width > 65535 || height > 65535) return null;

  return { width, height };
}

// ─── JPEG Dimensions ────────────────────────────────────────────────────────

/**
 * Parse width and height from JPEG SOF0 (0xFFC0) or SOF2 (0xFFC2) markers.
 * Scans through the JPEG looking for these markers, then reads:
 *   - 2 bytes: marker length
 *   - 1 byte: precision
 *   - 2 bytes: height (big-endian)
 *   - 2 bytes: width (big-endian)
 */
export function getJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 4) return null;
  if (!matchesBytes(buffer, JPEG_MAGIC, 0)) return null;

  let offset = 2; // Skip SOI marker (FF D8)

  while (offset < buffer.length - 1) {
    // Every marker starts with FF
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = buffer[offset + 1];

    // Skip padding bytes (FF FF FF...)
    if (marker === 0xff) {
      offset++;
      continue;
    }

    // SOF0 (baseline), SOF1 (extended), SOF2 (progressive)
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      // Need at least 7 more bytes after marker: length(2) + precision(1) + height(2) + width(2)
      if (offset + 9 > buffer.length) return null;

      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);

      if (width === 0 || height === 0 || width > 65535 || height > 65535) return null;

      return { width, height };
    }

    // Skip other markers — read their length and advance
    if (offset + 3 >= buffer.length) return null;
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2) return null;
    offset += 2 + segmentLength;
  }

  return null;
}

// ─── JPEG EXIF Parsing ──────────────────────────────────────────────────────

export interface ExifData {
  dateTime: string | null;
  make: string | null;
  model: string | null;
  software: string | null;
}

/** EXIF tag IDs */
const EXIF_TAGS: Record<number, keyof ExifData> = {
  0x010f: "make",
  0x0110: "model",
  0x0131: "software",
  0x0132: "dateTime",
};

/**
 * Extract basic EXIF fields from a JPEG buffer.
 * Looks for the APP1 marker (FF E1) containing "Exif\0\0", then parses
 * the TIFF header and IFD0 entries for DateTime, Make, Model, Software.
 */
export function getJpegExif(buffer: Buffer): ExifData | null {
  if (buffer.length < 12) return null;
  if (!matchesBytes(buffer, JPEG_MAGIC, 0)) return null;

  // Find APP1 marker (FF E1)
  let offset = 2;
  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = buffer[offset + 1];

    if (marker === 0xff) {
      offset++;
      continue;
    }

    if (marker === 0xe1) {
      // Found APP1
      return parseApp1Segment(buffer, offset);
    }

    // Skip SOS marker — image data follows, no more headers to find
    if (marker === 0xda) break;

    // Skip other markers
    if (offset + 3 >= buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2) break;
    offset += 2 + segmentLength;
  }

  return null;
}

function parseApp1Segment(buffer: Buffer, markerOffset: number): ExifData | null {
  if (markerOffset + 10 > buffer.length) return null;

  const segmentLength = buffer.readUInt16BE(markerOffset + 2);
  const segmentEnd = markerOffset + 2 + segmentLength;
  if (segmentEnd > buffer.length) return null;

  // Check for "Exif\0\0" signature
  const exifSig = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
  if (!matchesBytes(buffer, exifSig, markerOffset + 4)) return null;

  // TIFF header starts after "Exif\0\0"
  const tiffStart = markerOffset + 10;
  if (tiffStart + 8 > buffer.length) return null;

  // Byte order: II (little-endian) or MM (big-endian)
  const byteOrder = buffer[tiffStart] === 0x49 ? "LE" : "BE";

  const readU16 = byteOrder === "LE"
    ? (off: number) => buffer.readUInt16LE(off)
    : (off: number) => buffer.readUInt16BE(off);

  const readU32 = byteOrder === "LE"
    ? (off: number) => buffer.readUInt32LE(off)
    : (off: number) => buffer.readUInt32BE(off);

  // Verify TIFF magic number (42)
  if (readU16(tiffStart + 2) !== 42) return null;

  // IFD0 offset (relative to TIFF start)
  const ifd0Offset = readU32(tiffStart + 4);
  const ifd0Abs = tiffStart + ifd0Offset;
  if (ifd0Abs + 2 > segmentEnd) return null;

  const entryCount = readU16(ifd0Abs);
  if (entryCount > 200) return null; // Sanity check

  const result: ExifData = {
    dateTime: null,
    make: null,
    model: null,
    software: null,
  };

  for (let i = 0; i < entryCount; i++) {
    const entryOffset = ifd0Abs + 2 + i * 12;
    if (entryOffset + 12 > segmentEnd) break;

    const tag = readU16(entryOffset);
    const fieldKey = EXIF_TAGS[tag];
    if (!fieldKey) continue;

    const type = readU16(entryOffset + 2);
    const count = readU32(entryOffset + 4);

    // ASCII string type = 2
    if (type !== 2) continue;

    let strOffset: number;
    if (count <= 4) {
      // Value is stored inline in the value/offset field
      strOffset = entryOffset + 8;
    } else {
      // Value is at the offset stored in the value field
      strOffset = tiffStart + readU32(entryOffset + 8);
    }

    if (strOffset + count > segmentEnd) continue;

    // Read the ASCII string (trim null terminator)
    const str = buffer.subarray(strOffset, strOffset + count).toString("ascii").replace(/\0+$/, "").trim();
    if (str.length > 0) {
      result[fieldKey] = str;
    }
  }

  return result;
}

// ─── Uniform Block Detection ────────────────────────────────────────────────

/**
 * Detect large uniform color blocks in raw image data.
 * Works on uncompressed bitmap data. For compressed images (PNG/JPEG),
 * this performs a basic entropy analysis on the raw compressed bytes instead.
 *
 * Returns a score from 0 (no uniformity) to 1 (entirely uniform).
 * A threshold of ~0.4+ suggests potential manipulation (content covered up).
 */
export function detectUniformBlocks(buffer: Buffer, threshold: number = 0.4): {
  score: number;
  suspicious: boolean;
  details: string;
} {
  if (buffer.length < 100) {
    return { score: 0, suspicious: false, details: "Buffer too small for analysis" };
  }

  // Skip headers — sample the payload portion of the file
  const headerSize = Math.min(100, Math.floor(buffer.length * 0.05));
  const payload = buffer.subarray(headerSize);

  if (payload.length < 50) {
    return { score: 0, suspicious: false, details: "Payload too small for analysis" };
  }

  // Sample bytes at regular intervals and count repeated byte runs
  const sampleSize = Math.min(2000, payload.length);
  const step = Math.max(1, Math.floor(payload.length / sampleSize));

  let repeatCount = 0;
  let totalSamples = 0;
  let prevByte = -1;
  let currentRunLength = 0;
  let maxRunLength = 0;

  for (let i = 0; i < payload.length && totalSamples < sampleSize; i += step) {
    totalSamples++;
    const byte = payload[i];

    if (byte === prevByte) {
      currentRunLength++;
      repeatCount++;
      if (currentRunLength > maxRunLength) {
        maxRunLength = currentRunLength;
      }
    } else {
      currentRunLength = 1;
    }
    prevByte = byte;
  }

  if (totalSamples === 0) {
    return { score: 0, suspicious: false, details: "No samples collected" };
  }

  const repeatRatio = repeatCount / totalSamples;
  const runRatio = maxRunLength / totalSamples;

  // Weight both the overall repeat ratio and longest run
  const score = Math.min(1, repeatRatio * 0.6 + runRatio * 0.4);
  const suspicious = score >= threshold;

  return {
    score: Math.round(score * 100) / 100,
    suspicious,
    details: suspicious
      ? `High uniformity detected (score: ${score.toFixed(2)}, max run: ${maxRunLength}/${totalSamples} samples)`
      : `Normal image entropy (score: ${score.toFixed(2)})`,
  };
}

// ─── Multiple Header Detection ──────────────────────────────────────────────

/**
 * Check for multiple JFIF or EXIF headers in a JPEG, which can indicate
 * image concatenation or injection attacks.
 */
export function detectMultipleHeaders(buffer: Buffer): {
  jfifCount: number;
  exifCount: number;
  suspicious: boolean;
} {
  let jfifCount = 0;
  let exifCount = 0;

  // JFIF signature: "JFIF\0" (4A 46 49 46 00)
  const jfif = [0x4a, 0x46, 0x49, 0x46, 0x00];
  // Exif signature: "Exif\0\0" (45 78 69 66 00 00)
  const exif = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];

  for (let i = 0; i < buffer.length - 6; i++) {
    if (matchesBytes(buffer, jfif, i)) jfifCount++;
    if (matchesBytes(buffer, exif, i)) exifCount++;
  }

  return {
    jfifCount,
    exifCount,
    suspicious: jfifCount > 1 || exifCount > 1,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function matchesBytes(buffer: Buffer, bytes: number[], offset: number): boolean {
  if (offset + bytes.length > buffer.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[offset + i] !== bytes[i]) return false;
  }
  return true;
}
