import { describe, it, expect, beforeEach } from "vitest";
import {
  ConsoleEmailProvider,
  welcomeEmail,
  submissionApprovedEmail,
  passwordResetEmail,
} from "../index";

// =============================================================================
// ConsoleEmailProvider
// =============================================================================

describe("ConsoleEmailProvider", () => {
  let provider: ConsoleEmailProvider;

  beforeEach(() => {
    provider = new ConsoleEmailProvider();
  });

  it("send returns success with a messageId", async () => {
    const result = await provider.send({
      to: "user@test.com",
      subject: "Test",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    expect(result.success).toBe(true);
    expect(typeof result.messageId).toBe("string");
    expect(result.messageId.startsWith("msg_")).toBe(true);
  });

  it("records sent messages", async () => {
    await provider.send({
      to: "a@test.com",
      subject: "First",
      html: "<p>1</p>",
      text: "1",
    });
    await provider.send({
      to: "b@test.com",
      subject: "Second",
      html: "<p>2</p>",
      text: "2",
    });

    expect(provider.sentMessages.length).toBe(2);
    expect(provider.sentMessages[0].to).toBe("a@test.com");
    expect(provider.sentMessages[1].subject).toBe("Second");
  });

  it("generates unique messageIds", async () => {
    const r1 = await provider.send({ to: "a@t.com", subject: "A", html: "", text: "" });
    const r2 = await provider.send({ to: "b@t.com", subject: "B", html: "", text: "" });

    expect(r1.messageId).not.toBe(r2.messageId);
  });
});

// =============================================================================
// Email Templates
// =============================================================================

describe("welcomeEmail", () => {
  it("returns subject, html, and text", () => {
    const template = welcomeEmail("Alice");
    expect(template).toHaveProperty("subject");
    expect(template).toHaveProperty("html");
    expect(template).toHaveProperty("text");
  });

  it("contains the user name in subject", () => {
    const template = welcomeEmail("Bob");
    expect(template.subject).toContain("Bob");
  });

  it("contains the user name in html", () => {
    const template = welcomeEmail("Charlie");
    expect(template.html).toContain("Charlie");
  });

  it("contains the user name in text", () => {
    const template = welcomeEmail("Dana");
    expect(template.text).toContain("Dana");
  });

  it("has proper HTML structure", () => {
    const template = welcomeEmail("Eve");
    expect(template.html).toContain("<html");
    expect(template.html).toContain("<body");
    expect(template.html).toContain("style=");
  });
});

describe("submissionApprovedEmail", () => {
  it("returns subject, html, and text", () => {
    const template = submissionApprovedEmail("Alice", "IG Reel Campaign", "$15 off");
    expect(template).toHaveProperty("subject");
    expect(template).toHaveProperty("html");
    expect(template).toHaveProperty("text");
  });

  it("contains campaign name in subject", () => {
    const template = submissionApprovedEmail("Bob", "Story Tag Promo", "$10");
    expect(template.subject).toContain("Story Tag Promo");
  });

  it("contains perk value in html", () => {
    const template = submissionApprovedEmail("Charlie", "Review Campaign", "$20 off");
    expect(template.html).toContain("$20 off");
  });

  it("contains campaign name in text", () => {
    const template = submissionApprovedEmail("Dana", "Reel Contest", "15% off");
    expect(template.text).toContain("Reel Contest");
  });

  it("contains perk value in text", () => {
    const template = submissionApprovedEmail("Eve", "Contest", "25% discount");
    expect(template.text).toContain("25% discount");
  });

  it("has proper HTML structure with inline styles", () => {
    const template = submissionApprovedEmail("Frank", "Test", "$5");
    expect(template.html).toContain("<html");
    expect(template.html).toContain("<body");
    expect(template.html).toContain("style=");
  });
});

describe("passwordResetEmail", () => {
  it("returns subject, html, and text", () => {
    const template = passwordResetEmail("Alice", "https://example.com/reset/abc123");
    expect(template).toHaveProperty("subject");
    expect(template).toHaveProperty("html");
    expect(template).toHaveProperty("text");
  });

  it("contains reset link in html", () => {
    const link = "https://socialperks.app/reset/token123";
    const template = passwordResetEmail("Bob", link);
    expect(template.html).toContain(link);
  });

  it("contains reset link in text", () => {
    const link = "https://socialperks.app/reset/token456";
    const template = passwordResetEmail("Charlie", link);
    expect(template.text).toContain(link);
  });

  it("contains user name in html", () => {
    const template = passwordResetEmail("Dana", "https://example.com/reset");
    expect(template.html).toContain("Dana");
  });

  it("has proper HTML structure", () => {
    const template = passwordResetEmail("Eve", "https://example.com/reset");
    expect(template.html).toContain("<html");
    expect(template.html).toContain("<body");
    expect(template.html).toContain("style=");
  });
});
