// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Content Delivery & Media Processing Pipeline
//
// Upload management, media processing (thumbnails, watermarks, moderation),
// perceptual hashing for duplicate detection, and CDN management.
// In-memory stores now, ready for S3/CloudFront/CloudFlare migration.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Upload Types ─────────────────────────────────────────────────────────────

export interface UploadConfig {
  maxFileSizeMb: number;
  allowedMimeTypes: string[];
  storageProvider: "s3" | "gcs" | "local";
  bucketName: string;
  cdnBaseUrl: string;
}

export interface UploadResult {
  fileId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  cdnUrl: string;
  uploadedAt: string;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  fileId: string;
  expiresAt: string;
  fields: Record<string, string>;
}

export interface FileRecord {
  fileId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  cdnUrl: string;
  uploadedAt: string;
  confirmedAt: string | null;
  deletedAt: string | null;
  userId: string;
  metadata: Record<string, string | number | boolean>;
  malwareScanStatus: "pending" | "clean" | "suspicious" | "skipped";
}

// ─── Processing Types ─────────────────────────────────────────────────────────

export type ProcessingOperation =
  | { type: "thumbnail"; width: number; height: number }
  | {
      type: "resize";
      maxWidth: number;
      maxHeight: number;
      quality: number;
    }
  | {
      type: "watermark";
      text: string;
      position: "top-left" | "bottom-right" | "center";
    }
  | { type: "metadata_extract" }
  | { type: "content_moderation" }
  | { type: "perceptual_hash" };

export type ProcessingStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface ProcessedOutput {
  operationType: string;
  storageKey: string;
  cdnUrl: string;
  metadata: Record<string, string | number | boolean>;
}

export interface ProcessingJob {
  id: string;
  fileId: string;
  operations: ProcessingOperation[];
  status: ProcessingStatus;
  outputs: ProcessedOutput[];
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  progress: number;
}

export interface MediaMetadata {
  width: number | null;
  height: number | null;
  format: string | null;
  colorSpace: string | null;
  durationSeconds: number | null;
  fps: number | null;
  bitrate: number | null;
  exif: Record<string, string | number | boolean>;
  fileSize: number;
  createdAt: string | null;
}

export interface ModerationResult {
  fileId: string;
  safe: boolean;
  score: number;
  categories: ModerationCategory[];
  reviewRequired: boolean;
  timestamp: string;
}

export interface ModerationCategory {
  name: string;
  confidence: number;
  flagged: boolean;
}

// ─── CDN Types ────────────────────────────────────────────────────────────────

export interface CDNTransform {
  width?: number;
  height?: number;
  format?: "webp" | "avif" | "jpeg" | "png";
  quality?: number;
  fit?: "cover" | "contain" | "fill" | "inside";
}

export interface CDNStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  bandwidthBytes: number;
  popularAssets: { storageKey: string; requests: number }[];
  invalidations: number;
}

export interface CDNCacheEntry {
  storageKey: string;
  transforms: string;
  url: string;
  cachedAt: number;
  lastAccessedAt: number;
  accessCount: number;
  sizeBytes: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 255);
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "application/pdf": "pdf",
  };
  return map[mimeType] ?? "bin";
}

// ══════════════════════════════════════════════════════════════════════════════
// UploadService — Presigned URL Generation & Upload Management
// ══════════════════════════════════════════════════════════════════════════════

export class UploadService {
  private files: Map<string, FileRecord> = new Map();
  private pendingUploads: Map<string, { expiresAt: number; userId: string }> =
    new Map();
  private readonly config: UploadConfig;

  constructor(config?: Partial<UploadConfig>) {
    this.config = {
      maxFileSizeMb: config?.maxFileSizeMb ?? 50,
      allowedMimeTypes: config?.allowedMimeTypes ?? [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/avif",
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "application/pdf",
      ],
      storageProvider: config?.storageProvider ?? "s3",
      bucketName: config?.bucketName ?? "social-perks-media",
      cdnBaseUrl: config?.cdnBaseUrl ?? "https://cdn.socialperks.app",
    };
  }

  /** Generate a presigned URL for client-side direct upload. */
  generatePresignedUrl(
    fileName: string,
    mimeType: string,
    userId: string
  ): PresignedUrlResult {
    // Validate mime type
    if (!this.config.allowedMimeTypes.includes(mimeType)) {
      throw new UploadError(
        `Unsupported file type: ${mimeType}. Allowed: ${this.config.allowedMimeTypes.join(", ")}`,
        "INVALID_MIME_TYPE"
      );
    }

    const fileId = generateId("file");
    const ext = getExtension(mimeType);
    const sanitized = sanitizeFileName(fileName);
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
    const storageKey = `uploads/${datePrefix}/${userId}/${fileId}.${ext}`;

    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    // Store pending upload
    this.pendingUploads.set(fileId, { expiresAt, userId });

    // Create the file record in pending state
    const record: FileRecord = {
      fileId,
      originalName: sanitized,
      mimeType,
      sizeBytes: 0, // Updated on confirmation
      storageKey,
      cdnUrl: `${this.config.cdnBaseUrl}/${storageKey}`,
      uploadedAt: new Date().toISOString(),
      confirmedAt: null,
      deletedAt: null,
      userId,
      metadata: {},
      malwareScanStatus: "pending",
    };
    this.files.set(fileId, record);

    // Build presigned URL and form fields
    const uploadUrl = this.buildPresignedUrl(storageKey, mimeType);
    const fields = this.buildFormFields(storageKey, mimeType, fileId);

    return {
      uploadUrl,
      fileId,
      expiresAt: new Date(expiresAt).toISOString(),
      fields,
    };
  }

  /** Confirm that a file was uploaded successfully. Computes metadata. */
  confirmUpload(fileId: string, sizeBytes?: number): UploadResult {
    const pending = this.pendingUploads.get(fileId);
    if (!pending) {
      throw new UploadError(
        `No pending upload found for file: ${fileId}`,
        "UPLOAD_NOT_FOUND"
      );
    }

    if (Date.now() > pending.expiresAt) {
      this.pendingUploads.delete(fileId);
      this.files.delete(fileId);
      throw new UploadError(
        `Upload URL expired for file: ${fileId}`,
        "UPLOAD_EXPIRED"
      );
    }

    const record = this.files.get(fileId);
    if (!record) {
      throw new UploadError(
        `File record not found: ${fileId}`,
        "FILE_NOT_FOUND"
      );
    }

    // Validate file size
    const fileSizeBytes = sizeBytes ?? 0;
    const maxBytes = this.config.maxFileSizeMb * 1024 * 1024;
    if (fileSizeBytes > maxBytes) {
      throw new UploadError(
        `File too large: ${(fileSizeBytes / (1024 * 1024)).toFixed(1)}MB exceeds max ${this.config.maxFileSizeMb}MB`,
        "FILE_TOO_LARGE"
      );
    }

    // Update record
    record.sizeBytes = fileSizeBytes;
    record.confirmedAt = new Date().toISOString();
    record.malwareScanStatus = this.runMalwareScanStub(record);

    this.pendingUploads.delete(fileId);

    return {
      fileId: record.fileId,
      originalName: record.originalName,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      storageKey: record.storageKey,
      cdnUrl: record.cdnUrl,
      uploadedAt: record.uploadedAt,
    };
  }

  /** Get file metadata and CDN URL. */
  getFile(fileId: string): FileRecord | null {
    const record = this.files.get(fileId);
    if (!record || record.deletedAt !== null) return null;
    return record;
  }

  /** Soft delete a file. */
  deleteFile(fileId: string): boolean {
    const record = this.files.get(fileId);
    if (!record || record.deletedAt !== null) return false;
    record.deletedAt = new Date().toISOString();
    return true;
  }

  /** List files for a user. */
  listFiles(userId: string, options?: { includeDeleted?: boolean }): FileRecord[] {
    const results: FileRecord[] = [];
    Array.from(this.files.values()).forEach((record) => {
      if (record.userId === userId) {
        if (options?.includeDeleted || record.deletedAt === null) {
          results.push(record);
        }
      }
    });
    return results.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  /** Clean up expired pending uploads. */
  cleanupExpired(): number {
    let cleaned = 0;
    const now = Date.now();
    Array.from(this.pendingUploads.entries()).forEach(([fileId, pending]) => {
      if (now > pending.expiresAt) {
        this.pendingUploads.delete(fileId);
        const record = this.files.get(fileId);
        if (record && record.confirmedAt === null) {
          this.files.delete(fileId);
          cleaned++;
        }
      }
    });
    return cleaned;
  }

  /** Build a presigned URL (stub — in production, calls S3/GCS SDK). */
  private buildPresignedUrl(storageKey: string, _mimeType: string): string {
    const provider = this.config.storageProvider;
    switch (provider) {
      case "s3":
        return `https://${this.config.bucketName}.s3.amazonaws.com/${storageKey}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=900`;
      case "gcs":
        return `https://storage.googleapis.com/${this.config.bucketName}/${storageKey}?X-Goog-Expires=900`;
      case "local":
        return `http://localhost:3000/api/v1/uploads/${storageKey}`;
      default:
        return `https://${this.config.bucketName}.s3.amazonaws.com/${storageKey}`;
    }
  }

  /** Build form fields for multipart upload (S3-style). */
  private buildFormFields(
    storageKey: string,
    mimeType: string,
    fileId: string
  ): Record<string, string> {
    return {
      key: storageKey,
      "Content-Type": mimeType,
      "x-amz-meta-file-id": fileId,
      "x-amz-server-side-encryption": "AES256",
      policy: `base64-encoded-policy-${fileId}`,
      "x-amz-signature": `signature-${fileId}`,
      "x-amz-credential": `credential-placeholder`,
      "x-amz-date": new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
    };
  }

  /** Malware scan stub — returns clean/suspicious based on heuristics. */
  private runMalwareScanStub(
    record: FileRecord
  ): "clean" | "suspicious" | "skipped" {
    // In production, this would call ClamAV or a cloud scanning service
    const suspiciousMimeTypes = ["application/pdf"];
    const suspiciousExtensions = [".exe", ".bat", ".cmd", ".scr", ".js"];

    const name = record.originalName.toLowerCase();
    const hasSuspiciousExt = suspiciousExtensions.some((ext) =>
      name.endsWith(ext)
    );
    const hasSuspiciousMime = suspiciousMimeTypes.includes(record.mimeType);

    if (hasSuspiciousExt) return "suspicious";
    if (hasSuspiciousMime && record.sizeBytes > 10 * 1024 * 1024)
      return "suspicious";

    return "clean";
  }
}

// ─── Upload Error ─────────────────────────────────────────────────────────────

export class UploadError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "UploadError";
    this.code = code;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MediaProcessor — Image/Video Processing Pipeline
// ══════════════════════════════════════════════════════════════════════════════

export class MediaProcessor {
  private jobs: Map<string, ProcessingJob> = new Map();
  private readonly uploadService: UploadService;
  private readonly perceptualHasher: PerceptualHasher;

  constructor(uploadService: UploadService, perceptualHasher?: PerceptualHasher) {
    this.uploadService = uploadService;
    this.perceptualHasher = perceptualHasher ?? new PerceptualHasher();
  }

  /** Queue a processing job with one or more operations. */
  process(fileId: string, operations: ProcessingOperation[]): ProcessingJob {
    const file = this.uploadService.getFile(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    const jobId = generateId("job");
    const job: ProcessingJob = {
      id: jobId,
      fileId,
      operations: [...operations],
      status: "queued",
      outputs: [],
      startedAt: null,
      completedAt: null,
      error: null,
      progress: 0,
    };

    this.jobs.set(jobId, job);

    // Simulate async processing (in production, this would go through a queue)
    this.executeJob(job, file);

    return job;
  }

  /** Check the status of a processing job. */
  getJobStatus(jobId: string): ProcessingJob | null {
    return this.jobs.get(jobId) ?? null;
  }

  /** Extract metadata from a file (EXIF, dimensions, duration, etc.). */
  extractMetadata(fileId: string): MediaMetadata {
    const file = this.uploadService.getFile(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Simulate metadata extraction based on mime type
    const isImage = file.mimeType.startsWith("image/");
    const isVideo = file.mimeType.startsWith("video/");

    return {
      width: isImage ? 1920 : isVideo ? 1920 : null,
      height: isImage ? 1080 : isVideo ? 1080 : null,
      format: getExtension(file.mimeType),
      colorSpace: isImage ? "sRGB" : null,
      durationSeconds: isVideo ? 30 : null,
      fps: isVideo ? 30 : null,
      bitrate: isVideo ? 5000000 : null,
      exif: isImage
        ? {
            make: "Apple",
            model: "iPhone 15 Pro",
            orientation: 1,
            dateTime: file.uploadedAt,
            gpsLatitude: 0,
            gpsLongitude: 0,
            software: "iOS 18.0",
          }
        : {},
      fileSize: file.sizeBytes,
      createdAt: file.uploadedAt,
    };
  }

  /** Generate a thumbnail for a file. */
  generateThumbnail(
    fileId: string,
    width: number,
    height: number
  ): ProcessingJob {
    return this.process(fileId, [{ type: "thumbnail", width, height }]);
  }

  /** Run content moderation on a file. */
  moderateContent(fileId: string): ModerationResult {
    const file = this.uploadService.getFile(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Heuristic-based content moderation stub
    // In production, this would call a moderation API (AWS Rekognition, Google Vision, etc.)
    const categories = this.runModerationHeuristics(file);
    const flaggedCategories = categories.filter((c) => c.flagged);
    const maxScore = Math.max(...categories.map((c) => c.confidence), 0);

    return {
      fileId,
      safe: flaggedCategories.length === 0,
      score: maxScore,
      categories,
      reviewRequired: flaggedCategories.length > 0 || maxScore > 0.7,
      timestamp: new Date().toISOString(),
    };
  }

  /** Get all jobs for a file. */
  getJobsForFile(fileId: string): ProcessingJob[] {
    const jobs: ProcessingJob[] = [];
    Array.from(this.jobs.values()).forEach((job) => {
      if (job.fileId === fileId) {
        jobs.push(job);
      }
    });
    return jobs;
  }

  /** Execute a processing job (simulated). */
  private executeJob(job: ProcessingJob, file: FileRecord): void {
    job.status = "processing";
    job.startedAt = new Date().toISOString();

    try {
      const totalOps = job.operations.length;
      let completedOps = 0;

      for (const op of job.operations) {
        const output = this.executeOperation(op, file);
        job.outputs.push(output);
        completedOps++;
        job.progress = Math.round((completedOps / totalOps) * 100);
      }

      job.status = "completed";
      job.completedAt = new Date().toISOString();
      job.progress = 100;
    } catch (err) {
      job.status = "failed";
      job.error = err instanceof Error ? err.message : String(err);
      job.completedAt = new Date().toISOString();
    }
  }

  /** Execute a single processing operation. */
  private executeOperation(
    op: ProcessingOperation,
    file: FileRecord
  ): ProcessedOutput {
    const baseKey = file.storageKey.replace(/\.[^.]+$/, "");

    switch (op.type) {
      case "thumbnail": {
        const key = `${baseKey}_thumb_${op.width}x${op.height}.webp`;
        return {
          operationType: "thumbnail",
          storageKey: key,
          cdnUrl: `${file.cdnUrl.split("/").slice(0, 3).join("/")}/${key}`,
          metadata: {
            width: op.width,
            height: op.height,
            format: "webp",
            quality: 80,
          },
        };
      }

      case "resize": {
        const key = `${baseKey}_resized_${op.maxWidth}x${op.maxHeight}_q${op.quality}.webp`;
        return {
          operationType: "resize",
          storageKey: key,
          cdnUrl: `${file.cdnUrl.split("/").slice(0, 3).join("/")}/${key}`,
          metadata: {
            maxWidth: op.maxWidth,
            maxHeight: op.maxHeight,
            quality: op.quality,
            format: "webp",
          },
        };
      }

      case "watermark": {
        const key = `${baseKey}_watermarked.webp`;
        return {
          operationType: "watermark",
          storageKey: key,
          cdnUrl: `${file.cdnUrl.split("/").slice(0, 3).join("/")}/${key}`,
          metadata: {
            text: op.text,
            position: op.position,
          },
        };
      }

      case "metadata_extract": {
        const metadata = this.extractMetadata(file.fileId);
        return {
          operationType: "metadata_extract",
          storageKey: file.storageKey,
          cdnUrl: file.cdnUrl,
          metadata: {
            width: metadata.width ?? 0,
            height: metadata.height ?? 0,
            format: metadata.format ?? "unknown",
            fileSize: metadata.fileSize,
          },
        };
      }

      case "content_moderation": {
        const result = this.moderateContent(file.fileId);
        return {
          operationType: "content_moderation",
          storageKey: file.storageKey,
          cdnUrl: file.cdnUrl,
          metadata: {
            safe: result.safe,
            score: result.score,
            reviewRequired: result.reviewRequired,
          },
        };
      }

      case "perceptual_hash": {
        // Simulate image data for hashing
        const simulatedData = this.simulateImageData(file);
        const hash = this.perceptualHasher.computeHash(simulatedData);
        return {
          operationType: "perceptual_hash",
          storageKey: file.storageKey,
          cdnUrl: file.cdnUrl,
          metadata: {
            hash,
            algorithm: "pHash",
            hashBits: 64,
          },
        };
      }
    }
  }

  /** Run moderation heuristics based on file properties. */
  private runModerationHeuristics(file: FileRecord): ModerationCategory[] {
    const categories: ModerationCategory[] = [];
    const name = file.originalName.toLowerCase();

    // Keyword-based checks on filename
    const nsfwKeywords = [
      "nsfw",
      "explicit",
      "adult",
      "nude",
      "xxx",
    ];
    const violenceKeywords = ["gore", "violence", "graphic", "blood"];
    const spamKeywords = ["spam", "scam", "phishing", "fake"];

    const hasNsfw = nsfwKeywords.some((kw) => name.includes(kw));
    const hasViolence = violenceKeywords.some((kw) => name.includes(kw));
    const hasSpam = spamKeywords.some((kw) => name.includes(kw));

    categories.push({
      name: "adult_content",
      confidence: hasNsfw ? 0.95 : 0.02,
      flagged: hasNsfw,
    });

    categories.push({
      name: "violence",
      confidence: hasViolence ? 0.9 : 0.01,
      flagged: hasViolence,
    });

    categories.push({
      name: "spam",
      confidence: hasSpam ? 0.85 : 0.03,
      flagged: hasSpam,
    });

    // Size-based heuristic: very small images might be tracking pixels
    categories.push({
      name: "suspicious_dimensions",
      confidence: file.sizeBytes < 100 ? 0.8 : 0.01,
      flagged: file.sizeBytes < 100,
    });

    return categories;
  }

  /** Simulate image data from a file (in production, reads actual pixels). */
  private simulateImageData(file: FileRecord): number[] {
    // Generate deterministic pseudo-random data based on the file ID
    const data: number[] = [];
    let hash = 0;
    for (let i = 0; i < file.fileId.length; i++) {
      hash = (hash << 5) - hash + file.fileId.charCodeAt(i);
      hash |= 0;
    }
    for (let i = 0; i < 1024; i++) {
      hash = (hash * 1103515245 + 12345) & 0x7fffffff;
      data.push(hash % 256);
    }
    return data;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PerceptualHasher — pHash Algorithm for Image Duplicate Detection
// ══════════════════════════════════════════════════════════════════════════════

export class PerceptualHasher {
  private readonly hashSize: number;
  private readonly dctSize: number;

  constructor(hashSize: number = 8, dctSize: number = 32) {
    this.hashSize = hashSize;
    this.dctSize = dctSize;
  }

  /**
   * Compute a perceptual hash for image data.
   * Algorithm: resize to 32x32, compute DCT, take top-left 8x8,
   * threshold at median to produce a 64-bit hash string.
   */
  computeHash(imageData: number[]): string {
    // Step 1: "Resize" to dctSize x dctSize (simulate by sampling/averaging)
    const resized = this.resizeToGrid(imageData, this.dctSize);

    // Step 2: Convert to grayscale (already grayscale in our simulation)
    const grayscale = resized;

    // Step 3: Compute 2D DCT
    const dctResult = this.dct2d(grayscale, this.dctSize);

    // Step 4: Take top-left hashSize x hashSize (low frequency components)
    const lowFreq: number[] = [];
    for (let y = 0; y < this.hashSize; y++) {
      for (let x = 0; x < this.hashSize; x++) {
        lowFreq.push(dctResult[y * this.dctSize + x]);
      }
    }

    // Step 5: Compute median (excluding DC component)
    const forMedian = lowFreq.slice(1);
    const sorted = [...forMedian].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    // Step 6: Generate hash by thresholding at median
    let hash = "";
    for (let i = 0; i < lowFreq.length; i++) {
      hash += lowFreq[i] > median ? "1" : "0";
    }

    // Convert binary to hex
    return this.binaryToHex(hash);
  }

  /** Compute Hamming distance between two hashes. */
  compare(hash1: string, hash2: string): number {
    const bin1 = this.hexToBinary(hash1);
    const bin2 = this.hexToBinary(hash2);
    const maxLen = Math.max(bin1.length, bin2.length);
    let distance = 0;

    for (let i = 0; i < maxLen; i++) {
      const bit1 = i < bin1.length ? bin1[i] : "0";
      const bit2 = i < bin2.length ? bin2[i] : "0";
      if (bit1 !== bit2) distance++;
    }

    return distance;
  }

  /** Check if two images are visually similar based on hash distance. */
  isDuplicate(hash1: string, hash2: string, threshold: number = 10): boolean {
    return this.compare(hash1, hash2) <= threshold;
  }

  /** Find all duplicates of a hash from a set of existing hashes. */
  findDuplicates(
    hash: string,
    existingHashes: Map<string, string>,
    threshold: number = 10
  ): { id: string; hash: string; distance: number }[] {
    const duplicates: { id: string; hash: string; distance: number }[] = [];

    Array.from(existingHashes.entries()).forEach(([id, existingHash]) => {
      const distance = this.compare(hash, existingHash);
      if (distance <= threshold) {
        duplicates.push({ id, hash: existingHash, distance });
      }
    });

    return duplicates.sort((a, b) => a.distance - b.distance);
  }

  /** Resize image data to a grid by averaging samples. */
  private resizeToGrid(data: number[], size: number): number[] {
    const grid: number[] = new Array(size * size).fill(0);
    const blockSize = Math.max(1, Math.floor(Math.sqrt(data.length)) / size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const srcIdx = Math.floor(
          (y * blockSize * Math.sqrt(data.length) + x * blockSize)
        );
        const idx = Math.min(srcIdx, data.length - 1);
        grid[y * size + x] = data[Math.max(0, idx)] ?? 128;
      }
    }

    return grid;
  }

  /** Compute 2D Discrete Cosine Transform. */
  private dct2d(input: number[], size: number): number[] {
    const output: number[] = new Array(size * size).fill(0);

    // Row-wise DCT
    const rowResult: number[] = new Array(size * size).fill(0);
    for (let y = 0; y < size; y++) {
      for (let u = 0; u < size; u++) {
        let sum = 0;
        for (let x = 0; x < size; x++) {
          sum +=
            input[y * size + x] *
            Math.cos(((2 * x + 1) * u * Math.PI) / (2 * size));
        }
        const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
        rowResult[y * size + u] = cu * sum * Math.sqrt(2 / size);
      }
    }

    // Column-wise DCT
    for (let v = 0; v < size; v++) {
      for (let u = 0; u < size; u++) {
        let sum = 0;
        for (let y = 0; y < size; y++) {
          sum +=
            rowResult[y * size + u] *
            Math.cos(((2 * y + 1) * v * Math.PI) / (2 * size));
        }
        const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
        output[v * size + u] = cv * sum * Math.sqrt(2 / size);
      }
    }

    return output;
  }

  /** Convert binary string to hex. */
  private binaryToHex(binary: string): string {
    let hex = "";
    // Pad to multiple of 4
    const padded = binary.padEnd(Math.ceil(binary.length / 4) * 4, "0");
    for (let i = 0; i < padded.length; i += 4) {
      const nibble = padded.substring(i, i + 4);
      hex += parseInt(nibble, 2).toString(16);
    }
    return hex;
  }

  /** Convert hex string to binary. */
  private hexToBinary(hex: string): string {
    let binary = "";
    for (let i = 0; i < hex.length; i++) {
      binary += parseInt(hex[i], 16).toString(2).padStart(4, "0");
    }
    return binary;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CDNManager — Content Delivery Network Management
// ══════════════════════════════════════════════════════════════════════════════

export class CDNManager {
  private cache: Map<string, CDNCacheEntry> = new Map();
  private invalidationCount: number = 0;
  private totalRequests: number = 0;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private bandwidthBytes: number = 0;
  private readonly baseUrl: string;
  private readonly maxCacheSize: number;

  constructor(
    baseUrl: string = "https://cdn.socialperks.app",
    maxCacheSize: number = 10000
  ) {
    this.baseUrl = baseUrl;
    this.maxCacheSize = maxCacheSize;
  }

  /** Generate a CDN URL with optional image transforms. */
  getUrl(storageKey: string, transforms?: CDNTransform): string {
    const cacheKey = this.buildCacheKey(storageKey, transforms);
    this.totalRequests++;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.cacheHits++;
      cached.lastAccessedAt = Date.now();
      cached.accessCount++;
      return cached.url;
    }

    this.cacheMisses++;

    // Build URL with transforms
    let url = `${this.baseUrl}/${storageKey}`;
    if (transforms) {
      const params = this.buildTransformParams(transforms);
      if (params) {
        url += `?${params}`;
      }
    }

    // Add to cache
    this.addToCache(cacheKey, storageKey, transforms, url);

    return url;
  }

  /** Invalidate CDN cache for patterns (glob-style). */
  invalidate(patterns: string[]): {
    invalidated: number;
    patterns: string[];
  } {
    let invalidated = 0;

    for (const pattern of patterns) {
      const regex = this.globToRegex(pattern);
      const keysToDelete: string[] = [];

      Array.from(this.cache.entries()).forEach(([key, entry]) => {
        if (regex.test(entry.storageKey)) {
          keysToDelete.push(key);
        }
      });

      for (const key of keysToDelete) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    this.invalidationCount += invalidated;

    return { invalidated, patterns };
  }

  /** Pre-warm CDN cache by resolving URLs. */
  warmCache(
    urls: { storageKey: string; transforms?: CDNTransform }[]
  ): { warmed: number; skipped: number } {
    let warmed = 0;
    let skipped = 0;

    for (const { storageKey, transforms } of urls) {
      const cacheKey = this.buildCacheKey(storageKey, transforms);
      if (this.cache.has(cacheKey)) {
        skipped++;
        continue;
      }

      let url = `${this.baseUrl}/${storageKey}`;
      if (transforms) {
        const params = this.buildTransformParams(transforms);
        if (params) url += `?${params}`;
      }

      this.addToCache(cacheKey, storageKey, transforms, url);
      warmed++;
    }

    return { warmed, skipped };
  }

  /** Get CDN statistics. */
  getStats(): CDNStats {
    // Find popular assets
    const assetCounts: Map<string, number> = new Map();
    Array.from(this.cache.values()).forEach((entry) => {
      const current = assetCounts.get(entry.storageKey) ?? 0;
      assetCounts.set(entry.storageKey, current + entry.accessCount);
    });

    const popularAssets = Array.from(assetCounts.entries())
      .map(([storageKey, requests]) => ({ storageKey, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 20);

    return {
      totalRequests: this.totalRequests,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate:
        this.totalRequests > 0 ? this.cacheHits / this.totalRequests : 0,
      bandwidthBytes: this.bandwidthBytes,
      popularAssets,
      invalidations: this.invalidationCount,
    };
  }

  /** Record bandwidth usage (called when content is served). */
  recordBandwidth(bytes: number): void {
    this.bandwidthBytes += bytes;
  }

  /** Reset all stats (useful for testing). */
  resetStats(): void {
    this.totalRequests = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.bandwidthBytes = 0;
    this.invalidationCount = 0;
  }

  /** Build a cache key from storage key and transforms. */
  private buildCacheKey(
    storageKey: string,
    transforms?: CDNTransform
  ): string {
    if (!transforms) return storageKey;
    const parts = [storageKey];
    if (transforms.width) parts.push(`w${transforms.width}`);
    if (transforms.height) parts.push(`h${transforms.height}`);
    if (transforms.format) parts.push(`f${transforms.format}`);
    if (transforms.quality) parts.push(`q${transforms.quality}`);
    if (transforms.fit) parts.push(`fit${transforms.fit}`);
    return parts.join(":");
  }

  /** Build URL query parameters from transforms. */
  private buildTransformParams(transforms: CDNTransform): string {
    const params: string[] = [];
    if (transforms.width) params.push(`w=${transforms.width}`);
    if (transforms.height) params.push(`h=${transforms.height}`);
    if (transforms.format) params.push(`f=${transforms.format}`);
    if (transforms.quality) params.push(`q=${transforms.quality}`);
    if (transforms.fit) params.push(`fit=${transforms.fit}`);
    return params.join("&");
  }

  /** Add an entry to the cache, evicting LRU if needed. */
  private addToCache(
    cacheKey: string,
    storageKey: string,
    transforms: CDNTransform | undefined,
    url: string
  ): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLRU();
    }

    this.cache.set(cacheKey, {
      storageKey,
      transforms: transforms ? JSON.stringify(transforms) : "",
      url,
      cachedAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 1,
      sizeBytes: 0,
    });
  }

  /** Evict the least recently used cache entry. */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /** Convert a glob pattern to a RegExp. */
  private globToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    return new RegExp(`^${escaped}$`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Default Instances
// ══════════════════════════════════════════════════════════════════════════════

/** Global upload service instance. */
export const uploadService = new UploadService();

/** Global perceptual hasher instance. */
export const perceptualHasher = new PerceptualHasher();

/** Global media processor instance. */
export const mediaProcessor = new MediaProcessor(uploadService, perceptualHasher);

/** Global CDN manager instance. */
export const cdnManager = new CDNManager();
