import { describe, it, expect } from "vitest";
import { parseWindow } from "../window";

describe("parseWindow", () => {
  it("refuses to <= from and windows over 31 days", () => {
    expect(parseWindow("2026-11-26T00:00:00Z", "2026-11-26T00:00:00Z").ok).toBe(false);
    expect(parseWindow("2026-11-27T00:00:00Z", "2026-11-26T00:00:00Z").ok).toBe(false);
    expect(parseWindow("2026-10-01T00:00:00Z", "2026-11-02T00:00:00Z").ok).toBe(false);
    expect(parseWindow("2026-11-19T05:00:00Z", "2026-11-26T05:00:00Z").ok).toBe(true);
  });

  it("allows exactly 31 days", () => {
    expect(parseWindow("2026-10-01T00:00:00Z", "2026-11-01T00:00:00Z").ok).toBe(true);
  });

  it("returns the two instants as Dates", () => {
    const r = parseWindow("2026-11-19T05:00:00Z", "2026-11-26T05:00:00Z");
    if (!r.ok) throw new Error("expected ok");
    expect(r.from.toISOString()).toBe("2026-11-19T05:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-11-26T05:00:00.000Z");
  });

  it("refuses missing, malformed and zone-less values", () => {
    expect(parseWindow(null, "2026-11-26T00:00:00Z").ok).toBe(false);
    expect(parseWindow("2026-11-19T00:00:00Z", null).ok).toBe(false);
    expect(parseWindow("yesterday", "2026-11-26T00:00:00Z").ok).toBe(false);
    expect(parseWindow("2026-11-19", "2026-11-26T00:00:00Z").ok).toBe(false);
    expect(parseWindow("2026-11-19T00:00:00", "2026-11-26T00:00:00Z").ok).toBe(false);
    expect(parseWindow("2026-13-45T00:00:00Z", "2026-11-26T00:00:00Z").ok).toBe(false);
  });

  it("accepts offsets", () => {
    expect(parseWindow("2026-11-19T00:00:00-05:00", "2026-11-26T00:00:00-05:00").ok).toBe(true);
  });
});
