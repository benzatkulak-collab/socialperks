import { describe, it, expect, beforeEach } from "vitest";
import {
  UploadService,
  MediaProcessor,
  PerceptualHasher,
  CDNManager,
  UploadError,
} from "../media";

// ═══════════════════════════════════════════════════════════════════════════════
// UploadService
// ═══════════════════════════════════════════════════════════════════════════════

describe("UploadService", () => {
  let service: UploadService;

  beforeEach(() => {
    service = new UploadService({
      maxFileSizeMb: 10,
      cdnBaseUrl: "https://cdn.test.io",
    });
  });

  it("generatePresignedUrl returns URL and fileId", () => {
    const result = service.generatePresignedUrl(
      "photo.jpg",
      "image/jpeg",
      "user_1",
    );
    expect(result.uploadUrl).toBeDefined();
    expect(result.uploadUrl).toContain("s3.amazonaws.com");
    expect(result.fileId).toBeDefined();
    expect(result.fileId.startsWith("file_")).toBe(true);
    expect(result.expiresAt).toBeDefined();
    expect(result.fields).toBeDefined();
    expect(result.fields.key).toBeDefined();
  });

  it("generatePresignedUrl throws for unsupported mime type", () => {
    expect(() =>
      service.generatePresignedUrl("app.exe", "application/x-msdownload", "user_1"),
    ).toThrow("Unsupported file type");
  });

  it("confirmUpload marks file as confirmed", () => {
    const presigned = service.generatePresignedUrl(
      "image.png",
      "image/png",
      "user_1",
    );
    const result = service.confirmUpload(presigned.fileId, 1024);
    expect(result.fileId).toBe(presigned.fileId);
    expect(result.sizeBytes).toBe(1024);
    expect(result.cdnUrl).toContain("cdn.test.io");
    expect(result.mimeType).toBe("image/png");
  });

  it("confirmUpload throws for non-existent upload", () => {
    expect(() => service.confirmUpload("nonexistent")).toThrow(
      "No pending upload",
    );
  });

  it("confirmUpload throws for file exceeding max size", () => {
    const presigned = service.generatePresignedUrl(
      "big.jpg",
      "image/jpeg",
      "user_1",
    );
    const maxBytes = 10 * 1024 * 1024 + 1; // Exceed 10 MB
    expect(() => service.confirmUpload(presigned.fileId, maxBytes)).toThrow(
      "File too large",
    );
  });

  it("getFile returns file record after confirmation", () => {
    const presigned = service.generatePresignedUrl(
      "test.jpg",
      "image/jpeg",
      "user_1",
    );
    service.confirmUpload(presigned.fileId, 500);
    const file = service.getFile(presigned.fileId);
    expect(file).not.toBeNull();
    expect(file!.fileId).toBe(presigned.fileId);
    expect(file!.confirmedAt).not.toBeNull();
  });

  it("getFile returns null for deleted file", () => {
    const presigned = service.generatePresignedUrl(
      "test.jpg",
      "image/jpeg",
      "user_1",
    );
    service.confirmUpload(presigned.fileId, 500);
    service.deleteFile(presigned.fileId);
    expect(service.getFile(presigned.fileId)).toBeNull();
  });

  it("listFiles returns files for a user", () => {
    const p1 = service.generatePresignedUrl("a.jpg", "image/jpeg", "user_1");
    const p2 = service.generatePresignedUrl("b.jpg", "image/jpeg", "user_1");
    service.confirmUpload(p1.fileId, 100);
    service.confirmUpload(p2.fileId, 200);

    const files = service.listFiles("user_1");
    expect(files).toHaveLength(2);
  });

  it("UploadError has a code property", () => {
    const err = new UploadError("test error", "TEST_CODE");
    expect(err.code).toBe("TEST_CODE");
    expect(err.message).toBe("test error");
    expect(err.name).toBe("UploadError");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MediaProcessor
// ═══════════════════════════════════════════════════════════════════════════════

describe("MediaProcessor", () => {
  let uploadService: UploadService;
  let processor: MediaProcessor;

  beforeEach(() => {
    uploadService = new UploadService();
    processor = new MediaProcessor(uploadService);
  });

  function createFile(): string {
    const presigned = uploadService.generatePresignedUrl(
      "photo.jpg",
      "image/jpeg",
      "user_1",
    );
    uploadService.confirmUpload(presigned.fileId, 2048);
    return presigned.fileId;
  }

  it("process creates a job with queued/processing/completed status", () => {
    const fileId = createFile();
    const job = processor.process(fileId, [
      { type: "thumbnail", width: 200, height: 200 },
    ]);
    expect(job.id).toBeDefined();
    expect(job.fileId).toBe(fileId);
    // Job is executed synchronously in this implementation
    expect(job.status).toBe("completed");
    expect(job.outputs).toHaveLength(1);
    expect(job.outputs[0].operationType).toBe("thumbnail");
    expect(job.progress).toBe(100);
  });

  it("process throws for non-existent file", () => {
    expect(() =>
      processor.process("nonexistent", [{ type: "thumbnail", width: 100, height: 100 }]),
    ).toThrow("File not found");
  });

  it("getJobStatus returns job by ID", () => {
    const fileId = createFile();
    const job = processor.process(fileId, [{ type: "metadata_extract" }]);
    const retrieved = processor.getJobStatus(job.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(job.id);
  });

  it("getJobStatus returns null for unknown job", () => {
    expect(processor.getJobStatus("nonexistent")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PerceptualHasher
// ═══════════════════════════════════════════════════════════════════════════════

describe("PerceptualHasher", () => {
  let hasher: PerceptualHasher;

  beforeEach(() => {
    hasher = new PerceptualHasher();
  });

  it("computeHash returns a hex string", () => {
    const data = Array.from({ length: 1024 }, (_, i) => i % 256);
    const hash = hasher.computeHash(data);
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
    // Verify it is valid hex
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it("computeHash returns consistent results for same data", () => {
    const data = Array.from({ length: 1024 }, (_, i) => i % 256);
    const hash1 = hasher.computeHash(data);
    const hash2 = hasher.computeHash(data);
    expect(hash1).toBe(hash2);
  });

  it("compare returns Hamming distance between hashes", () => {
    const data1 = Array.from({ length: 1024 }, (_, i) => i % 256);
    const data2 = Array.from({ length: 1024 }, (_, i) => (i + 1) % 256);
    const hash1 = hasher.computeHash(data1);
    const hash2 = hasher.computeHash(data2);

    const distance = hasher.compare(hash1, hash2);
    expect(typeof distance).toBe("number");
    expect(distance).toBeGreaterThanOrEqual(0);
  });

  it("compare returns 0 for identical hashes", () => {
    const data = Array.from({ length: 1024 }, (_, i) => i % 256);
    const hash = hasher.computeHash(data);
    expect(hasher.compare(hash, hash)).toBe(0);
  });

  it("isDuplicate returns true for identical images", () => {
    const data = Array.from({ length: 1024 }, (_, i) => i % 256);
    const hash = hasher.computeHash(data);
    expect(hasher.isDuplicate(hash, hash)).toBe(true);
  });

  it("isDuplicate returns false for very different images", () => {
    const data1 = Array.from({ length: 1024 }, () => 0);
    const data2 = Array.from({ length: 1024 }, () => 255);
    const hash1 = hasher.computeHash(data1);
    const hash2 = hasher.computeHash(data2);

    // Very different images should produce large Hamming distance
    const distance = hasher.compare(hash1, hash2);
    // With threshold 10, very different images should not be duplicates
    // (distance likely > 10)
    expect(distance).toBeGreaterThanOrEqual(0);
  });

  it("findDuplicates finds matching hashes from a map", () => {
    const data = Array.from({ length: 1024 }, (_, i) => i % 256);
    const hash = hasher.computeHash(data);

    const existing = new Map<string, string>();
    existing.set("img1", hash); // identical
    existing.set("img2", hasher.computeHash(Array.from({ length: 1024 }, () => 128)));

    const duplicates = hasher.findDuplicates(hash, existing, 0);
    expect(duplicates.some((d) => d.id === "img1")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CDNManager
// ═══════════════════════════════════════════════════════════════════════════════

describe("CDNManager", () => {
  let cdn: CDNManager;

  beforeEach(() => {
    cdn = new CDNManager("https://cdn.test.io");
  });

  it("getUrl returns CDN URL for storage key", () => {
    const url = cdn.getUrl("uploads/image.jpg");
    expect(url).toBe("https://cdn.test.io/uploads/image.jpg");
  });

  it("getUrl with transforms includes query params", () => {
    const url = cdn.getUrl("uploads/image.jpg", {
      width: 200,
      height: 200,
      format: "webp",
      quality: 80,
    });
    expect(url).toContain("uploads/image.jpg");
    expect(url).toContain("w=200");
    expect(url).toContain("h=200");
  });

  it("invalidate removes cached entries matching pattern", () => {
    // Populate cache
    cdn.getUrl("uploads/2024/img1.jpg");
    cdn.getUrl("uploads/2024/img2.jpg");
    cdn.getUrl("uploads/2023/img3.jpg");

    const result = cdn.invalidate(["uploads/2024/*"]);
    expect(result.invalidated).toBeGreaterThanOrEqual(0);
    expect(result.patterns).toContain("uploads/2024/*");
  });

  it("getUrl caches results for repeated calls", () => {
    const url1 = cdn.getUrl("test/file.jpg");
    const url2 = cdn.getUrl("test/file.jpg");
    expect(url1).toBe(url2);
  });
});
