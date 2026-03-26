// ==============================================================================
// Social Perks -- Structured Logging System
//
// JSON-structured logging with levels, timestamps, and request context.
// Outputs to stdout in production; collectable by any log aggregator.
// ==============================================================================

// -- Types --------------------------------------------------------------------

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  [key: string]: unknown;
}

export interface LoggerOptions {
  service?: string;
  minLevel?: LogLevel;
  /** Override output for testing. Default: console.log */
  output?: (entry: LogEntry) => void;
}

// -- Request Context ----------------------------------------------------------

const requestContextStore = new Map<string, Record<string, unknown>>();

export const RequestContext = {
  set(requestId: string, context: Record<string, unknown>): void {
    requestContextStore.set(requestId, context);
  },

  get(requestId: string): Record<string, unknown> | null {
    return requestContextStore.get(requestId) ?? null;
  },

  delete(requestId: string): void {
    requestContextStore.delete(requestId);
  },

  clear(): void {
    requestContextStore.clear();
  },
};

// -- Logger -------------------------------------------------------------------

export class Logger {
  private readonly service: string;
  private readonly minLevel: number;
  private readonly output: (entry: LogEntry) => void;

  constructor(options: LoggerOptions = {}) {
    this.service = options.service ?? "social-perks";
    this.minLevel = LOG_LEVEL_VALUES[options.minLevel ?? "debug"];
    this.output = options.output ?? ((entry) => console.log(JSON.stringify(entry)));
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVEL_VALUES[level] < this.minLevel) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      ...meta,
    };

    this.output(entry);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log("debug", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log("warn", message, meta);
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const errorMeta: Record<string, unknown> = { ...meta };
    if (error instanceof Error) {
      errorMeta.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    this.log("error", message, errorMeta);
  }

  fatal(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const errorMeta: Record<string, unknown> = { ...meta };
    if (error instanceof Error) {
      errorMeta.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    this.log("fatal", message, errorMeta);
  }
}

// -- Axiom Transport ----------------------------------------------------------

/**
 * Batched log transport for Axiom (axiom.co).
 * Buffers log entries and flushes periodically or when batch is full.
 * Falls back to console.log if AXIOM_TOKEN is not set.
 *
 * Set env vars:
 *   AXIOM_TOKEN   — API token from axiom.co
 *   AXIOM_DATASET — Dataset name (default: "social-perks")
 */
class AxiomTransport {
  private buffer: LogEntry[] = [];
  private readonly maxBatchSize = 100;
  private readonly flushIntervalMs = 5_000;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly token: string;
  private readonly dataset: string;
  private readonly baseUrl: string;

  constructor() {
    this.token = process.env.AXIOM_TOKEN ?? "";
    this.dataset = process.env.AXIOM_DATASET ?? "social-perks";
    this.baseUrl = process.env.AXIOM_URL ?? "https://api.axiom.co";

    if (this.token) {
      this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
      // Flush on process exit
      process.on("beforeExit", () => this.flush());
    }
  }

  get isConfigured(): boolean {
    return !!this.token;
  }

  send(entry: LogEntry): void {
    // Always write to stdout for local visibility
    console.log(JSON.stringify(entry));

    if (!this.token) return;

    this.buffer.push(entry);
    if (this.buffer.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0);

    fetch(`${this.baseUrl}/v1/datasets/${this.dataset}/ingest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batch.map((e) => ({ ...e, _time: e.timestamp }))),
    }).catch((err) => {
      console.error(`[Axiom] Flush failed: ${err instanceof Error ? err.message : "unknown"}`);
      // Re-buffer on failure (drop if buffer too large)
      if (this.buffer.length < 1000) {
        this.buffer.unshift(...batch);
      }
    });
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.flush();
  }
}

const axiom = new AxiomTransport();

// -- Default Logger -----------------------------------------------------------

export const logger = new Logger({
  minLevel: (process.env.LOG_LEVEL as LogLevel) ?? "info",
  output: (entry) => axiom.send(entry),
});
