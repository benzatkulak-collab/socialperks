import { describe, it, expect, beforeEach } from "vitest";
import {
  ContentScanner,
  JurisdictionEngine,
  AuditTrail,
  contentScanner,
  jurisdictionEngine,
  auditTrail,
} from "../index";

// ═══════════════════════════════════════════════════════════════════════════════
// ContentScanner
// ═══════════════════════════════════════════════════════════════════════════════

describe("ContentScanner", () => {
  let scanner: ContentScanner;

  beforeEach(() => {
    scanner = new ContentScanner();
  });

  it("detects #ad disclosure", () => {
    const result = scanner.scan("#ad Love this amazing new coffee from @localcafe! Great latte art.");
    expect(result.hasDisclosure).toBe(true);
    expect(result.disclosureType).toBe("#ad");
  });

  it("detects #sponsored disclosure", () => {
    const result = scanner.scan("This is an amazing product! #sponsored by Acme Corp.");
    expect(result.hasDisclosure).toBe(true);
    expect(result.disclosureType).toBe("#sponsored");
  });

  it("detects 'Paid partnership' disclosure", () => {
    const result = scanner.scan("Paid partnership with BrandX. I love their new product!");
    expect(result.hasDisclosure).toBe(true);
    expect(result.disclosureType).toBe("Paid partnership");
  });

  it("flags missing disclosure when none present", () => {
    const result = scanner.scan("Love this amazing new product! Best thing ever, go buy it now!");
    expect(result.hasDisclosure).toBe(false);
    expect(result.issues.some((i) => i.type === "missing_disclosure")).toBe(true);
  });

  it("gives higher compliance score with disclosure than without", () => {
    const withDisclosure = scanner.scan("#ad Great coffee from @cafe! Highly recommend.");
    const withoutDisclosure = scanner.scan("Great coffee from @cafe! Highly recommend.");

    expect(withDisclosure.complianceScore).toBeGreaterThan(withoutDisclosure.complianceScore);
  });

  it("detects misleading health claims", () => {
    const result = scanner.scan(
      "#ad This supplement cures cancer and prevents heart disease. Clinically proven results!"
    );
    expect(result.misleadingClaims.length).toBeGreaterThan(0);
  });

  it("detects prohibited content references", () => {
    const result = scanner.scan(
      "#ad Buy fake followers and fake reviews to boost your account!"
    );
    expect(result.prohibitedContent.length).toBeGreaterThan(0);
  });

  it("assigns sentiment based on content tone", () => {
    const positive = scanner.scan("#ad Amazing, excellent, love this wonderful product!");
    expect(positive.sentiment).toBe("positive");

    const negative = scanner.scan("#ad Terrible, awful, worst product ever. Total waste.");
    expect(negative.sentiment).toBe("negative");
  });

  it("handles empty content", () => {
    const result = scanner.scan("");
    expect(result.hasDisclosure).toBe(false);
    expect(result.complianceScore).toBe(0);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("detects disclosure position (beginning vs end)", () => {
    const beginning = scanner.scan("#ad This is a great product!");
    expect(beginning.disclosurePosition).toBe("beginning");

    const end = scanner.scan(
      "This is a really long piece of content about how much I love this product and how it changed my life. I would definitely recommend it to anyone looking for quality. #ad"
    );
    expect(end.disclosurePosition).toBe("end");
  });

  it("shared singleton instance works", () => {
    const result = contentScanner.scan("#ad Test content.");
    expect(result.hasDisclosure).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// JurisdictionEngine
// ═══════════════════════════════════════════════════════════════════════════════

describe("JurisdictionEngine", () => {
  let engine: JurisdictionEngine;

  beforeEach(() => {
    engine = new JurisdictionEngine();
  });

  it("returns available jurisdictions", () => {
    const jurisdictions = engine.getAvailableJurisdictions();
    expect(jurisdictions).toContain("US_FTC");
    expect(jurisdictions).toContain("UK_ASA");
  });

  it("returns different rules for US vs UK", () => {
    const usRules = engine.getRules("US_FTC");
    const ukRules = engine.getRules("UK_ASA");

    expect(usRules).not.toBeNull();
    expect(ukRules).not.toBeNull();
    expect(usRules!.jurisdiction).toBe("US_FTC");
    expect(ukRules!.jurisdiction).toBe("UK_ASA");
    // Rules should differ in some way
    expect(usRules!.jurisdiction).not.toBe(ukRules!.jurisdiction);
  });

  it("returns null for unknown jurisdiction", () => {
    expect(engine.getRules("UNKNOWN")).toBeNull();
  });

  it("checkCompliance flags missing disclosure", () => {
    const result = engine.checkCompliance(
      "Great product! Love it! Buy one today!",
      "US_FTC",
      "instagram"
    );
    expect(result.compliant).toBe(false);
    expect(result.issues.some((i) => i.type === "missing_disclosure")).toBe(true);
  });

  it("checkCompliance gives higher score with disclosure", () => {
    const withDisclosure = engine.checkCompliance(
      "#ad Great product! Love it!",
      "US_FTC",
      "instagram"
    );
    const withoutDisclosure = engine.checkCompliance(
      "Great product! Love it!",
      "US_FTC",
      "instagram"
    );

    expect(withDisclosure.score).toBeGreaterThan(withoutDisclosure.score);
  });

  it("injectDisclosure generates platform-specific text", () => {
    const igDisclosure = engine.injectDisclosure("instagram", "US_FTC", "TestBiz");
    expect(igDisclosure).toContain("#ad");
    expect(igDisclosure).toContain("TestBiz");

    const ytDisclosure = engine.injectDisclosure("youtube", "US_FTC", "TestBiz");
    expect(ytDisclosure).toContain("TestBiz");
  });

  it("injectDisclosure generates different text for different jurisdictions", () => {
    const usDisclosure = engine.injectDisclosure("instagram", "US_FTC", "TestBiz");
    const ukDisclosure = engine.injectDisclosure("instagram", "UK_ASA", "TestBiz");

    // They should both contain the business name but differ in format
    expect(usDisclosure).toContain("TestBiz");
    expect(ukDisclosure).toContain("TestBiz");
  });

  it("shared singleton instance works", () => {
    const jurisdictions = jurisdictionEngine.getAvailableJurisdictions();
    expect(jurisdictions.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AuditTrail
// ═══════════════════════════════════════════════════════════════════════════════

describe("AuditTrail", () => {
  let trail: AuditTrail;

  // Use unique IDs per test to avoid cross-test interference from shared module-level store
  const uniquePrefix = `test_${Date.now()}_`;
  let testCounter = 0;
  function uniqueId(base: string) {
    testCounter++;
    return `${uniquePrefix}${base}_${testCounter}`;
  }

  beforeEach(() => {
    trail = new AuditTrail();
  });

  it("record creates an audit record with an ID", () => {
    const scanResult = contentScanner.scan("#ad Great product!");
    const entityId = uniqueId("sub");
    const record = trail.record({
      entityType: "submission",
      entityId,
      businessId: uniqueId("biz"),
      jurisdiction: "US_FTC",
      checkType: "content_scan",
      result: scanResult,
      complianceScore: scanResult.complianceScore,
      passed: scanResult.complianceScore >= 50,
    });

    expect(record.id).toBeTruthy();
    expect(record.entityId).toBe(entityId);
    expect(record.jurisdiction).toBe("US_FTC");
    expect(record.checkType).toBe("content_scan");
    expect(record.reviewedBy).toBe("system");
    expect(record.timestamp).toBeTruthy();
  });

  it("getHistory returns records for a specific entity", () => {
    const scanResult = contentScanner.scan("#ad Test");
    const entityId1 = uniqueId("sub");
    const entityId2 = uniqueId("sub");
    const bizId = uniqueId("biz");

    trail.record({
      entityType: "submission",
      entityId: entityId1,
      businessId: bizId,
      jurisdiction: "US_FTC",
      checkType: "content_scan",
      result: scanResult,
      complianceScore: 80,
      passed: true,
    });

    trail.record({
      entityType: "submission",
      entityId: entityId2,
      businessId: bizId,
      jurisdiction: "US_FTC",
      checkType: "content_scan",
      result: scanResult,
      complianceScore: 60,
      passed: true,
    });

    const history = trail.getHistory(entityId1);
    expect(history.length).toBe(1);
    expect(history[0].entityId).toBe(entityId1);
  });

  it("getHistory filters by businessId", () => {
    const scanResult = contentScanner.scan("#ad Test");
    const entityId = uniqueId("sub");
    const bizId1 = uniqueId("biz");
    const bizId2 = uniqueId("biz");

    trail.record({
      entityType: "submission",
      entityId,
      businessId: bizId1,
      jurisdiction: "US_FTC",
      checkType: "content_scan",
      result: scanResult,
      complianceScore: 80,
      passed: true,
    });

    trail.record({
      entityType: "submission",
      entityId,
      businessId: bizId2,
      jurisdiction: "US_FTC",
      checkType: "content_scan",
      result: scanResult,
      complianceScore: 60,
      passed: true,
    });

    const history = trail.getHistory(entityId, { businessId: bizId1 });
    expect(history.length).toBe(1);
    expect(history[0].businessId).toBe(bizId1);
  });

  it("generateReport produces a report for a business", () => {
    const scanResult = contentScanner.scan("#ad Test");
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const bizId = uniqueId("biz");

    trail.record({
      entityType: "submission",
      entityId: uniqueId("sub"),
      businessId: bizId,
      jurisdiction: "US_FTC",
      checkType: "content_scan",
      result: scanResult,
      complianceScore: 85,
      passed: true,
    });

    trail.record({
      entityType: "submission",
      entityId: uniqueId("sub"),
      businessId: bizId,
      jurisdiction: "US_FTC",
      checkType: "content_scan",
      result: scanResult,
      complianceScore: 40,
      passed: false,
    });

    const report = trail.generateReport(
      bizId,
      oneHourAgo.toISOString(),
      new Date(now.getTime() + 60000).toISOString()
    );

    expect(report.businessId).toBe(bizId);
    expect(report.totalChecks).toBe(2);
    expect(report.passedChecks).toBe(1);
    expect(report.failedChecks).toBe(1);
    expect(report.averageScore).toBeGreaterThan(0);
    expect(report.generatedAt).toBeTruthy();
  });

  it("shared singleton instance works", () => {
    const scanResult = contentScanner.scan("#ad Test");
    const record = auditTrail.record({
      entityType: "campaign",
      entityId: "cmp1",
      businessId: "biz1",
      jurisdiction: "US_FTC",
      checkType: "content_scan",
      result: scanResult,
      complianceScore: 90,
      passed: true,
    });
    expect(record.id).toBeTruthy();
  });
});
