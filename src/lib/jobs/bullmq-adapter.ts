/**
 * BullMQ-backed Job Queue Adapter
 *
 * Implements the same interface as the in-memory JobQueue but backed by BullMQ
 * (Redis). Falls back to the in-memory JobQueue when BullMQ/Redis is unavailable.
 *
 * This adapter maps the existing Job<T> type to BullMQ's Queue + Worker classes.
 */

import {
  JobQueue,
  type Job,
  type JobStatus,
  type JobProcessor,
  type AddJobOptions,
  type QueueOptions,
  type QueueStats,
} from "./queue";

// ─── BullMQ Type Stubs ─────────────────────────────────────────────────────
// Minimal type definitions so this file compiles without BullMQ installed.

interface BullMQJob {
  id?: string;
  data: unknown;
  attemptsMade: number;
  opts: { priority?: number; delay?: number; attempts?: number; backoff?: { type: string; delay: number } };
  name: string;
  progress: number;
  returnvalue: unknown;
  failedReason?: string;
  finishedOn?: number;
  processedOn?: number;
  timestamp: number;
}

interface BullMQQueueInstance {
  add(
    name: string,
    data: unknown,
    opts?: { priority?: number; delay?: number; attempts?: number; backoff?: { type: string; delay: number }; timeout?: number; jobId?: string }
  ): Promise<BullMQJob>;
  getJob(id: string): Promise<BullMQJob | undefined>;
  getJobCounts(...statuses: string[]): Promise<Record<string, number>>;
  getJobs(types: string[], start?: number, end?: number): Promise<BullMQJob[]>;
  close(): Promise<void>;
}

interface BullMQWorkerInstance {
  on(event: string, cb: (...args: unknown[]) => void): void;
  close(): Promise<void>;
}

// ─── Redis Connection Config ────────────────────────────────────────────────

interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest: null;
}

function parseRedisUrl(url: string): RedisConnectionConfig {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || "127.0.0.1",
      port: parseInt(parsed.port, 10) || 6379,
      password: parsed.password || undefined,
      db: parsed.pathname ? parseInt(parsed.pathname.slice(1), 10) || 0 : 0,
      maxRetriesPerRequest: null,
    };
  } catch {
    return { host: "127.0.0.1", port: 6379, maxRetriesPerRequest: null };
  }
}

// ─── BullMQ Adapter ─────────────────────────────────────────────────────────

export class BullMQAdapter<T = unknown> {
  readonly name: string;
  private queue: BullMQQueueInstance | null = null;
  private worker: BullMQWorkerInstance | null = null;
  private fallback: JobQueue<T>;
  private connection: RedisConnectionConfig;
  private concurrency: number;
  private maxAttempts: number;
  private defaultTimeout: number;
  private onFailed?: (job: Job, error: Error) => void;
  private onCompleted?: (job: Job) => void;
  private onDead?: (job: Job) => void;
  private _isBullMQ = false;

  constructor(name: string, redisUrl: string, options?: QueueOptions) {
    this.name = name;
    this.connection = parseRedisUrl(redisUrl);
    this.concurrency = options?.concurrency ?? 5;
    this.maxAttempts = options?.maxAttempts ?? 3;
    this.defaultTimeout = options?.defaultTimeout ?? 30_000;
    this.onFailed = options?.onFailed;
    this.onCompleted = options?.onCompleted;
    this.onDead = options?.onDead;

    // Create in-memory fallback
    this.fallback = new JobQueue<T>(name, options);

    // Try to initialize BullMQ
    this.initBullMQ();
  }

  private initBullMQ(): void {
    try {
      // eslint-disable-next-line no-eval
      const bullmq = eval('require')("bullmq") as {
        Queue: new (name: string, opts: { connection: RedisConnectionConfig }) => BullMQQueueInstance;
        Worker: new (
          name: string,
          processor: (job: BullMQJob) => Promise<unknown>,
          opts: { connection: RedisConnectionConfig; concurrency: number }
        ) => BullMQWorkerInstance;
      };

      this.queue = new bullmq.Queue(this.name, {
        connection: this.connection,
      });

      this._isBullMQ = true;
    } catch {
      // BullMQ not installed — fall through to in-memory
      this._isBullMQ = false;
    }
  }

  get isBullMQ(): boolean {
    return this._isBullMQ;
  }

  // ── Add ──────────────────────────────────────────────────────────────────

  async add(data: T, options?: AddJobOptions): Promise<Job<T>> {
    if (!this._isBullMQ || !this.queue) {
      return this.fallback.add(data, options);
    }

    const jobOpts: {
      priority?: number;
      delay?: number;
      attempts: number;
      backoff: { type: string; delay: number };
      timeout?: number;
    } = {
      priority: options?.priority ?? 0,
      delay: options?.delay ?? 0,
      attempts: options?.maxAttempts ?? this.maxAttempts,
      backoff: {
        type: options?.backoff ?? "exponential",
        delay: 1000,
      },
      timeout: options?.timeout ?? this.defaultTimeout,
    };

    if (options?.scheduledFor) {
      const delay = options.scheduledFor.getTime() - Date.now();
      if (delay > 0) jobOpts.delay = delay;
    }

    const bullJob = await this.queue.add(this.name, data, jobOpts);

    // Map to our Job<T> type
    return this.toBullJob(bullJob, data);
  }

  // ── Process ──────────────────────────────────────────────────────────────

  process(handler: JobProcessor<T>): void {
    if (!this._isBullMQ) {
      this.fallback.process(handler);
      return;
    }

    try {
      // eslint-disable-next-line no-eval
      const bullmq = eval('require')("bullmq") as {
        Queue: new (name: string, opts: { connection: RedisConnectionConfig }) => BullMQQueueInstance;
        Worker: new (
          name: string,
          processor: (job: BullMQJob) => Promise<unknown>,
          opts: { connection: RedisConnectionConfig; concurrency: number }
        ) => BullMQWorkerInstance;
      };

      this.worker = new bullmq.Worker(
        this.name,
        async (bullJob: BullMQJob) => {
          const job = this.toBullJob(bullJob, bullJob.data as T);
          return handler(job);
        },
        {
          connection: this.connection,
          concurrency: this.concurrency,
        }
      );

      // Wire up event handlers
      if (this.onCompleted) {
        const completedHandler = this.onCompleted;
        this.worker.on("completed", (bullJob: unknown) => {
          const bj = bullJob as BullMQJob;
          completedHandler(this.toBullJob(bj, bj.data as T));
        });
      }

      if (this.onFailed) {
        const failedHandler = this.onFailed;
        const maxAtt = this.maxAttempts;
        const deadHandler = this.onDead;
        this.worker.on("failed", (bullJob: unknown, err: unknown) => {
          const bj = bullJob as BullMQJob;
          const job = this.toBullJob(bj, bj.data as T);
          const error = err instanceof Error ? err : new Error(String(err));

          if (bj.attemptsMade >= maxAtt) {
            deadHandler?.(job);
          } else {
            failedHandler(job, error);
          }
        });
      }
    } catch {
      // Fall back to in-memory processing
      this._isBullMQ = false;
      this.fallback.process(handler);
    }
  }

  // ── Get Job ──────────────────────────────────────────────────────────────

  async getJob(id: string): Promise<Job<T> | null> {
    if (!this._isBullMQ || !this.queue) {
      return this.fallback.getJob(id);
    }

    const bullJob = await this.queue.getJob(id);
    if (!bullJob) return null;
    return this.toBullJob(bullJob, bullJob.data as T);
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  async getStats(): Promise<QueueStats> {
    if (!this._isBullMQ || !this.queue) {
      return this.fallback.getStats();
    }

    const counts = await this.queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    );

    return {
      pending: (counts.waiting ?? 0) + (counts.delayed ?? 0),
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      dead: 0, // BullMQ tracks failed; dead requires custom logic
    };
  }

  // ── Dead Letter Jobs ─────────────────────────────────────────────────────

  async getDeadLetterJobs(): Promise<Job<T>[]> {
    if (!this._isBullMQ || !this.queue) {
      return this.fallback.getDeadLetterJobs();
    }

    const failedJobs = await this.queue.getJobs(["failed"], 0, 100);
    return failedJobs
      .filter((j: BullMQJob) => j.attemptsMade >= this.maxAttempts)
      .map((j: BullMQJob) => this.toBullJob(j, j.data as T));
  }

  // ── Start / Stop ─────────────────────────────────────────────────────────

  start(): void {
    if (!this._isBullMQ) {
      this.fallback.start();
    }
    // BullMQ Worker starts processing automatically
  }

  async stop(): Promise<void> {
    if (!this._isBullMQ) {
      await this.fallback.stop();
      return;
    }

    await this.worker?.close();
    await this.queue?.close();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private toBullJob(bullJob: BullMQJob, data: T): Job<T> {
    const status = this.mapStatus(bullJob);
    return {
      id: bullJob.id ?? `bullmq_${Date.now()}`,
      queue: this.name,
      data,
      status,
      priority: bullJob.opts?.priority ?? 0,
      attempts: bullJob.attemptsMade ?? 0,
      maxAttempts: bullJob.opts?.attempts ?? this.maxAttempts,
      backoff: (bullJob.opts?.backoff?.type as "exponential" | "linear" | "fixed") ?? "exponential",
      delay: bullJob.opts?.delay ?? 0,
      timeout: this.defaultTimeout,
      scheduledFor: bullJob.timestamp ?? Date.now(),
      createdAt: bullJob.timestamp ?? Date.now(),
      startedAt: bullJob.processedOn ?? null,
      completedAt: bullJob.finishedOn ?? null,
      failedAt: bullJob.failedReason ? Date.now() : null,
      lastError: bullJob.failedReason ?? null,
      result: bullJob.returnvalue ?? null,
    };
  }

  private mapStatus(bullJob: BullMQJob): JobStatus {
    if (bullJob.finishedOn && !bullJob.failedReason) return "completed";
    if (bullJob.failedReason) {
      if (bullJob.attemptsMade >= this.maxAttempts) return "dead";
      return "failed";
    }
    if (bullJob.processedOn) return "active";
    return "pending";
  }
}
