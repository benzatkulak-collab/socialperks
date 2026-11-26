/**
 * Waitlist signup emails must HTML-escape visitor-supplied fields.
 *
 * The confirmation email goes to whatever address was submitted, so an
 * unescaped city lets anyone inject markup (links, images) into a Social
 * Perks email sent to a third party. The admin notice interpolates every
 * field, including the IP from a spoofable header.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const sent: Array<{ to: string; subject: string; html: string; text: string }> = [];

vi.mock("@/lib/email", () => {
  class CapturingProvider {
    async send(message: { to: string; subject: string; html: string; text: string }) {
      sent.push(message);
      return { success: true, messageId: "msg_test" };
    }
  }
  return { ConsoleEmailProvider: CapturingProvider, ResendEmailProvider: CapturingProvider };
});

function signupReq(body: Record<string, unknown>, forwardedFor = "203.0.113.7"): NextRequest {
  return new NextRequest("http://localhost/api/v1/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": forwardedFor },
    body: JSON.stringify(body),
  });
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  sent.length = 0;
  vi.resetModules();
  vi.stubEnv("WAITLIST_NOTIFY_EMAIL", "admin@example.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/v1/waitlist — email HTML escaping", () => {
  it("escapes the city in the confirmation email but keeps the plain text raw", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      signupReq({ email: "victim@example.com", city: `Austin <a href="https://evil.test">x</a>` }),
    );
    expect(res.status).toBe(201);
    await flush();

    const confirm = sent.find((m) => m.to === "victim@example.com");
    expect(confirm).toBeDefined();
    expect(confirm!.html).not.toContain("<a href=");
    expect(confirm!.html).toContain("Austin &lt;a href=&quot;https://evil.test&quot;&gt;x&lt;/a&gt;");
    expect(confirm!.text).toContain(`Austin <a href="https://evil.test">x</a>`);
  });

  it("escapes business name, city, referrer and IP in the admin notice", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      signupReq(
        {
          email: "owner@example.com",
          businessName: "AT&T <b>Coffee</b>",
          city: "Fort <Wayne>",
          referrer: `"><script>alert(1)</script>`,
        },
        "<img src=x>",
      ),
    );
    expect(res.status).toBe(201);
    await flush();

    const admin = sent.find((m) => m.to === "admin@example.com");
    expect(admin).toBeDefined();
    expect(admin!.html).toContain("AT&amp;T &lt;b&gt;Coffee&lt;/b&gt;");
    expect(admin!.html).toContain("Fort &lt;Wayne&gt;");
    expect(admin!.html).toContain("&quot;&gt;&lt;script&gt;");
    expect(admin!.html).toContain("&lt;img src=x&gt;");
    expect(admin!.html).not.toContain("<script>");
    expect(admin!.html).not.toContain("<b>Coffee");
    expect(admin!.html).not.toContain("<img");
  });
});
