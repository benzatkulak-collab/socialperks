// ==============================================================================
// Social Perks -- Image Storage Abstraction
//
// Pluggable backend storage for proof images. Automatically selects S3 when
// S3_BUCKET is configured, otherwise falls back to local filesystem storage
// under /public/uploads/.
// ==============================================================================

import { logger } from "@/lib/logging";
import * as fs from "node:fs/promises";
import * as path from "node:path";

// ─── Storage Interface ──────────────────────────────────────────────────────

export interface StorageBackend {
  /** Upload a file and return its public URL. */
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>;

  /** Download a file by key. Returns null if not found. */
  download(key: string): Promise<Buffer | null>;

  /** Delete a file by key. */
  delete(key: string): Promise<void>;

  /** Get the public URL for a stored file. */
  getUrl(key: string): string;
}

// ─── Local Filesystem Backend ───────────────────────────────────────────────

export class LocalStorage implements StorageBackend {
  private readonly basePath: string;
  private readonly baseUrl: string;

  constructor(basePath?: string, baseUrl?: string) {
    this.basePath = basePath ?? path.join(process.cwd(), "public", "uploads");
    this.baseUrl = baseUrl ?? "/uploads";
  }

  async upload(key: string, buffer: Buffer, _contentType: string): Promise<string> {
    const filePath = path.join(this.basePath, key);
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);

    logger.debug("Local storage: file written", { key, size: buffer.length });
    return this.getUrl(key);
  }

  async download(key: string): Promise<Buffer | null> {
    const filePath = path.join(this.basePath, key);
    try {
      return await fs.readFile(filePath);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.basePath, key);
    try {
      await fs.unlink(filePath);
      logger.debug("Local storage: file deleted", { key });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
      throw e;
    }
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}

// ─── S3 SDK Loader ──────────────────────────────────────────────────────────

// Minimal type shapes for the S3 SDK so we don't need @aws-sdk/client-s3
// installed at compile time. At runtime, the real SDK classes are loaded
// dynamically via require().
interface S3ClientLike {
  send(command: unknown): Promise<{ Body?: AsyncIterable<Uint8Array> }>;
}

interface S3SdkModule {
  S3Client: new (config: Record<string, unknown>) => S3ClientLike;
  PutObjectCommand: new (params: Record<string, unknown>) => unknown;
  GetObjectCommand: new (params: Record<string, unknown>) => unknown;
  DeleteObjectCommand: new (params: Record<string, unknown>) => unknown;
}

let s3Sdk: S3SdkModule | null = null;
let s3SdkChecked = false;

function loadS3Sdk(): S3SdkModule {
  if (s3SdkChecked && s3Sdk) return s3Sdk;
  s3SdkChecked = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    s3Sdk = require("@aws-sdk/client-s3") as S3SdkModule;
    return s3Sdk;
  } catch {
    throw new Error(
      "S3 storage requires @aws-sdk/client-s3. Install with: npm install @aws-sdk/client-s3"
    );
  }
}

// ─── S3 Storage Backend ─────────────────────────────────────────────────────

export class S3Storage implements StorageBackend {
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint: string | undefined;
  private readonly cdnUrl: string | undefined;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? "";
    this.region = process.env.S3_REGION ?? "us-east-1";
    this.endpoint = process.env.S3_ENDPOINT ?? undefined;
    this.cdnUrl = process.env.S3_CDN_URL ?? undefined;

    if (!this.bucket) {
      throw new Error("S3Storage requires S3_BUCKET environment variable");
    }
  }

  private createClient(): S3ClientLike {
    const sdk = loadS3Sdk();
    return new sdk.S3Client({
      region: this.region,
      ...(this.endpoint ? { endpoint: this.endpoint, forcePathStyle: true } : {}),
    });
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const sdk = loadS3Sdk();
    const client = this.createClient();

    await client.send(
      new sdk.PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    logger.info("S3 storage: file uploaded", {
      bucket: this.bucket,
      key,
      size: buffer.length,
    });

    return this.getUrl(key);
  }

  async download(key: string): Promise<Buffer | null> {
    try {
      const sdk = loadS3Sdk();
      const client = this.createClient();

      const response = await client.send(
        new sdk.GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      if (!response.Body) return null;

      // Stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (e) {
      const code = (e as { name?: string }).name;
      if (code === "NoSuchKey" || code === "NotFound") return null;
      throw e;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const sdk = loadS3Sdk();
      const client = this.createClient();

      await client.send(
        new sdk.DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      logger.debug("S3 storage: file deleted", { bucket: this.bucket, key });
    } catch (e) {
      const code = (e as { name?: string }).name;
      if (code === "NoSuchKey" || code === "NotFound") return;
      throw e;
    }
  }

  getUrl(key: string): string {
    if (this.cdnUrl) {
      return `${this.cdnUrl}/${key}`;
    }
    if (this.endpoint) {
      return `${this.endpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}

// ─── ImageStore (main entry point) ──────────────────────────────────────────

/**
 * High-level image store with pluggable backend.
 * Auto-selects S3 when S3_BUCKET is set, otherwise uses local filesystem.
 */
export class ImageStore {
  readonly backend: StorageBackend;

  constructor(backend?: StorageBackend) {
    if (backend) {
      this.backend = backend;
    } else if (process.env.S3_BUCKET) {
      this.backend = new S3Storage();
      logger.info("ImageStore: using S3 backend", {
        bucket: process.env.S3_BUCKET,
        region: process.env.S3_REGION ?? "us-east-1",
      });
    } else {
      this.backend = new LocalStorage();
      logger.info("ImageStore: using local filesystem backend");
    }
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    return this.backend.upload(key, buffer, contentType);
  }

  async download(key: string): Promise<Buffer | null> {
    return this.backend.download(key);
  }

  async delete(key: string): Promise<void> {
    return this.backend.delete(key);
  }

  getUrl(key: string): string {
    return this.backend.getUrl(key);
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _store: ImageStore | null = null;

export function getImageStore(): ImageStore {
  if (!_store) {
    _store = new ImageStore();
  }
  return _store;
}
