import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkDuplicate,
  checkRapidFire,
  checkAccountAge,
  calculateFraudScore,
  getRecommendedAction,
  checkSubmission,
  getUserRiskProfile,
  clearFraudState,
  seedFraudState,
  type FraudSignal,
  type SubmissionInput,
  type UserHistory,
  type CampaignData,
  type SubmissionRecord,
} from '@/lib/fraud-detection';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSubmissionRecord(
  overrides: Partial<SubmissionRecord> = {}
): SubmissionRecord {
  return {
    id: overrides.id ?? `sub-${Math.random().toString(36).slice(2, 8)}`,
    campaignId: overrides.campaignId ?? 'campaign-1',
    businessId: overrides.businessId ?? 'biz-1',
    proofUrl: overrides.proofUrl ?? 'https://instagram.com/p/abc123',
    content: overrides.content,
    submittedAt: overrides.submittedAt ?? new Date().toISOString(),
    status: overrides.status ?? 'approved',
    flagged: overrides.flagged ?? false,
    signals: overrides.signals ?? [],
  };
}

function makeSubmissionInput(
  overrides: Partial<SubmissionInput> = {}
): SubmissionInput {
  return {
    id: overrides.id ?? 'sub-new',
    userId: overrides.userId ?? 'user-1',
    campaignId: overrides.campaignId ?? 'campaign-1',
    businessId: overrides.businessId ?? 'biz-1',
    proofUrl: overrides.proofUrl ?? 'https://instagram.com/p/unique123',
    proofType: overrides.proofType ?? 'url',
    content: overrides.content,
    submittedAt: overrides.submittedAt ?? new Date().toISOString(),
    platformId: overrides.platformId,
    imageSize: overrides.imageSize,
    contentLength: overrides.contentLength,
  };
}

function makeUserHistory(
  overrides: Partial<UserHistory> = {}
): UserHistory {
  return {
    userId: overrides.userId ?? 'user-1',
    accountCreatedAt:
      overrides.accountCreatedAt ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    submissions: overrides.submissions ?? [],
    ownedBusinessIds: overrides.ownedBusinessIds ?? [],
  };
}

function makeCampaignData(
  overrides: Partial<CampaignData> = {}
): CampaignData {
  return {
    campaignId: overrides.campaignId ?? 'campaign-1',
    businessId: overrides.businessId ?? 'biz-1',
    allSubmissions: overrides.allSubmissions ?? [],
  };
}

/** Create a date string N minutes ago from now. */
function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 1000).toISOString();
}

/** Create a date string N days ago from now. */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Fraud Detection Engine', () => {
  beforeEach(() => {
    clearFraudState();
  });

  // ─── checkDuplicate ─────────────────────────────────────────────────────

  describe('checkDuplicate', () => {
    it('returns false when no existing submissions match', () => {
      const result = checkDuplicate('https://instagram.com/p/new123', []);
      expect(result).toBe(false);
    });

    it('returns true when exact URL matches an existing submission', () => {
      const existing = [
        makeSubmissionRecord({ proofUrl: 'https://instagram.com/p/abc123' }),
      ];
      const result = checkDuplicate('https://instagram.com/p/abc123', existing);
      expect(result).toBe(true);
    });

    it('normalizes URLs before comparison (strips tracking params)', () => {
      const existing = [
        makeSubmissionRecord({ proofUrl: 'https://example.com/post/1' }),
      ];
      const result = checkDuplicate(
        'https://example.com/post/1?utm_source=test&utm_medium=social&fbclid=abc',
        existing
      );
      expect(result).toBe(true);
    });

    it('normalizes trailing slashes', () => {
      const existing = [
        makeSubmissionRecord({ proofUrl: 'https://example.com/post/1/' }),
      ];
      const result = checkDuplicate('https://example.com/post/1', existing);
      expect(result).toBe(true);
    });

    it('is case-insensitive for URL comparison', () => {
      const existing = [
        makeSubmissionRecord({ proofUrl: 'https://Example.COM/Post/1' }),
      ];
      const result = checkDuplicate('https://example.com/post/1', existing);
      expect(result).toBe(true);
    });

    it('strips hash fragments before comparison', () => {
      const existing = [
        makeSubmissionRecord({ proofUrl: 'https://example.com/page' }),
      ];
      const result = checkDuplicate(
        'https://example.com/page#section',
        existing
      );
      expect(result).toBe(true);
    });

    it('detects duplicates in the in-memory store after checkSubmission', () => {
      // After a submission is checked, its URL is registered in-memory
      const submission = makeSubmissionInput({
        proofUrl: 'https://twitter.com/status/999',
      });
      const userHistory = makeUserHistory();
      const campaignData = makeCampaignData();
      checkSubmission(submission, userHistory, campaignData);

      // Now a different submission with the same URL should be flagged
      const isDup = checkDuplicate('https://twitter.com/status/999', []);
      expect(isDup).toBe(true);
    });

    it('returns false for different URLs', () => {
      const existing = [
        makeSubmissionRecord({ proofUrl: 'https://example.com/post/1' }),
      ];
      const result = checkDuplicate('https://example.com/post/2', existing);
      expect(result).toBe(false);
    });

    it('handles invalid URLs gracefully', () => {
      const existing = [
        makeSubmissionRecord({ proofUrl: 'not-a-valid-url' }),
      ];
      const result = checkDuplicate('not-a-valid-url', existing);
      expect(result).toBe(true);
    });
  });

  // ─── checkRapidFire ─────────────────────────────────────────────────────

  describe('checkRapidFire', () => {
    it('returns false when there are no recent submissions', () => {
      const result = checkRapidFire('user-1', []);
      expect(result).toBe(false);
    });

    it('returns false when submissions are under the threshold', () => {
      const submissions = Array.from({ length: 4 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-${i}`,
          submittedAt: minutesAgo(i),
        })
      );
      const result = checkRapidFire('user-1', submissions);
      expect(result).toBe(false);
    });

    it('returns true when submissions reach the threshold (5) within the window', () => {
      const submissions = Array.from({ length: 5 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-rapid-${i}`,
          submittedAt: minutesAgo(i), // All within 15 minutes
        })
      );
      const result = checkRapidFire('user-1', submissions);
      expect(result).toBe(true);
    });

    it('does not count submissions outside the time window', () => {
      const submissions = [
        makeSubmissionRecord({ id: 'sub-old-1', submittedAt: minutesAgo(60) }),
        makeSubmissionRecord({ id: 'sub-old-2', submittedAt: minutesAgo(50) }),
        makeSubmissionRecord({ id: 'sub-old-3', submittedAt: minutesAgo(40) }),
        makeSubmissionRecord({ id: 'sub-old-4', submittedAt: minutesAgo(30) }),
        makeSubmissionRecord({ id: 'sub-old-5', submittedAt: minutesAgo(20) }),
      ];
      // Default window is 15 minutes; all submissions are older
      const result = checkRapidFire('user-1', submissions);
      expect(result).toBe(false);
    });

    it('respects custom window parameter', () => {
      const submissions = Array.from({ length: 5 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-custom-${i}`,
          submittedAt: minutesAgo(i + 20), // 20-24 minutes ago
        })
      );
      // Default 15-minute window won't catch them, but 30 minutes will
      expect(checkRapidFire('user-1', submissions, 15)).toBe(false);
      expect(checkRapidFire('user-1', submissions, 30)).toBe(true);
    });

    it('returns true for exactly the threshold count', () => {
      const submissions = Array.from({ length: 5 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-exact-${i}`,
          submittedAt: minutesAgo(1),
        })
      );
      const result = checkRapidFire('user-1', submissions);
      expect(result).toBe(true);
    });
  });

  // ─── checkAccountAge ────────────────────────────────────────────────────

  describe('checkAccountAge', () => {
    it('returns true for accounts younger than the minimum age', () => {
      const createdAt = new Date(
        Date.now() - 1 * 24 * 60 * 60 * 1000
      ).toISOString(); // 1 day old
      expect(checkAccountAge(createdAt)).toBe(true);
    });

    it('returns false for accounts older than the minimum age', () => {
      const createdAt = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000
      ).toISOString(); // 10 days old
      expect(checkAccountAge(createdAt)).toBe(false);
    });

    it('uses 3 days as default minimum age', () => {
      const justUnder3Days = new Date(
        Date.now() - 2.5 * 24 * 60 * 60 * 1000
      ).toISOString();
      const justOver3Days = new Date(
        Date.now() - 3.5 * 24 * 60 * 60 * 1000
      ).toISOString();
      expect(checkAccountAge(justUnder3Days)).toBe(true);
      expect(checkAccountAge(justOver3Days)).toBe(false);
    });

    it('respects custom minAgeDays parameter', () => {
      const fiveDaysAgo = new Date(
        Date.now() - 5 * 24 * 60 * 60 * 1000
      ).toISOString();
      expect(checkAccountAge(fiveDaysAgo, 7)).toBe(true); // 5 < 7
      expect(checkAccountAge(fiveDaysAgo, 3)).toBe(false); // 5 > 3
    });

    it('returns true for accounts created just now', () => {
      expect(checkAccountAge(new Date().toISOString())).toBe(true);
    });

    it('returns false for very old accounts', () => {
      const twoYearsAgo = new Date(
        Date.now() - 730 * 24 * 60 * 60 * 1000
      ).toISOString();
      expect(checkAccountAge(twoYearsAgo)).toBe(false);
    });
  });

  // ─── calculateFraudScore ────────────────────────────────────────────────

  describe('calculateFraudScore', () => {
    it('returns 0 for no signals', () => {
      expect(calculateFraudScore([])).toBe(0);
    });

    it('returns the weight of a single signal', () => {
      // duplicate_submission has weight 40
      expect(calculateFraudScore(['duplicate_submission'])).toBe(40);
    });

    it('sums weights for different signals', () => {
      // duplicate_submission (40) + rapid_fire (25) = 65
      const score = calculateFraudScore([
        'duplicate_submission',
        'rapid_fire',
      ]);
      expect(score).toBe(65);
    });

    it('applies diminishing returns for repeated signals', () => {
      // Two of the same signal: weight * (1 + log2(2) * 0.3) = weight * 1.3
      const singleScore = calculateFraudScore(['rapid_fire']); // 25
      const doubleScore = calculateFraudScore(['rapid_fire', 'rapid_fire']);
      // 25 * (1 + 1 * 0.3) = 25 * 1.3 = 32.5 -> rounded = 33
      expect(doubleScore).toBeGreaterThan(singleScore);
      expect(doubleScore).toBe(33);
    });

    it('caps score at 100', () => {
      // Load up enough signals to exceed 100
      const signals: FraudSignal[] = [
        'self_review', // 50
        'duplicate_submission', // 40
        'engagement_manipulation', // 35
        'suspicious_pattern', // 30
      ];
      const score = calculateFraudScore(signals);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('correctly scores self_review signal at weight 50', () => {
      expect(calculateFraudScore(['self_review'])).toBe(50);
    });

    it('correctly scores low_quality_proof signal at weight 15', () => {
      expect(calculateFraudScore(['low_quality_proof'])).toBe(15);
    });

    it('correctly scores account_age signal at weight 20', () => {
      expect(calculateFraudScore(['account_age'])).toBe(20);
    });

    it('correctly scores copy_paste_content signal at weight 30', () => {
      expect(calculateFraudScore(['copy_paste_content'])).toBe(30);
    });

    it('correctly scores engagement_manipulation signal at weight 35', () => {
      expect(calculateFraudScore(['engagement_manipulation'])).toBe(35);
    });

    it('correctly scores suspicious_pattern signal at weight 30', () => {
      expect(calculateFraudScore(['suspicious_pattern'])).toBe(30);
    });
  });

  // ─── getRecommendedAction ───────────────────────────────────────────────

  describe('getRecommendedAction', () => {
    it('returns auto_approve for score < 20', () => {
      expect(getRecommendedAction(0)).toBe('auto_approve');
      expect(getRecommendedAction(10)).toBe('auto_approve');
      expect(getRecommendedAction(19)).toBe('auto_approve');
    });

    it('returns manual_review for score 20-60', () => {
      expect(getRecommendedAction(20)).toBe('manual_review');
      expect(getRecommendedAction(40)).toBe('manual_review');
      expect(getRecommendedAction(60)).toBe('manual_review');
    });

    it('returns flag for score 61-80', () => {
      expect(getRecommendedAction(61)).toBe('flag');
      expect(getRecommendedAction(70)).toBe('flag');
      expect(getRecommendedAction(80)).toBe('flag');
    });

    it('returns auto_reject for score > 80', () => {
      expect(getRecommendedAction(81)).toBe('auto_reject');
      expect(getRecommendedAction(90)).toBe('auto_reject');
      expect(getRecommendedAction(100)).toBe('auto_reject');
    });

    it('handles boundary values precisely', () => {
      expect(getRecommendedAction(19)).toBe('auto_approve');
      expect(getRecommendedAction(20)).toBe('manual_review');
      expect(getRecommendedAction(60)).toBe('manual_review');
      expect(getRecommendedAction(61)).toBe('flag');
      expect(getRecommendedAction(80)).toBe('flag');
      expect(getRecommendedAction(81)).toBe('auto_reject');
    });
  });

  // ─── checkSubmission ────────────────────────────────────────────────────

  describe('checkSubmission', () => {
    it('returns auto_approve for a clean submission', () => {
      const submission = makeSubmissionInput({
        proofUrl: 'https://instagram.com/p/clean123',
        content: 'This is a genuine review of a great business experience!',
      });
      const userHistory = makeUserHistory();
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.passed).toBe(true);
      expect(result.action).toBe('auto_approve');
      expect(result.score).toBe(0);
      expect(result.signals).toEqual([]);
      expect(result.submissionId).toBe(submission.id);
    });

    it('detects duplicate proof URLs', () => {
      const existingSubmissions = [
        makeSubmissionRecord({ proofUrl: 'https://instagram.com/p/dup123' }),
      ];
      const submission = makeSubmissionInput({
        proofUrl: 'https://instagram.com/p/dup123',
      });
      const userHistory = makeUserHistory();
      const campaignData = makeCampaignData({
        allSubmissions: existingSubmissions,
      });

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).toContain('duplicate_submission');
      expect(result.passed).toBe(false);
    });

    it('detects self-review when user owns the business', () => {
      const submission = makeSubmissionInput({
        businessId: 'biz-owned',
      });
      const userHistory = makeUserHistory({
        ownedBusinessIds: ['biz-owned'],
      });
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).toContain('self_review');
      expect(result.passed).toBe(false);
    });

    it('detects new account risk', () => {
      const submission = makeSubmissionInput();
      const userHistory = makeUserHistory({
        accountCreatedAt: new Date().toISOString(), // brand new account
      });
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).toContain('account_age');
      expect(result.details.some(d => d.includes('days old'))).toBe(true);
    });

    it('detects rapid-fire submissions', () => {
      // Create 5 recent submissions (within 15 minutes)
      const recentSubmissions = Array.from({ length: 5 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-rf-${i}`,
          submittedAt: minutesAgo(i + 1),
        })
      );
      const submission = makeSubmissionInput({ id: 'sub-rf-new' });
      const userHistory = makeUserHistory({ submissions: recentSubmissions });
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).toContain('rapid_fire');
    });

    it('detects low quality proof: small screenshot', () => {
      const submission = makeSubmissionInput({
        proofType: 'screenshot',
        imageSize: { width: 100, height: 100 },
      });
      const userHistory = makeUserHistory();
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).toContain('low_quality_proof');
      expect(result.details.some(d => d.includes('Screenshot too small'))).toBe(
        true
      );
    });

    it('detects low quality proof: short content', () => {
      const submission = makeSubmissionInput({
        content: 'Too short',
      });
      const userHistory = makeUserHistory();
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).toContain('low_quality_proof');
      expect(result.details.some(d => d.includes('Content too short'))).toBe(
        true
      );
    });

    it('detects low quality proof: placeholder URL', () => {
      const submission = makeSubmissionInput({
        proofUrl: 'n/a',
      });
      const userHistory = makeUserHistory();
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).toContain('low_quality_proof');
      expect(
        result.details.some(d => d.includes('invalid or a placeholder'))
      ).toBe(true);
    });

    it('detects low quality proof: very short URL', () => {
      const submission = makeSubmissionInput({
        proofUrl: 'http://',
      });
      const userHistory = makeUserHistory();
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).toContain('low_quality_proof');
    });

    it('detects low quality proof: "test" URL', () => {
      const submission = makeSubmissionInput({
        proofUrl: 'test',
      });
      const userHistory = makeUserHistory();
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).toContain('low_quality_proof');
    });

    it('detects low quality proof via contentLength field', () => {
      const submission = makeSubmissionInput({
        contentLength: 10, // below minimum of 20
      });
      const userHistory = makeUserHistory();
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).toContain('low_quality_proof');
      expect(
        result.details.some(d => d.includes('Content length below minimum'))
      ).toBe(true);
    });

    it('does not flag contentLength of 0 (skipped)', () => {
      const submission = makeSubmissionInput({
        contentLength: 0,
      });
      const userHistory = makeUserHistory();
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      // contentLength of 0 is not flagged because the check requires > 0
      expect(
        result.details.some(d => d.includes('Content length below minimum'))
      ).toBe(false);
    });

    it('does not flag empty content string', () => {
      const submission = makeSubmissionInput({
        content: '', // empty string, length 0 after trim
      });
      const userHistory = makeUserHistory();
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      // Empty content (length 0 after trim) is not flagged for "too short"
      expect(
        result.details.some(d => d.includes('Content too short'))
      ).toBe(false);
    });

    it('detects suspicious pattern: high rejection rate', () => {
      const submissions = Array.from({ length: 6 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-reject-${i}`,
          status: i < 4 ? 'rejected' : 'approved',
          submittedAt: daysAgo(i),
        })
      );
      const submission = makeSubmissionInput({ id: 'sub-pattern-new' });
      const userHistory = makeUserHistory({ submissions });
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).toContain('suspicious_pattern');
      expect(
        result.details.some(d => d.includes('rejection rate'))
      ).toBe(true);
    });

    it('detects suspicious pattern: too many different campaigns in 24h', () => {
      const submissions = Array.from({ length: 11 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-multi-${i}`,
          campaignId: `campaign-${i}`,
          submittedAt: minutesAgo(i * 60), // spread over last 11 hours
        })
      );
      const submission = makeSubmissionInput({ id: 'sub-multi-new' });
      const userHistory = makeUserHistory({ submissions });
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).toContain('suspicious_pattern');
      expect(
        result.details.some(d =>
          d.includes('different campaigns in 24 hours')
        )
      ).toBe(true);
    });

    it('detects suspicious pattern: too many submissions to same campaign', () => {
      const submissions = Array.from({ length: 11 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-same-${i}`,
          campaignId: 'campaign-spam',
          submittedAt: daysAgo(i),
        })
      );
      const submission = makeSubmissionInput({ id: 'sub-same-new' });
      const userHistory = makeUserHistory({ submissions });
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).toContain('suspicious_pattern');
      expect(
        result.details.some(d =>
          d.includes('submissions for a single campaign')
        )
      ).toBe(true);
    });

    it('detects suspicious pattern: machine-like uniform intervals', () => {
      // Create 5 submissions at exactly 10-minute intervals
      const baseTime = Date.now();
      const submissions = Array.from({ length: 5 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-bot-${i}`,
          submittedAt: new Date(baseTime - i * 10 * 60 * 1000).toISOString(),
        })
      );
      const submission = makeSubmissionInput({ id: 'sub-bot-new' });
      const userHistory = makeUserHistory({ submissions });
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      // Uniform intervals should trigger suspicious_pattern
      expect(result.signals).toContain('suspicious_pattern');
      expect(
        result.details.some(d => d.includes('suspiciously uniform'))
      ).toBe(true);
    });

    it('detects engagement manipulation: templated URLs', () => {
      const submissions = Array.from({ length: 6 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-manip-${i}`,
          proofUrl: `https://instagram.com/p/${1000 + i}`,
          submittedAt: daysAgo(i),
        })
      );
      const submission = makeSubmissionInput({ id: 'sub-manip-new' });
      const userHistory = makeUserHistory({ submissions });
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).toContain('engagement_manipulation');
      expect(
        result.details.some(d => d.includes('same pattern'))
      ).toBe(true);
    });

    it('does not flag engagement manipulation for varied URLs', () => {
      const submissions = [
        makeSubmissionRecord({ id: 'sub-v1', proofUrl: 'https://instagram.com/p/abc', submittedAt: daysAgo(1) }),
        makeSubmissionRecord({ id: 'sub-v2', proofUrl: 'https://twitter.com/status/def', submittedAt: daysAgo(2) }),
        makeSubmissionRecord({ id: 'sub-v3', proofUrl: 'https://youtube.com/watch?v=ghi', submittedAt: daysAgo(3) }),
        makeSubmissionRecord({ id: 'sub-v4', proofUrl: 'https://tiktok.com/@user/video/jkl', submittedAt: daysAgo(4) }),
        makeSubmissionRecord({ id: 'sub-v5', proofUrl: 'https://facebook.com/posts/mno', submittedAt: daysAgo(5) }),
      ];
      const submission = makeSubmissionInput({ id: 'sub-varied-new' });
      const userHistory = makeUserHistory({ submissions });
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).not.toContain('engagement_manipulation');
    });

    it('accumulates multiple signals and raises score', () => {
      const submission = makeSubmissionInput({
        businessId: 'biz-owned',
        proofUrl: 'n/a',
        content: 'Short',
        proofType: 'screenshot',
        imageSize: { width: 50, height: 50 },
      });
      const userHistory = makeUserHistory({
        ownedBusinessIds: ['biz-owned'],
        accountCreatedAt: new Date().toISOString(),
      });
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      // Should detect self_review + account_age + low_quality_proof at minimum
      expect(result.signals).toContain('self_review');
      expect(result.signals).toContain('account_age');
      expect(result.signals).toContain('low_quality_proof');
      expect(result.score).toBeGreaterThan(50);
      expect(result.passed).toBe(false);
    });

    it('registers proof URL in memory after check', () => {
      const submission = makeSubmissionInput({
        proofUrl: 'https://example.com/registered',
      });
      const userHistory = makeUserHistory();
      const campaignData = makeCampaignData();

      checkSubmission(submission, userHistory, campaignData);

      // Now checking duplicate should find it
      expect(checkDuplicate('https://example.com/registered', [])).toBe(true);
    });

    it('registers content fingerprint for future copy-paste detection', () => {
      const content =
        'This is a sufficiently long review about an amazing business experience that should be fingerprinted.';

      const submission1 = makeSubmissionInput({
        id: 'sub-fp-1',
        proofUrl: 'https://example.com/fp-1',
        content,
      });
      checkSubmission(submission1, makeUserHistory(), makeCampaignData());

      // Second submission with identical content
      const submission2 = makeSubmissionInput({
        id: 'sub-fp-2',
        proofUrl: 'https://example.com/fp-2',
        content,
      });
      const result = checkSubmission(
        submission2,
        makeUserHistory(),
        makeCampaignData()
      );

      expect(result.signals).toContain('copy_paste_content');
    });

    it('detects near-duplicate content via shingle index', () => {
      const content1 =
        'This is a really amazing review of the wonderful coffee shop experience that I had yesterday morning';

      const submission1 = makeSubmissionInput({
        id: 'sub-shingle-1',
        proofUrl: 'https://example.com/shingle-1',
        content: content1,
      });
      checkSubmission(submission1, makeUserHistory(), makeCampaignData());

      // Slightly different content (but very similar)
      const content2 =
        'This is a really amazing review of the wonderful coffee shop experience that I had yesterday afternoon';

      const submission2 = makeSubmissionInput({
        id: 'sub-shingle-2',
        proofUrl: 'https://example.com/shingle-2',
        content: content2,
      });
      const result = checkSubmission(
        submission2,
        makeUserHistory(),
        makeCampaignData()
      );

      expect(result.signals).toContain('copy_paste_content');
    });

    it('does not flag different content as copy-paste', () => {
      const submission1 = makeSubmissionInput({
        id: 'sub-diff-1',
        proofUrl: 'https://example.com/diff-1',
        content:
          'I absolutely loved the new yoga studio downtown with its peaceful atmosphere.',
      });
      checkSubmission(submission1, makeUserHistory(), makeCampaignData());

      const submission2 = makeSubmissionInput({
        id: 'sub-diff-2',
        proofUrl: 'https://example.com/diff-2',
        content:
          'The mechanic did a fantastic job fixing my brakes and the price was very fair.',
      });
      const result = checkSubmission(
        submission2,
        makeUserHistory(),
        makeCampaignData()
      );

      expect(result.signals).not.toContain('copy_paste_content');
    });

    it('excludes the current submission from rapid-fire user history', () => {
      // The current submission's id should be excluded when filtering user submissions
      const submissions = Array.from({ length: 4 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-exclude-${i}`,
          submittedAt: minutesAgo(i),
        })
      );
      // Add the current submission's id to the history (it should be excluded)
      submissions.push(
        makeSubmissionRecord({
          id: 'sub-current',
          submittedAt: minutesAgo(0),
        })
      );

      const submission = makeSubmissionInput({ id: 'sub-current' });
      const userHistory = makeUserHistory({ submissions });
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      // Only 4 submissions in window (current is excluded), threshold is 5
      expect(result.signals).not.toContain('rapid_fire');
    });

    it('does not flag suspicious pattern for fewer than 3 submissions', () => {
      const submissions = [
        makeSubmissionRecord({
          id: 'sub-few-1',
          status: 'rejected',
          submittedAt: daysAgo(1),
        }),
        makeSubmissionRecord({
          id: 'sub-few-2',
          status: 'rejected',
          submittedAt: daysAgo(2),
        }),
      ];
      const submission = makeSubmissionInput({ id: 'sub-few-new' });
      const userHistory = makeUserHistory({ submissions });
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).not.toContain('suspicious_pattern');
    });

    it('does not flag engagement manipulation for fewer than 5 URLs', () => {
      const submissions = Array.from({ length: 4 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-fewurl-${i}`,
          proofUrl: `https://instagram.com/p/${1000 + i}`,
          submittedAt: daysAgo(i),
        })
      );
      const submission = makeSubmissionInput({ id: 'sub-fewurl-new' });
      const userHistory = makeUserHistory({ submissions });
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).not.toContain('engagement_manipulation');
    });

    it('accepts valid screenshot dimensions', () => {
      const submission = makeSubmissionInput({
        proofType: 'screenshot',
        imageSize: { width: 1920, height: 1080 },
      });
      const userHistory = makeUserHistory();
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      expect(result.signals).not.toContain('low_quality_proof');
    });

    it('does not flag api_verified proof type for dimensions', () => {
      const submission = makeSubmissionInput({
        proofType: 'api_verified',
        imageSize: { width: 50, height: 50 }, // small but not screenshot
      });
      const userHistory = makeUserHistory();
      const campaignData = makeCampaignData();

      const result = checkSubmission(submission, userHistory, campaignData);

      // imageSize check only applies to proofType === 'screenshot'
      expect(
        result.details.some(d => d.includes('Screenshot too small'))
      ).toBe(false);
    });
  });

  // ─── getUserRiskProfile ─────────────────────────────────────────────────

  describe('getUserRiskProfile', () => {
    it('returns neutral profile for user with no submissions', () => {
      const profile = getUserRiskProfile('user-empty', []);

      expect(profile.userId).toBe('user-empty');
      expect(profile.totalSubmissions).toBe(0);
      expect(profile.approvedCount).toBe(0);
      expect(profile.rejectedCount).toBe(0);
      expect(profile.flagCount).toBe(0);
      expect(profile.duplicateCount).toBe(0);
      expect(profile.rapidFireCount).toBe(0);
      expect(profile.avgTimeBetweenSubmissions).toBeNull();
      expect(profile.recentFlagRate).toBe(0);
      expect(profile.trustScore).toBe(50);
      expect(profile.riskLevel).toBe('medium');
    });

    it('assigns low risk to users with high approval rate', () => {
      const submissions = Array.from({ length: 20 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-good-${i}`,
          status: 'approved',
          submittedAt: daysAgo(i),
        })
      );
      const profile = getUserRiskProfile('user-good', submissions);

      expect(profile.riskLevel).toBe('low');
      expect(profile.trustScore).toBeGreaterThanOrEqual(70);
      expect(profile.approvedCount).toBe(20);
    });

    it('assigns high risk or worse to users with high rejection rate', () => {
      const submissions = Array.from({ length: 10 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-bad-${i}`,
          status: 'rejected',
          flagged: true,
          signals: ['duplicate_submission'],
          submittedAt: daysAgo(i),
        })
      );
      const profile = getUserRiskProfile('user-bad', submissions);

      // 10 rejected + 10 flagged + 10 duplicate signals = very low trust
      expect(['high', 'critical']).toContain(profile.riskLevel);
      expect(profile.trustScore).toBeLessThan(45);
      expect(profile.rejectedCount).toBe(10);
    });

    it('counts duplicate and rapid_fire signals correctly', () => {
      const submissions = [
        makeSubmissionRecord({
          id: 'sub-sig-1',
          signals: ['duplicate_submission', 'rapid_fire'],
          submittedAt: daysAgo(1),
        }),
        makeSubmissionRecord({
          id: 'sub-sig-2',
          signals: ['duplicate_submission'],
          submittedAt: daysAgo(2),
        }),
        makeSubmissionRecord({
          id: 'sub-sig-3',
          signals: ['rapid_fire'],
          submittedAt: daysAgo(3),
        }),
      ];
      const profile = getUserRiskProfile('user-signals', submissions);

      expect(profile.duplicateCount).toBe(2);
      expect(profile.rapidFireCount).toBe(2);
    });

    it('calculates average time between submissions', () => {
      const baseTime = Date.now();
      const submissions = [
        makeSubmissionRecord({
          id: 'sub-t1',
          submittedAt: new Date(baseTime - 60 * 60 * 1000).toISOString(), // 60 min ago
        }),
        makeSubmissionRecord({
          id: 'sub-t2',
          submittedAt: new Date(baseTime - 120 * 60 * 1000).toISOString(), // 120 min ago
        }),
        makeSubmissionRecord({
          id: 'sub-t3',
          submittedAt: new Date(baseTime - 180 * 60 * 1000).toISOString(), // 180 min ago
        }),
      ];
      const profile = getUserRiskProfile('user-time', submissions);

      // avg = (60 + 60) / 2 = 60 minutes
      expect(profile.avgTimeBetweenSubmissions).toBeCloseTo(60, 0);
    });

    it('returns null avgTimeBetweenSubmissions for single submission', () => {
      const submissions = [
        makeSubmissionRecord({ id: 'sub-single', submittedAt: daysAgo(1) }),
      ];
      const profile = getUserRiskProfile('user-single', submissions);

      expect(profile.avgTimeBetweenSubmissions).toBeNull();
    });

    it('calculates recent flag rate from last 20 submissions', () => {
      const submissions = Array.from({ length: 20 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-flag-${i}`,
          flagged: i < 10, // first 10 (most recent) flagged
          submittedAt: daysAgo(i),
        })
      );
      const profile = getUserRiskProfile('user-flagrate', submissions);

      expect(profile.recentFlagRate).toBe(0.5); // 10/20
    });

    it('applies account age risk penalty', () => {
      const submissions = Array.from({ length: 5 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-newacct-${i}`,
          status: 'approved',
          submittedAt: daysAgo(i),
        })
      );
      const profileOld = getUserRiskProfile(
        'user-old',
        submissions,
        daysAgo(30)
      );
      const profileNew = getUserRiskProfile(
        'user-new',
        submissions,
        daysAgo(2) // 2 days old, under 7-day threshold
      );

      expect(profileNew.accountAgeRisk).toBe(true);
      expect(profileOld.accountAgeRisk).toBe(false);
      expect(profileNew.trustScore).toBeLessThan(profileOld.trustScore);
    });

    it('does not flag account age when accountCreatedAt is not provided', () => {
      const profile = getUserRiskProfile('user-nodate', []);

      expect(profile.accountAgeRisk).toBe(false);
    });

    it('assigns critical risk for extremely bad users', () => {
      const submissions = Array.from({ length: 10 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-critical-${i}`,
          status: 'rejected',
          flagged: true,
          signals: ['duplicate_submission', 'rapid_fire'],
          submittedAt: daysAgo(i),
        })
      );
      const profile = getUserRiskProfile(
        'user-critical',
        submissions,
        new Date().toISOString() // brand new
      );

      expect(profile.riskLevel).toBe('critical');
      expect(profile.trustScore).toBeLessThan(20);
    });

    it('clamps trustScore between 0 and 100', () => {
      // Very good user
      const goodSubmissions = Array.from({ length: 25 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-clamp-good-${i}`,
          status: 'approved',
          submittedAt: daysAgo(i),
        })
      );
      const goodProfile = getUserRiskProfile('user-clamp-good', goodSubmissions);
      expect(goodProfile.trustScore).toBeLessThanOrEqual(100);
      expect(goodProfile.trustScore).toBeGreaterThanOrEqual(0);

      // Very bad user
      const badSubmissions = Array.from({ length: 25 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-clamp-bad-${i}`,
          status: 'rejected',
          flagged: true,
          signals: ['duplicate_submission', 'rapid_fire'],
          submittedAt: daysAgo(i),
        })
      );
      const badProfile = getUserRiskProfile(
        'user-clamp-bad',
        badSubmissions,
        new Date().toISOString()
      );
      expect(badProfile.trustScore).toBeGreaterThanOrEqual(0);
      expect(badProfile.trustScore).toBeLessThanOrEqual(100);
    });

    it('gives volume bonus for 5+ approved submissions', () => {
      const submissions5 = Array.from({ length: 5 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-vol5-${i}`,
          status: 'approved',
          submittedAt: daysAgo(i),
        })
      );
      const submissions3 = Array.from({ length: 3 }, (_, i) =>
        makeSubmissionRecord({
          id: `sub-vol3-${i}`,
          status: 'approved',
          submittedAt: daysAgo(i),
        })
      );
      const profile5 = getUserRiskProfile('user-vol5', submissions5);
      const profile3 = getUserRiskProfile('user-vol3', submissions3);

      // 5 approved gets +2 bonus, 3 approved doesn't
      expect(profile5.trustScore).toBeGreaterThan(profile3.trustScore);
    });

    it('gives higher volume bonus for 10+ and 20+ approved submissions', () => {
      const make = (n: number) =>
        Array.from({ length: n }, (_, i) =>
          makeSubmissionRecord({
            id: `sub-volN-${n}-${i}`,
            status: 'approved',
            submittedAt: daysAgo(i),
          })
        );
      const profile5 = getUserRiskProfile('user-v5', make(5));
      const profile10 = getUserRiskProfile('user-v10', make(10));
      const profile20 = getUserRiskProfile('user-v20', make(20));

      expect(profile10.trustScore).toBeGreaterThan(profile5.trustScore);
      expect(profile20.trustScore).toBeGreaterThan(profile10.trustScore);
    });
  });

  // ─── clearFraudState ────────────────────────────────────────────────────

  describe('clearFraudState', () => {
    it('clears all in-memory state', () => {
      // Populate state
      const submission = makeSubmissionInput({
        id: 'sub-clear-1',
        proofUrl: 'https://example.com/clear-test',
        content:
          'This is content long enough for fingerprinting and shingle indexing.',
      });
      checkSubmission(submission, makeUserHistory(), makeCampaignData());

      // Verify something is stored
      expect(
        checkDuplicate('https://example.com/clear-test', [])
      ).toBe(true);

      // Clear
      clearFraudState();

      // Now it should not find the duplicate
      expect(
        checkDuplicate('https://example.com/clear-test', [])
      ).toBe(false);
    });
  });

  // ─── seedFraudState ─────────────────────────────────────────────────────

  describe('seedFraudState', () => {
    it('populates the duplicate detection cache from existing records', () => {
      const records = [
        makeSubmissionRecord({
          id: 'seed-1',
          proofUrl: 'https://example.com/seeded-1',
        }),
        makeSubmissionRecord({
          id: 'seed-2',
          proofUrl: 'https://example.com/seeded-2',
        }),
      ];

      seedFraudState(records);

      expect(
        checkDuplicate('https://example.com/seeded-1', [])
      ).toBe(true);
      expect(
        checkDuplicate('https://example.com/seeded-2', [])
      ).toBe(true);
      expect(
        checkDuplicate('https://example.com/not-seeded', [])
      ).toBe(false);
    });

    it('does not duplicate already-known URLs', () => {
      const records = [
        makeSubmissionRecord({
          id: 'seed-dup-1',
          proofUrl: 'https://example.com/same',
        }),
        makeSubmissionRecord({
          id: 'seed-dup-2',
          proofUrl: 'https://example.com/same',
        }),
      ];

      seedFraudState(records);

      // The URL should still be detectable as a duplicate
      expect(checkDuplicate('https://example.com/same', [])).toBe(true);
    });

    it('populates content fingerprints for records with sufficient content', () => {
      const longContent =
        'This is a sufficiently long review about the restaurant that should be fingerprinted for future detection.';
      const records = [
        makeSubmissionRecord({
          id: 'seed-content-1',
          proofUrl: 'https://example.com/seed-content-1',
          content: longContent,
        }),
      ];

      seedFraudState(records);

      // Now a submission with the same content should be flagged
      const submission = makeSubmissionInput({
        id: 'sub-after-seed',
        proofUrl: 'https://example.com/after-seed',
        content: longContent,
      });
      const result = checkSubmission(
        submission,
        makeUserHistory(),
        makeCampaignData()
      );

      expect(result.signals).toContain('copy_paste_content');
    });

    it('skips content fingerprinting for short content', () => {
      const records = [
        makeSubmissionRecord({
          id: 'seed-short',
          proofUrl: 'https://example.com/seed-short',
          content: 'Too short',
        }),
      ];

      seedFraudState(records);

      // Short content should not be fingerprinted, so identical short content won't be flagged
      const submission = makeSubmissionInput({
        id: 'sub-short-after',
        proofUrl: 'https://example.com/short-after',
        content: 'Too short',
      });
      const result = checkSubmission(
        submission,
        makeUserHistory(),
        makeCampaignData()
      );

      expect(result.signals).not.toContain('copy_paste_content');
    });

    it('handles empty array without error', () => {
      expect(() => seedFraudState([])).not.toThrow();
    });
  });

  // ─── Integration / Combined Scenarios ──────────────────────────────────

  describe('Integration scenarios', () => {
    it('scores self_review as high enough for manual_review or worse', () => {
      // self_review has weight 50, which maps to manual_review (20-60)
      const score = calculateFraudScore(['self_review']);
      const action = getRecommendedAction(score);
      expect(action).toBe('manual_review');
    });

    it('scores duplicate + self_review above flag threshold', () => {
      // duplicate_submission (40) + self_review (50) = 90, capped at 90
      const score = calculateFraudScore([
        'duplicate_submission',
        'self_review',
      ]);
      expect(score).toBe(90);
      expect(getRecommendedAction(score)).toBe('auto_reject');
    });

    it('a clean user with many approvals gets low risk and auto_approve', () => {
      // Use varied campaign IDs, varied proof URLs, and irregular spacing
      // to avoid tripping any pattern/manipulation/bot detectors
      const irregularDaysAgo = [5, 7, 12, 14, 19, 23, 28, 35, 41, 50];
      const goodSubmissions = irregularDaysAgo.map((d, i) =>
        makeSubmissionRecord({
          id: `integ-good-${i}`,
          campaignId: `campaign-integ-${i}`,
          proofUrl: `https://platform${i}.com/proof/${i}`,
          status: 'approved',
          submittedAt: daysAgo(d),
        })
      );

      const profile = getUserRiskProfile(
        'integ-user',
        goodSubmissions,
        daysAgo(60)
      );
      expect(profile.riskLevel).toBe('low');

      const submission = makeSubmissionInput({
        id: 'integ-clean',
        proofUrl: 'https://instagram.com/p/integ-clean',
        content: 'This is a genuine and detailed review of a great business!',
      });
      const result = checkSubmission(
        submission,
        makeUserHistory({
          submissions: goodSubmissions,
          accountCreatedAt: daysAgo(60),
        }),
        makeCampaignData()
      );
      expect(result.signals).toEqual([]);
      expect(result.action).toBe('auto_approve');
      expect(result.passed).toBe(true);
    });

    it('submission checked twice with same URL triggers duplicate on second check', () => {
      const submission1 = makeSubmissionInput({
        id: 'integ-dup-1',
        proofUrl: 'https://example.com/integ-dup',
      });
      const result1 = checkSubmission(
        submission1,
        makeUserHistory(),
        makeCampaignData()
      );
      expect(result1.signals).not.toContain('duplicate_submission');

      const submission2 = makeSubmissionInput({
        id: 'integ-dup-2',
        proofUrl: 'https://example.com/integ-dup',
      });
      const result2 = checkSubmission(
        submission2,
        makeUserHistory(),
        makeCampaignData()
      );
      expect(result2.signals).toContain('duplicate_submission');
    });

    it('correctly handles URL normalization across check and seed', () => {
      seedFraudState([
        makeSubmissionRecord({
          id: 'seed-norm',
          proofUrl:
            'https://EXAMPLE.COM/post/1/?utm_source=twitter&ref=abc#top',
        }),
      ]);

      const isDup = checkDuplicate(
        'https://example.com/post/1',
        []
      );
      expect(isDup).toBe(true);
    });
  });
});
