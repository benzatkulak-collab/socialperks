import { describe, it, expect, afterEach } from "vitest";
import { submissionLinks } from "../links";

const saved = process.env.NEXT_PUBLIC_SITE_URL;
afterEach(() => {
  if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = saved;
});

describe("submissionLinks", () => {
  it("uses the default base when no env var is set", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(submissionLinks("sub_1")).toEqual({
      console: "https://socialperks.app/admin/submissions?submission=sub_1",
      portal: "https://socialperks.app/dashboard?tab=submissions&submission=sub_1",
    });
  });

  it("strips a trailing slash from the configured base", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.test/";
    expect(submissionLinks("sub_1")).toEqual({
      console: "https://example.test/admin/submissions?submission=sub_1",
      portal: "https://example.test/dashboard?tab=submissions&submission=sub_1",
    });
  });

  it("encodes an id holding &, # or a space", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const l = submissionLinks("a&b#c d");
    expect(l.console).toBe("https://socialperks.app/admin/submissions?submission=a%26b%23c%20d");
    expect(l.portal).toBe("https://socialperks.app/dashboard?tab=submissions&submission=a%26b%23c%20d");
  });
});
