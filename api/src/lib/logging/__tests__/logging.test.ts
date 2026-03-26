import { describe, it, expect, beforeEach } from "vitest";
import { Logger, RequestContext, type LogEntry } from "../index";

// =============================================================================
// Logger
// =============================================================================

describe("Logger", () => {
  let entries: LogEntry[];
  let logger: Logger;

  beforeEach(() => {
    entries = [];
    logger = new Logger({
      service: "test-service",
      output: (entry) => entries.push(entry),
    });
  });

  it("outputs correct JSON structure", () => {
    logger.info("test message");

    expect(entries.length).toBe(1);
    expect(entries[0]).toHaveProperty("level");
    expect(entries[0]).toHaveProperty("message");
    expect(entries[0]).toHaveProperty("timestamp");
    expect(entries[0]).toHaveProperty("service");
  });

  it("includes service name", () => {
    logger.info("hello");
    expect(entries[0].service).toBe("test-service");
  });

  it("includes a valid ISO timestamp", () => {
    logger.info("time check");
    const parsed = new Date(entries[0].timestamp);
    expect(parsed.toISOString()).toBe(entries[0].timestamp);
  });

  describe("log levels", () => {
    it("debug level works", () => {
      logger.debug("debug message");
      expect(entries[0].level).toBe("debug");
      expect(entries[0].message).toBe("debug message");
    });

    it("info level works", () => {
      logger.info("info message");
      expect(entries[0].level).toBe("info");
      expect(entries[0].message).toBe("info message");
    });

    it("warn level works", () => {
      logger.warn("warn message");
      expect(entries[0].level).toBe("warn");
      expect(entries[0].message).toBe("warn message");
    });

    it("error level works", () => {
      logger.error("error message");
      expect(entries[0].level).toBe("error");
      expect(entries[0].message).toBe("error message");
    });

    it("fatal level works", () => {
      logger.fatal("fatal message");
      expect(entries[0].level).toBe("fatal");
      expect(entries[0].message).toBe("fatal message");
    });
  });

  describe("error logging with stack traces", () => {
    it("error includes stack trace when given an Error", () => {
      const err = new Error("something broke");
      logger.error("failure", err);

      expect(entries[0].level).toBe("error");
      const errorData = entries[0].error as Record<string, unknown>;
      expect(errorData).toBeDefined();
      expect(errorData.name).toBe("Error");
      expect(errorData.message).toBe("something broke");
      expect(typeof errorData.stack).toBe("string");
      expect((errorData.stack as string).length).toBeGreaterThan(0);
    });

    it("fatal includes stack trace when given an Error", () => {
      const err = new TypeError("type mismatch");
      logger.fatal("critical failure", err);

      const errorData = entries[0].error as Record<string, unknown>;
      expect(errorData.name).toBe("TypeError");
      expect(errorData.message).toBe("type mismatch");
      expect(typeof errorData.stack).toBe("string");
    });

    it("error without Error object does not include stack", () => {
      logger.error("simple error");
      expect(entries[0].error).toBeUndefined();
    });
  });

  describe("metadata", () => {
    it("passes additional metadata through", () => {
      logger.info("with meta", { requestId: "req_123", userId: "u1" });

      expect(entries[0].requestId).toBe("req_123");
      expect(entries[0].userId).toBe("u1");
    });

    it("error passes additional metadata alongside error data", () => {
      const err = new Error("oops");
      logger.error("with meta", err, { endpoint: "/api/test" });

      expect(entries[0].endpoint).toBe("/api/test");
      expect(entries[0].error).toBeDefined();
    });
  });

  describe("minLevel filtering", () => {
    it("filters out messages below minLevel", () => {
      const warnLogger = new Logger({
        service: "test",
        minLevel: "warn",
        output: (entry) => entries.push(entry),
      });

      warnLogger.debug("should not appear");
      warnLogger.info("should not appear either");
      warnLogger.warn("should appear");
      warnLogger.error("should also appear");

      expect(entries.length).toBe(2);
      expect(entries[0].level).toBe("warn");
      expect(entries[1].level).toBe("error");
    });
  });
});

// =============================================================================
// Request Context
// =============================================================================

describe("RequestContext", () => {
  beforeEach(() => {
    RequestContext.clear();
  });

  it("stores and retrieves request context", () => {
    RequestContext.set("req_1", { userId: "u1", method: "GET" });
    const ctx = RequestContext.get("req_1");

    expect(ctx).not.toBeNull();
    expect(ctx!.userId).toBe("u1");
    expect(ctx!.method).toBe("GET");
  });

  it("returns null for unknown request ID", () => {
    const ctx = RequestContext.get("unknown");
    expect(ctx).toBeNull();
  });

  it("delete removes a context entry", () => {
    RequestContext.set("req_2", { path: "/api" });
    expect(RequestContext.get("req_2")).not.toBeNull();

    RequestContext.delete("req_2");
    expect(RequestContext.get("req_2")).toBeNull();
  });

  it("clear removes all entries", () => {
    RequestContext.set("r1", { a: 1 });
    RequestContext.set("r2", { b: 2 });

    RequestContext.clear();

    expect(RequestContext.get("r1")).toBeNull();
    expect(RequestContext.get("r2")).toBeNull();
  });

  it("overwrites existing context for same request ID", () => {
    RequestContext.set("req_3", { version: 1 });
    RequestContext.set("req_3", { version: 2 });

    const ctx = RequestContext.get("req_3");
    expect(ctx!.version).toBe(2);
  });
});
