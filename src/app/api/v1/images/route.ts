/**
 * Image Upload & Listing API — /api/v1/images
 *
 * POST: Upload an image (multipart/form-data), optimize it, store it,
 *       and return the URL with metadata.
 * GET:  List uploaded images for the authenticated user.
 *
 * Auth: Required for both methods.
 * Rate limit: standard (writes), relaxed (reads).
 * Max file size: 10 MB.
 * Allowed types: image/jpeg, image/png, image/webp, image/gif.
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  getQuery,
  paginate,
  withTiming,
} from "../_shared";
import { optimizeImage, generateThumbnail, getImageMetadata } from "@/lib/images/optimizer";
import { getImageStore } from "@/lib/images/storage";
import { logger } from "@/lib/logging";

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// ─── In-Memory Image Registry ───────────────────────────────────────────────
// Production: replace with database-backed storage.

interface ImageRecord {
  id: string;
  userId: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  size: number;
  originalSize: number;
  format: string;
  contentType: string;
  filename: string;
  createdAt: string;
}

const imageRegistry = new Map<string, ImageRecord>();

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Rate limit — standard for uploads
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return err("INVALID_FORM_DATA", "Request must be multipart/form-data", 400);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return err("MISSING_FILE", "A 'file' field with an image is required", 400);
  }

  // Validate content type
  if (!ALLOWED_TYPES.has(file.type)) {
    return err(
      "INVALID_FILE_TYPE",
      `Only image files are allowed. Received: ${file.type}. ` +
        `Accepted: ${[...ALLOWED_TYPES].join(", ")}`,
      400
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return err(
      "FILE_TOO_LARGE",
      `Maximum file size is 10 MB. Received: ${(file.size / 1024 / 1024).toFixed(1)} MB`,
      400
    );
  }

  // Read file into buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Extract metadata before optimization
  const metadata = await getImageMetadata(buffer);

  // Determine target format from query param or auto-detect
  const params = getQuery(req);
  const formatParam = params.get("format");
  const targetFormat =
    formatParam === "jpeg" || formatParam === "png" || formatParam === "webp"
      ? formatParam
      : "webp";

  // Optimize the image
  const optimized = await optimizeImage(buffer, {
    format: targetFormat,
    quality: 80,
    maxWidth: 1920,
    maxHeight: 1080,
  });

  // Generate thumbnail
  const thumbnailBuffer = await generateThumbnail(buffer, 200);

  // Generate storage keys
  const timestamp = Date.now();
  const imageId = crypto.randomUUID();
  const sanitizedName = (file.name || "upload")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);
  const ext = targetFormat === "webp" ? "webp" : targetFormat === "png" ? "png" : "jpg";

  const imageKey = `images/${user.id}/${timestamp}-${imageId}.${ext}`;
  const thumbKey = `images/${user.id}/thumbs/${timestamp}-${imageId}.webp`;

  // Store both files
  const store = getImageStore();
  const [imageUrl, thumbnailUrl] = await Promise.all([
    store.upload(imageKey, optimized.buffer, `image/${ext === "jpg" ? "jpeg" : ext}`),
    store.upload(thumbKey, thumbnailBuffer, "image/webp"),
  ]);

  // Register in memory (production: persist to DB)
  const record: ImageRecord = {
    id: imageId,
    userId: user.id,
    url: imageUrl,
    thumbnailUrl,
    width: optimized.width,
    height: optimized.height,
    size: optimized.optimizedSize,
    originalSize: optimized.originalSize,
    format: optimized.format,
    contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
    filename: sanitizedName,
    createdAt: new Date().toISOString(),
  };
  imageRegistry.set(imageId, record);

  logger.info("Image uploaded", {
    imageId,
    userId: user.id,
    originalSize: optimized.originalSize,
    optimizedSize: optimized.optimizedSize,
    savings: `${optimized.savings}%`,
    format: optimized.format,
    dimensions: `${optimized.width}x${optimized.height}`,
    originalDimensions: `${metadata.width}x${metadata.height}`,
  });

  return ok(
    {
      id: imageId,
      url: imageUrl,
      thumbnail: thumbnailUrl,
      width: optimized.width,
      height: optimized.height,
      size: optimized.optimizedSize,
      originalSize: optimized.originalSize,
      savings: optimized.savings,
      format: optimized.format,
    },
    201
  );
});

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Rate limit — relaxed for reads
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const params = getQuery(req);
  const { page, perPage } = paginate(params);

  // Collect images for this user
  const userImages: ImageRecord[] = [];
  for (const record of imageRegistry.values()) {
    if (record.userId === user.id) {
      userImages.push(record);
    }
  }

  // Sort newest first
  userImages.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Paginate
  const total = userImages.length;
  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const images = userImages.slice(start, start + perPage).map((r) => ({
    id: r.id,
    url: r.url,
    thumbnail: r.thumbnailUrl,
    width: r.width,
    height: r.height,
    size: r.size,
    format: r.format,
    filename: r.filename,
    createdAt: r.createdAt,
  }));

  return ok({
    images,
    total,
    page,
    perPage,
    totalPages,
  });
});
