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

// -- Secret / PII redaction ---------------------------------------------------
// Scrubs values whose KEY looks sensitive before anything reaches stdout / a log
// drain. Key-name based (not value-sniffing) so normal fields pass through —
// prevents a careless `logger.info({ body })` from leaking creds/tokens.
const SENSITIVE_KEY = /pass(word|code)?|secret|token|auth(orization)?|api[-_]?key|cookie|credential|bearer|signature|session|otp|\bpin\b|ssn|card(number)?|cvv|private[-_]?key/i;

function redactValue(value: unknown, depth: number): unknown {
  if (value == null || depth > 6) return value;
  if (Array.isArray(value)) return value.map((v) => redactValue(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? "[REDACTED]" : redactValue(v, depth + 1);
    }
    return out;
  }
  return value;
}

function redactMeta(meta: Record<string, unknown>): Record<string, unknown> {
  return redactValue(meta, 0) as Record<string, unknown>;
}

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
      ...(meta ? redactMeta(meta) : {}),
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

// -- Default Logger -----------------------------------------------------------

export const logger = new Logger();
