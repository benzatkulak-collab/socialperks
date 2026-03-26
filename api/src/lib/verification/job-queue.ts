/**
 * Verification Job Queue
 *
 * Manages async verification jobs with retry, backoff, priority, and
 * dead-letter handling. Processes verifications in the background,
 * respecting per-platform rate limits.
 *
 * Job lifecycle: pending → processing → completed | failed | dead_letter
 *
 * Production: Replace in-memory queue with BullMQ + Redis or SQS.
 */

import { PlatformRateLimiter } from "./rate-limiter";
import type { VerificationSubmission, VerificationResult } from "../verification-engine";

// ─── Types ──────────────────────────────────────────────────────────────────

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "dead_letter";

export interface VerificationJob {
  id: string;
  submission: VerificationSubmission;
  status: JobStatus;
  /** Higher number = processed first. */
  priority: number;
  /** Number of times this job has been attempted. */
  attempts: number;
  maxAttempts: number;
  /** Last error message if failed. */
  lastError: string | null;
  /** Result when completed. */
  result: VerificationResult | null;
  /** Timestamps for tracking. */
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  /** Next retry time if waiting for retry. */
  nextRetryAt: number | null;
  /** Tags for filtering/grouping. */
  tags: Record<string, string>;
}

export interface QueueConfig {
  /** Max jobs processing concurrently across all platforms. */
  maxGlobalConcurrency: number;
  /** Max jobs processing concurrently per platform. */
  maxPlatformConcurrency: number;
  /** Default max retry attempts. */
  defaultMaxAttempts: number;
  /** Base delay for exponential backoff between retries (ms). */
  retryBaseDelayMs: number;
  /** Max delay between retries (ms). */
  retryMaxDelayMs: number;
  /** How often to poll for new jobs (ms). */
  pollIntervalMs: number;
  /** After how many failures to move to dead letter. */
  deadLetterThreshold: number;
  /** Max queue size before rejecting new jobs. */
  maxQueueSize: number;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  totalProcessed: number;
  avgProcessingTimeMs: number;
  jobsPerMinute: number;
}

type JobHandler = (submission: VerificationSubmission) => Promise<VerificationResult>;
type JobEventListener = (job: VerificationJob) => void;

// ─── Default Config ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG: QueueConfig = {
  maxGlobalConcurrency: 20,
  maxPlatformConcurrency: 5,
  defaultMaxAttempts: 3,
  retryBaseDelayMs: 1000,
  retryMaxDelayMs: 60000,
  pollIntervalMs: 500,
  deadLetterThreshold: 5,
  maxQueueSize: 10000,
};

// ─── Job Queue ──────────────────────────────────────────────────────────────

export class VerificationJobQueue {
  private jobs = new Map<string, VerificationJob>();
  private config: QueueConfig;
  private rateLimiter: PlatformRateLimiter;
  private handler: JobHandler | null = null;
  private processing = 0;
  private platformProcessing = new Map<string, number>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private jobIdCounter = 0;

  /** Completed job metrics for stats. */
  private completedTimes: number[] = [];
  private completedTimestamps: number[] = [];

  /** Event listeners. */
  private listeners = {
    completed: [] as JobEventListener[],
    failed: [] as JobEventListener[],
    deadLetter: [] as JobEventListener[],
    retrying: [] as JobEventListener[],
  };

  constructor(rateLimiter: PlatformRateLimiter, config?: Partial<QueueConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rateLimiter = rateLimiter;
  }

  // ── Handler Registration ──────────────────────────────────────────────

  /**
   * Register the function that processes verification submissions.
   * This is the bridge to the actual platform verification logic.
   */
  setHandler(handler: JobHandler): void {
    this.handler = handler;
  }

  on(event: keyof typeof this.listeners, listener: JobEventListener): void {
    this.listeners[event].push(listener);
  }

  private emit(event: keyof typeof this.listeners, job: VerificationJob): void {
    for (const listener of this.listeners[event]) {
      try { listener(job); } catch { /* don't let listener errors crash the queue */ }
    }
  }

  // ── Job Submission ────────────────────────────────────────────────────

  /**
   * Submit a new verification job. Returns the job ID.
   * Priority: 0 = normal, higher = processed sooner.
   */
  submit(
    submission: VerificationSubmission,
    options?: { priority?: number; maxAttempts?: number; tags?: Record<string, string> }
  ): string {
    if (this.jobs.size >= this.config.maxQueueSize) {
      throw new Error(`Queue full (${this.config.maxQueueSize} jobs). Try again later.`);
    }

    const id = `vj_${Date.now()}_${++this.jobIdCounter}`;
    const job: VerificationJob = {
      id,
      submission,
      status: "pending",
      priority: options?.priority ?? 0,
      attempts: 0,
      maxAttempts: options?.maxAttempts ?? this.config.defaultMaxAttempts,
      lastError: null,
      result: null,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      nextRetryAt: null,
      tags: options?.tags ?? {},
    };

    this.jobs.set(id, job);
    return id;
  }

  /**
   * Submit multiple jobs at once. Returns job IDs.
   */
  submitBatch(
    submissions: VerificationSubmission[],
    options?: { priority?: number; tags?: Record<string, string> }
  ): string[] {
    return submissions.map((s) => this.submit(s, options));
  }

  // ── Job Lifecycle ─────────────────────────────────────────────────────

  /**
   * Start the queue processor. Polls for new jobs and processes them.
   */
  start(): void {
    if (this.running) return;
    if (!this.handler) throw new Error("No handler registered. Call setHandler() first.");

    this.running = true;
    this.pollTimer = setInterval(() => this.tick(), this.config.pollIntervalMs);
    // Process immediately
    this.tick();
  }

  /**
   * Stop the queue processor. In-flight jobs will complete.
   */
  stop(): void {
    this.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * One tick of the processor: pick eligible jobs and process them.
   */
  private tick(): void {
    if (!this.running || !this.handler) return;

    // Get jobs that are ready to process
    const ready = this.getReadyJobs();

    for (const job of ready) {
      if (this.processing >= this.config.maxGlobalConcurrency) break;

      const platformCount = this.platformProcessing.get(job.submission.platformId) ?? 0;
      if (platformCount >= this.config.maxPlatformConcurrency) continue;

      this.processJob(job);
    }
  }

  private getReadyJobs(): VerificationJob[] {
    const now = Date.now();
    const ready: VerificationJob[] = [];

    for (const job of this.jobs.values()) {
      if (job.status === "pending") {
        if (!job.nextRetryAt || job.nextRetryAt <= now) {
          ready.push(job);
        }
      }
    }

    // Sort by priority (highest first), then by creation time (oldest first)
    ready.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.createdAt - b.createdAt;
    });

    return ready;
  }

  private async processJob(job: VerificationJob): Promise<void> {
    if (!this.handler) return;

    const platformId = job.submission.platformId;
    job.status = "processing";
    job.startedAt = Date.now();
    job.attempts += 1;
    this.processing += 1;
    this.platformProcessing.set(platformId, (this.platformProcessing.get(platformId) ?? 0) + 1);

    // Acquire rate limit slot
    let release: (() => void) | null = null;

    try {
      release = await this.rateLimiter.acquire(platformId, job.priority);
      const result = await this.handler(job.submission);

      // Success
      job.status = "completed";
      job.result = result;
      job.completedAt = Date.now();
      this.rateLimiter.reportSuccess(platformId);

      // Track metrics
      const processingTime = job.completedAt - (job.startedAt ?? job.createdAt);
      this.completedTimes.push(processingTime);
      this.completedTimestamps.push(job.completedAt);
      // Keep only last 1000 for stats
      if (this.completedTimes.length > 1000) {
        this.completedTimes.splice(0, 500);
        this.completedTimestamps.splice(0, 500);
      }

      this.emit("completed", job);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      job.lastError = message;

      // Check if it's a rate limit error
      if (message.includes("429") || message.includes("rate limit")) {
        this.rateLimiter.reportThrottled(platformId);
      }

      // Retry or fail
      if (job.attempts < job.maxAttempts) {
        job.status = "pending";
        const delay = Math.min(
          this.config.retryBaseDelayMs * Math.pow(2, job.attempts - 1),
          this.config.retryMaxDelayMs
        );
        // Add jitter
        const jitter = delay * 0.25 * Math.random();
        job.nextRetryAt = Date.now() + delay + jitter;

        this.emit("retrying", job);
      } else if (job.attempts >= this.config.deadLetterThreshold) {
        job.status = "dead_letter";
        this.emit("deadLetter", job);
      } else {
        job.status = "failed";
        this.emit("failed", job);
      }
    } finally {
      release?.();
      this.processing -= 1;
      const current = this.platformProcessing.get(platformId) ?? 1;
      this.platformProcessing.set(platformId, Math.max(0, current - 1));
    }
  }

  // ── Query ─────────────────────────────────────────────────────────────

  getJob(jobId: string): VerificationJob | null {
    return this.jobs.get(jobId) ?? null;
  }

  getJobsBySubmission(submissionId: string): VerificationJob[] {
    const results: VerificationJob[] = [];
    for (const job of this.jobs.values()) {
      if (job.submission.submissionId === submissionId) results.push(job);
    }
    return results;
  }

  getJobsByStatus(status: JobStatus): VerificationJob[] {
    const results: VerificationJob[] = [];
    for (const job of this.jobs.values()) {
      if (job.status === status) results.push(job);
    }
    return results;
  }

  /**
   * Retry a specific failed or dead-letter job.
   */
  retry(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    if (job.status !== "failed" && job.status !== "dead_letter") return false;

    job.status = "pending";
    job.attempts = 0;
    job.lastError = null;
    job.nextRetryAt = null;
    return true;
  }

  /**
   * Cancel a pending job.
   */
  cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== "pending") return false;
    this.jobs.delete(jobId);
    return true;
  }

  // ── Stats ─────────────────────────────────────────────────────────────

  getStats(): QueueStats {
    let pending = 0, processing = 0, completed = 0, failed = 0, deadLetter = 0;

    for (const job of this.jobs.values()) {
      switch (job.status) {
        case "pending": pending++; break;
        case "processing": processing++; break;
        case "completed": completed++; break;
        case "failed": failed++; break;
        case "dead_letter": deadLetter++; break;
      }
    }

    // Average processing time
    const avgProcessingTimeMs = this.completedTimes.length > 0
      ? this.completedTimes.reduce((a, b) => a + b, 0) / this.completedTimes.length
      : 0;

    // Jobs per minute (last 5 minutes)
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const recentCount = this.completedTimestamps.filter((t) => t > fiveMinAgo).length;
    const jobsPerMinute = recentCount / 5;

    return {
      pending,
      processing,
      completed,
      failed,
      deadLetter,
      totalProcessed: completed + failed + deadLetter,
      avgProcessingTimeMs: Math.round(avgProcessingTimeMs),
      jobsPerMinute: Math.round(jobsPerMinute * 10) / 10,
    };
  }

  // ── Cleanup ───────────────────────────────────────────────────────────

  /**
   * Remove completed jobs older than the given age.
   */
  cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;

    for (const [id, job] of this.jobs) {
      if (job.status === "completed" && job.completedAt && job.completedAt < cutoff) {
        this.jobs.delete(id);
        removed++;
      }
    }

    return removed;
  }

  get size(): number {
    return this.jobs.size;
  }

  get isRunning(): boolean {
    return this.running;
  }
}
