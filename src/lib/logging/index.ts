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

// -- Default Logger -----------------------------------------------------------

const minLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

export const logger = new Logger({ minLevel });

// -- Request Logging Helper ---------------------------------------------------

/**
 * Convenience method for logging HTTP request/response pairs.
 * Selects log level based on HTTP status code.
 */
export function logRequest(
  req: { method: string; url: string },
  status: number,
  durationMs: number,
  extra?: Record<string, unknown>,
): void {
  const path = new URL(req.url, "http://localhost").pathname;
  const level: LogLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
  logger[level](`${req.method} ${path} ${status}`, {
    path,
    method: req.method,
    statusCode: status,
    durationMs,
    ...extra,
  });
}

// -- Error Logging Helper -----------------------------------------------------

export interface ErrorContext {
  /** HTTP method (GET, POST, etc.) */
  method?: string;
  /** Request path */
  path?: string;
  /** Authenticated user ID, if available */
  userId?: string;
  /** Additional context fields */
  [key: string]: unknown;
}

/**
 * Structured error logging helper for API route catch blocks.
 *
 * Extracts error name, message, and stack trace from the error object
 * and combines them with request context (method, path, userId).
 *
 * Usage:
 *   catch (e) { logError(e, { method: "POST", path: "/api/v1/campaigns", userId: user?.id }); }
 */
export function logError(
  error: unknown,
  context: ErrorContext = {},
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const meta: Record<string, unknown> = {
    ...context,
    error: {
      name: errorObj.name,
      message: errorObj.message,
      stack: errorObj.stack,
    },
  };

  logger.error(`Error in ${context.method ?? "?"} ${context.path ?? "unknown"}`, undefined, meta);
}
