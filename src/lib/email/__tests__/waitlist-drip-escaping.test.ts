/**
 * The day-3 and day-7 waitlist drips interpolate visitor-supplied business
 * name and city. The HTML body must escape them (anyone can sign up a third
 * party's address with injected markup); the plain-text body stays raw.
 */

import { describe, it, expect } from "vitest";
import { day3Template, day7Template, type DripEntry } from "../waitlist-drip";

const hostile: DripEntry = {
  email: "victim@example.com",
  businessName: `AT&T <a href="https://evil.test">Coffee</a>`,
  city: "Fort <Wayne>",
  vertical: "coffee_shops",
  createdAt: "2026-11-01T00:00:00Z",
};

describe("waitlist drip templates — HTML escaping", () => {
  it("day-3 escapes the business name in HTML and keeps text raw", () => {
    const t = day3Template(hostile);
    expect(t.html).toContain("Hi AT&amp;T &lt;a href=&quot;https://evil.test&quot;&gt;Coffee&lt;/a&gt;,");
    expect(t.html).not.toContain(`<a href="https://evil.test">`);
    expect(t.text).toContain(`Hi AT&T <a href="https://evil.test">Coffee</a>,`);
  });

  it("day-7 escapes business name and city in HTML and keeps text raw", () => {
    const t = day7Template(hostile);
    expect(t.html).toContain("Hi AT&amp;T &lt;a href=");
    expect(t.html).toContain("coffee shops in Fort &lt;Wayne&gt; to onboard");
    expect(t.html).not.toContain("<Wayne>");
    expect(t.html).not.toContain(`<a href="https://evil.test">`);
    expect(t.text).toContain("coffee shops in Fort <Wayne> to onboard");
  });

  it("keeps the generic greetings when fields are missing", () => {
    const bare: DripEntry = { email: "a@example.com", vertical: "other", createdAt: "2026-11-01T00:00:00Z" };
    expect(day3Template(bare).html).toContain("<p>Hi there,</p>");
    expect(day7Template(bare).html).toContain("<p>Hi,</p>");
    expect(day7Template(bare).html).toContain("first 10 coffee shops to onboard");
  });
});
