import { describe, it, expect } from "vitest";
import { sanitizeLandingPath } from "@/lib/attribution";

/**
 * The landing path is persisted in a JS-readable 90-day cookie and mirrored
 * into PostHog as both an event property and a person property. Anything
 * credential-shaped that reaches it is leaked to a third party for the
 * lifetime of that profile — so these are security assertions, not cosmetics.
 */
describe("sanitizeLandingPath", () => {
  it("redacts the signed bearer token on a perk magic link", () => {
    const token = "eyJhbGciOiJIUzI1NiJ9.aGVsbG8td29ybGQtdG9rZW4.c2lnbmF0dXJl";
    const out = sanitizeLandingPath(`/perk/${token}`);
    expect(out).toBe("/perk/:redacted");
    expect(out).not.toContain(token);
  });

  it("redacts a referral code", () => {
    expect(sanitizeLandingPath("/ref/ABC123XYZ")).toBe("/ref/:redacted");
    expect(sanitizeLandingPath("/r/ABC123XYZ")).toBe("/r/:redacted");
  });

  it("redacts only the credential segment, keeping the route family", () => {
    // The route family is the part with attribution value — we still want to
    // know the visitor landed on a perk-claim link.
    expect(sanitizeLandingPath("/perk/abc123def456ghi789jkl/claim")).toBe(
      "/perk/:redacted/claim",
    );
  });

  it("redacts high-entropy segments on routes not yet known to carry secrets", () => {
    // Defense in depth: a NEW token-bearing route added later is redacted by
    // default rather than silently leaking until someone updates the list.
    expect(sanitizeLandingPath("/newfeature/a1b2c3d4e5f6g7h8i9j0k1l2")).toBe(
      "/newfeature/:redacted",
    );
  });

  it("leaves ordinary marketing paths untouched", () => {
    for (const p of [
      "/",
      "/pricing",
      "/try",
      "/for/coffee-shops",
      "/best/ugc-tools-for-restaurants",
      "/vs/meta-ads",
      "/blog/how-to-run-a-perk-campaign",
    ]) {
      expect(sanitizeLandingPath(p)).toBe(p);
    }
  });

  it("does not mistake a long hyphenated slug for a secret", () => {
    // Long, but lowercase + hyphenated with no digits — a real slug.
    const slug = "/answers/how-do-i-ask-a-customer-for-an-instagram-post";
    expect(sanitizeLandingPath(slug)).toBe(slug);
  });

  it("caps length so a padded path cannot bloat the cookie", () => {
    expect(sanitizeLandingPath("/a".repeat(400)).length).toBeLessThanOrEqual(200);
  });
});
