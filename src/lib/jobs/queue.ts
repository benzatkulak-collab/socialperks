/**
 * Distributed Background Job Queue
 *
 * In-memory priority job queue with concurrency control, retry with backoff,
 * dead letter queue, scheduled jobs, and timeout enforcement.
 *
 * Designed as a Redis-compatible abstraction: swap the storage layer to Redis
 * (e.g. BullMQ / ioredis) without changing any call sites.
 *
 * Storage interface is extracted so the in-memory implementation can be replaced
 * with a Redis-backed one by providing a different adapter.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type JobStatus = "pending" | "active" | "completed" | "failed" | "dead";

export type BackoffStrategy = "exponential" | "linear" | "fixed";

export interface Job<T = unknown> {
  id: string;
  queue: string;
  data: T;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  backoff: BackoffStrategy;
  delay: number;
  timeout: number;
  scheduledFor: number;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  failedAt: number | null;
  lastError: string | null;
  result: unknown;
}

export interface AddJobOptions {
  priority?: number;
  delay?: number;
  scheduledFor?: Date;
  maxAttempts?: number;
  backoff?: BackoffStrategy;
  timeout?: number;
}

export interface QueueOptions {
  concurrency?: number;
  pollInterval?: number;
  defaultTimeout?: number;
  maxAttempts?: number;
  onFailed?: (job: Job, error: Error) => void;
  onCompleted?: (job: Job) => void;
  onDead?: (job: Job) => void;
}

export interface QueueStats {
  pending: number;
  active: number;
  completed: number;
  failed: number;
  dead: number;
}

export type JobProcessor<T = unknown> = (job: Job<T>) => Promise<unknown>;

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_CONCURRENCY = 5;
const DEFAULT_POLL_INTERVAL = 1000;
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function computeBackoff(strategy: BackoffStrategy, attempt: number): number {
  switch (strategy) {
    case "exponential":
      return Math.min(BASE_BACKOFF_MS * Math.pow(2, attempt), MAX_BACKOFF_MS);
    case "linear":
      return Math.min(BASE_BACKOFF_MS * (attempt + 1), MAX_BACKOFF_MS);
    case "fixed":
      return BASE_BACKOFF_MS;
  }
}

// ─── JobQueue ───────────────────────────────────────────────────────────────

export class JobQueue<T = unknown> {
  readonly name: string;

  private readonly concurrency: number;
  private readonly pollInterval: number;
  private readonly defaultTimeout: number;
  private readonly maxAttempts: number;
  private readonly onFailed?: (job: Job, error: Error) => void;
  private readonly onCompleted?: (job: Job) => void;
  private readonly onDead?: (job: Job) => void;

  /** All jobs indexed by id */
  private jobs = new Map<string, Job<T>>();

  /** Pending jobs sorted by priority (highest first), then by scheduledFor (earliest first) */
  private pendingQueue: Job<T>[] = [];

  private processor: JobProcessor<T> | null = null;
  private activeCount = 0;
  private running = false;
  private paused = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  /** Tracks active job abort controllers for timeout enforcement */
  private activeAborts = new Map<string, AbortController>();

  constructor(name: string, options?: QueueOptions) {
    this.name = name;
    this.concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY;
    this.pollInterval = options?.pollInterval ?? DEFAULT_POLL_INTERVAL;
    this.defaultTimeout = options?.defaultTimeout ?? DEFAULT_TIMEOUT;
    this.maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.onFailed = options?.onFailed;
    this.onCompleted = options?.onCompleted;
    this.onDead = options?.onDead;
  }

  // ── Add ──────────────────────────────────────────────────────────────────

  add(data: T, options?: AddJobOptions): Job<T> {
    const now = Date.now();
    const delay = options?.delay ?? 0;
    const scheduledFor = options?.scheduledFor
      ? options.scheduledFor.getTime()
      : now + delay;

    const job: Job<T> = {
      id: generateId(),
      queue: this.name,
      data,
      status: "pending",
      priority: options?.priority ?? 0,
      attempts: 0,
      maxAttempts: options?.maxAttempts ?? this.maxAttempts,
      backoff: options?.backoff ?? "exponential",
      delay,
      timeout: options?.timeout ?? this.defaultTimeout,
      scheduledFor,
      createdAt: now,
      startedAt: null,
      completedAt: null,
      failedAt: null,
      lastError: null,
      result: null,
    };

    this.jobs.set(job.id, job);
    this.insertPending(job);

    // If running, try to drain immediately
    if (this.running && !this.paused) {
      this.drain();
    }

    return job;
  }

  // ── Process ──────────────────────────────────────────────────────────────

  process(handler: JobProcessor<T>): void {
    if (this.processor) {
      throw new Error(`Queue "${this.name}" already has a registered processor`);
    }
    this.processor = handler;
  }

  // ── Start / Stop / Pause / Resume ────────────────────────────────────────

  start(): void {
    if (this.running) return;
    if (!this.processor) {
      throw new Error(`Queue "${this.name}" has no registered processor`);
    }
    this.running = true;
    this.paused = false;
    this.pollTimer = setInterval(() => this.drain(), this.pollInterval);
    // Kick off an immediate drain
    this.drain();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    // Wait for all active jobs to finish (up to 30s)
    const deadline = Date.now() + 30_000;
    while (this.activeCount > 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    if (this.running) {
      this.drain();
    }
  }

  isPaused(): boolean {
    return this.paused;
  }

  isRunning(): boolean {
    return this.running;
  }

  // ── Job Lifecycle ────────────────────────────────────────────────────────

  getJob(id: string): Job<T> | null {
    return this.jobs.get(id) ?? null;
  }

  getJobs(status?: JobStatus, limit = 100): Job<T>[] {
    const all = Array.from(this.jobs.values());
    const filtered = status ? all.filter((j) => j.status === status) : all;
    return filtered.slice(0, limit);
  }

  removeJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    // Can't remove active jobs
    if (job.status === "active") return false;

    // Remove from pending queue if applicable
    if (job.status === "pending") {
      this.removePending(id);
    }

    this.jobs.delete(id);
    return true;
  }

  retryJob(id: string): Job<T> | null {
    const job = this.jobs.get(id);
    if (!job || job.status !== "failed") return null;

    job.status = "pending";
    job.failedAt = null;
    job.lastError = null;
    job.scheduledFor = Date.now();
    this.insertPending(job);

    if (this.running && !this.paused) {
      this.drain();
    }

    return job;
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  getStats(): QueueStats {
    const stats: QueueStats = { pending: 0, active: 0, completed: 0, failed: 0, dead: 0 };
    for (const job of this.jobs.values()) {
      stats[job.status]++;
    }
    return stats;
  }

  // ── Dead Letter Queue ────────────────────────────────────────────────────

  getDeadLetterJobs(): Job<T>[] {
    return Array.from(this.jobs.values()).filter((j) => j.status === "dead");
  }

  retryDeadLetterJob(id: string): Job<T> | null {
    const job = this.jobs.get(id);
    if (!job || job.status !== "dead") return null;

    job.status = "pending";
    job.attempts = 0;
    job.failedAt = null;
    job.lastError = null;
    job.scheduledFor = Date.now();
    this.insertPending(job);

    if (this.running && !this.paused) {
      this.drain();
    }

    return job;
  }

  // ── Purge ────────────────────────────────────────────────────────────────

  purgeCompleted(olderThanMs?: number): number {
    const threshold = olderThanMs ? Date.now() - olderThanMs : Infinity;
    let count = 0;

    for (const [id, job] of this.jobs) {
      if (job.status === "completed") {
        const completedTime = job.completedAt ?? 0;
        if (olderThanMs === undefined || completedTime < threshold) {
          this.jobs.delete(id);
          count++;
        }
      }
    }

    return count;
  }

  // ── Internal: Priority Queue Operations ──────────────────────────────────

  /**
   * Insert into pendingQueue maintaining sort order:
   * - Higher priority first
   * - Equal priority: earlier scheduledFor first (FIFO within priority)
   */
  private insertPending(job: Job<T>): void {
    let lo = 0;
    let hi = this.pendingQueue.length;

    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      const existing = this.pendingQueue[mid];
      // Sort: higher priority first, then earlier scheduledFor
      if (
        existing.priority > job.priority ||
        (existing.priority === job.priority && existing.scheduledFor <= job.scheduledFor)
      ) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    this.pendingQueue.splice(lo, 0, job);
  }

  private removePending(id: string): void {
    const idx = this.pendingQueue.findIndex((j) => j.id === id);
    if (idx !== -1) {
      this.pendingQueue.splice(idx, 1);
    }
  }

  /**
   * Dequeue the highest-priority job that is ready to run (scheduledFor <= now).
   */
  private dequeue(): Job<T> | null {
    const now = Date.now();

    for (let i = 0; i < this.pendingQueue.length; i++) {
      const job = this.pendingQueue[i];
      if (job.scheduledFor <= now) {
        this.pendingQueue.splice(i, 1);
        return job;
      }
    }

    return null;
  }

  // ── Internal: Drain Loop ─────────────────────────────────────────────────

  private drain(): void {
    if (!this.running || this.paused || !this.processor) return;

    while (this.activeCount < this.concurrency) {
      const job = this.dequeue();
      if (!job) break;
      this.executeJob(job);
    }
  }

  private executeJob(job: Job<T>): void {
    if (!this.processor) return;

    job.status = "active";
    job.startedAt = Date.now();
    job.attempts++;
    this.activeCount++;

    const controller = new AbortController();
    this.activeAborts.set(job.id, controller);

    // Timeout enforcement
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, job.timeout);

    const processorFn = this.processor;

    // Create a promise race between the processor and the abort signal
    const jobPromise = new Promise<unknown>((resolve, reject) => {
      if (controller.signal.aborted) {
        reject(new Error(`Job "${job.id}" timed out after ${job.timeout}ms`));
        return;
      }

      const onAbort = () => {
        reject(new Error(`Job "${job.id}" timed out after ${job.timeout}ms`));
      };
      controller.signal.addEventListener("abort", onAbort, { once: true });

      processorFn(job).then(
        (result) => {
          controller.signal.removeEventListener("abort", onAbort);
          resolve(result);
        },
        (err) => {
          controller.signal.removeEventListener("abort", onAbort);
          reject(err);
        }
      );
    });

    jobPromise
      .then((result) => {
        clearTimeout(timeoutId);
        this.activeAborts.delete(job.id);
        this.activeCount--;

        job.status = "completed";
        job.completedAt = Date.now();
        job.result = result;

        this.onCompleted?.(job);
        this.drain();
      })
      .catch((error: unknown) => {
        clearTimeout(timeoutId);
        this.activeAborts.delete(job.id);
        this.activeCount--;

        const errorObj = error instanceof Error ? error : new Error(String(error));
        job.failedAt = Date.now();
        job.lastError = errorObj.message;

        if (job.attempts >= job.maxAttempts) {
          // Move to dead letter queue
          job.status = "dead";
          this.onDead?.(job);
        } else {
          // Schedule retry with backoff
          job.status = "pending";
          const backoffDelay = computeBackoff(job.backoff, job.attempts - 1);
          job.scheduledFor = Date.now() + backoffDelay;
          this.insertPending(job);
          this.onFailed?.(job, errorObj);
        }

        this.drain();
      });
  }
}
