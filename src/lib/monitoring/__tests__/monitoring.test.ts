import { describe, it, expect, vi, afterEach } from "vitest";
import { captureError, parseDsn, buildEnvelope } from "../index";

describe("parseDsn", () => {
  it("parses a valid DSN into the envelope ingest URL", () => {
    const p = parseDsn("https://abc123@o42.ingest.sentry.io/55");
    expect(p).not.toBeNull();
    expect(p!.url).toBe(
      "https://o42.ingest.sentry.io/api/55/envelope/?sentry_key=abc123&sentry_version=7",
    );
  });

  it("rejects malformed DSNs", () => {
    expect(parseDsn("not-a-dsn")).toBeNull();
    expect(parseDsn("https://o42.ingest.sentry.io/55")).toBeNull(); // missing public key
    expect(parseDsn("https://key@host/")).toBeNull(); // missing project id
  });
});

describe("buildEnvelope", () => {
  it("produces a 3-part Sentry envelope carrying the error + source tag", () => {
    const { body, eventId } = buildEnvelope(new Error("boom"), "error", {
      source: "test.fn",
      foo: "bar",
    });
    const [hdr, itemHdr, payload] = body.split("\n");
    expect(JSON.parse(hdr).event_id).toBe(eventId);
    expect(JSON.parse(itemHdr)).toEqual({ type: "event" });
    const ev = JSON.parse(payload);
    expect(ev.level).toBe("error");
    expect(ev.exception.values[0].value).toBe("boom");
    expect(ev.tags.source).toBe("test.fn");
    expect(ev.extra.foo).toBe("bar");
  });
});

describe("captureError", () => {
  const origFetch = globalThis.fetch;
  const origDsn = process.env.SENTRY_DSN;
  const origPublicDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  afterEach(() => {
    globalThis.fetch = origFetch;
    if (origDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = origDsn;
    if (origPublicDsn === undefined) delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    else process.env.NEXT_PUBLIC_SENTRY_DSN = origPublicDsn;
    vi.restoreAllMocks();
  });

  it("never throws, even on non-Error input", () => {
    delete process.env.SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    expect(() => captureError("a string")).not.toThrow();
    expect(() => captureError({ weird: true })).not.toThrow();
    expect(() => captureError(null)).not.toThrow();
  });

  it("ships an envelope to Sentry when a DSN is configured", async () => {
    process.env.SENTRY_DSN = "https://k@o1.ingest.sentry.io/9";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    captureError(new Error("kaboom"), { source: "test" });

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/9/envelope/");
    expect(String(init.body)).toContain("kaboom");
  });

  it("does NOT call fetch when no DSN is set (logs only)", async () => {
    delete process.env.SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    captureError(new Error("quiet"));

    await new Promise((r) => setTimeout(r, 10));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
