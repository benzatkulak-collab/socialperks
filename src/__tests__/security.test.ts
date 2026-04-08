import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── sanitize.ts ─────────────────────────────────────────────────────────────

import { escapeHtml, sanitizeForTemplate } from '@/lib/security/sanitize';

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('A&B')).toBe('A&amp;B');
  });

  it('escapes less-than', () => {
    expect(escapeHtml('A<B')).toBe('A&lt;B');
  });

  it('escapes greater-than', () => {
    expect(escapeHtml('A>B')).toBe('A&gt;B');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('A"B')).toBe('A&quot;B');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("A'B")).toBe('A&#x27;B');
  });

  it('escapes all 5 HTML entities in a single string', () => {
    expect(escapeHtml('<script>alert("x\'s & y")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&#x27;s &amp; y&quot;)&lt;/script&gt;'
    );
  });

  it('preserves safe strings without HTML entities', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });

  it('handles empty strings', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('handles strings with only entities', () => {
    expect(escapeHtml('&<>\'"')).toBe('&amp;&lt;&gt;&#x27;&quot;');
  });
});

describe('sanitizeForTemplate', () => {
  it('escapes string values in flat objects', () => {
    const result = sanitizeForTemplate({ name: '<b>Bold</b>', count: 5 });
    expect(result.name).toBe('&lt;b&gt;Bold&lt;/b&gt;');
  });

  it('recurses into nested objects', () => {
    const result = sanitizeForTemplate({
      user: { name: '<script>xss</script>', age: 30 },
    });
    expect((result.user as { name: string }).name).toBe(
      '&lt;script&gt;xss&lt;/script&gt;'
    );
  });

  it('does not recurse into arrays (leaves them as-is)', () => {
    const input = { tags: ['<b>one</b>', 'two'] };
    const result = sanitizeForTemplate(input as Record<string, unknown>);
    // Arrays are not recursed into by the current implementation
    expect(result.tags).toEqual(['<b>one</b>', 'two']);
  });

  it('handles non-string values without modification', () => {
    const result = sanitizeForTemplate({ count: 42, active: true, empty: null } as Record<string, unknown>);
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    expect(result.empty).toBe(null);
  });

  it('returns a shallow copy and does not mutate original', () => {
    const original = { name: '<b>test</b>' };
    const result = sanitizeForTemplate(original);
    expect(result).not.toBe(original);
    expect(original.name).toBe('<b>test</b>');
  });
});

// ─── csrf.ts ─────────────────────────────────────────────────────────────────

import { generateCsrfToken, validateCsrfToken } from '@/lib/security/csrf';

describe('CSRF tokens', () => {
  it('generateCsrfToken returns a token with 4 dot-separated parts', () => {
    const token = generateCsrfToken('session-123');
    const parts = token.split('.');
    expect(parts.length).toBe(4);
    // First part is the session ID
    expect(parts[0]).toBe('session-123');
  });

  it('validateCsrfToken succeeds for a freshly generated token', () => {
    const sessionId = 'my-session';
    const token = generateCsrfToken(sessionId);
    expect(validateCsrfToken(token, sessionId)).toBe(true);
  });

  it('validateCsrfToken fails when session ID does not match', () => {
    const token = generateCsrfToken('session-A');
    expect(validateCsrfToken(token, 'session-B')).toBe(false);
  });

  it('validateCsrfToken fails for expired tokens', () => {
    const sessionId = 'session-expire';
    const token = generateCsrfToken(sessionId);

    // Advance time by more than 1 hour (TOKEN_EXPIRY = 60 * 60 * 1000)
    const realDateNow = Date.now;
    Date.now = () => realDateNow() + 61 * 60 * 1000;
    try {
      expect(validateCsrfToken(token, sessionId)).toBe(false);
    } finally {
      Date.now = realDateNow;
    }
  });

  it('validateCsrfToken fails for tampered signatures', () => {
    const sessionId = 'session-tamper';
    const token = generateCsrfToken(sessionId);
    const parts = token.split('.');
    // Tamper with the signature (last part)
    parts[3] = parts[3].replace(/./g, 'a');
    const tampered = parts.join('.');
    expect(validateCsrfToken(tampered, sessionId)).toBe(false);
  });

  it('validateCsrfToken fails for malformed tokens', () => {
    expect(validateCsrfToken('', 'session')).toBe(false);
    expect(validateCsrfToken('only.two.parts', 'session')).toBe(false);
    expect(validateCsrfToken('a.b.c.d.e', 'session')).toBe(false);
  });

  it('validateCsrfToken fails for non-string input', () => {
    expect(validateCsrfToken(null as unknown as string, 'session')).toBe(false);
    expect(validateCsrfToken(undefined as unknown as string, 'session')).toBe(false);
  });
});

// ─── rate-limiter.ts ─────────────────────────────────────────────────────────

import { checkRateLimit, rateLimitHeaders } from '@/lib/security/rate-limiter';

describe('Rate limiter', () => {
  // Use unique IP/endpoint combos to avoid cross-test pollution from the module-level Map

  it('allows requests under the limit', () => {
    const result = checkRateLimit('rl-ip-1', '/test-under', 'strict');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4); // strict: maxRequests=5, first request -> 4 remaining
    expect(result.limit).toBe(5);
  });

  it('blocks requests over the limit', () => {
    const ip = 'rl-ip-block';
    const endpoint = '/test-block';
    // Strict tier: 5 requests per window
    for (let i = 0; i < 5; i++) {
      checkRateLimit(ip, endpoint, 'strict');
    }
    const result = checkRateLimit(ip, endpoint, 'strict');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after window expires', () => {
    const ip = 'rl-ip-reset';
    const endpoint = '/test-reset';

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit(ip, endpoint, 'strict');
    }
    const blocked = checkRateLimit(ip, endpoint, 'strict');
    expect(blocked.allowed).toBe(false);

    // Advance time past the window (60s for strict tier)
    const realDateNow = Date.now;
    Date.now = () => realDateNow() + 61_000;
    try {
      const afterReset = checkRateLimit(ip, endpoint, 'strict');
      expect(afterReset.allowed).toBe(true);
      expect(afterReset.remaining).toBe(4);
    } finally {
      Date.now = realDateNow;
    }
  });

  it('different tiers have different limits', () => {
    const strictResult = checkRateLimit('rl-tier-s', '/tier-test', 'strict');
    expect(strictResult.limit).toBe(5);

    const standardResult = checkRateLimit('rl-tier-std', '/tier-test', 'standard');
    expect(standardResult.limit).toBe(30);

    const relaxedResult = checkRateLimit('rl-tier-r', '/tier-test', 'relaxed');
    expect(relaxedResult.limit).toBe(60);

    const publicResult = checkRateLimit('rl-tier-p', '/tier-test', 'public');
    expect(publicResult.limit).toBe(120);
  });

  it('returns correct remaining count', () => {
    const ip = 'rl-ip-remaining';
    const endpoint = '/test-remaining';

    const r1 = checkRateLimit(ip, endpoint, 'strict');
    expect(r1.remaining).toBe(4);

    const r2 = checkRateLimit(ip, endpoint, 'strict');
    expect(r2.remaining).toBe(3);

    const r3 = checkRateLimit(ip, endpoint, 'strict');
    expect(r3.remaining).toBe(2);
  });

  it('rateLimitHeaders formats correctly', () => {
    const result = checkRateLimit('rl-ip-headers', '/test-headers', 'standard');
    const headers = rateLimitHeaders(result);

    expect(headers['X-RateLimit-Limit']).toBe(result.limit.toString());
    expect(headers['X-RateLimit-Remaining']).toBe(result.remaining.toString());
    expect(headers['X-RateLimit-Reset']).toBe(
      Math.ceil(result.resetAt / 1000).toString()
    );
  });
});

// ─── validate.ts ─────────────────────────────────────────────────────────────

import {
  validateEmail,
  validateId,
  validateString,
  validateNumber,
  validateEnum,
} from '@/lib/security/validate';

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('test@example.com')).toEqual({
      success: true,
      data: 'test@example.com',
    });
    expect(validateEmail('user.name+tag@domain.co')).toEqual({
      success: true,
      data: 'user.name+tag@domain.co',
    });
  });

  it('lowercases and trims emails', () => {
    expect(validateEmail('  TEST@Example.COM  ')).toEqual({
      success: true,
      data: 'test@example.com',
    });
  });

  it('rejects invalid formats', () => {
    expect(validateEmail('not-an-email').success).toBe(false);
    expect(validateEmail('@missing-local.com').success).toBe(false);
    expect(validateEmail('missing@').success).toBe(false);
  });

  it('rejects too-long emails (>254 chars)', () => {
    const longEmail = 'a'.repeat(250) + '@b.co';
    const result = validateEmail(longEmail);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('too long');
    }
  });

  it('rejects non-string values', () => {
    expect(validateEmail(123).success).toBe(false);
    expect(validateEmail(null).success).toBe(false);
    expect(validateEmail(undefined).success).toBe(false);
  });
});

describe('validateId', () => {
  it('accepts valid IDs', () => {
    expect(validateId('abc-123_DEF')).toEqual({ success: true, data: 'abc-123_DEF' });
  });

  it('rejects special characters', () => {
    expect(validateId('id with spaces').success).toBe(false);
    expect(validateId('id@special').success).toBe(false);
    expect(validateId('id<script>').success).toBe(false);
  });

  it('rejects empty strings', () => {
    expect(validateId('').success).toBe(false);
  });

  it('rejects too-long IDs (>100 chars)', () => {
    expect(validateId('a'.repeat(101)).success).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(validateId(42).success).toBe(false);
  });
});

describe('validateString', () => {
  it('trims whitespace', () => {
    const result = validateString('  hello  ', 'field');
    expect(result).toEqual({ success: true, data: 'hello' });
  });

  it('respects min length', () => {
    expect(validateString('ab', 'field', { min: 3 }).success).toBe(false);
    expect(validateString('abc', 'field', { min: 3 }).success).toBe(true);
  });

  it('respects max length', () => {
    expect(validateString('abcdef', 'field', { max: 5 }).success).toBe(false);
    expect(validateString('abcde', 'field', { max: 5 }).success).toBe(true);
  });

  it('rejects non-string values', () => {
    expect(validateString(42, 'field').success).toBe(false);
  });
});

describe('validateNumber', () => {
  it('accepts valid numbers', () => {
    expect(validateNumber(42, 'field')).toEqual({ success: true, data: 42 });
  });

  it('parses numeric strings', () => {
    expect(validateNumber('3.14', 'field')).toEqual({ success: true, data: 3.14 });
  });

  it('respects min bound', () => {
    expect(validateNumber(0, 'field', { min: 1 }).success).toBe(false);
    expect(validateNumber(1, 'field', { min: 1 }).success).toBe(true);
  });

  it('respects max bound', () => {
    expect(validateNumber(11, 'field', { max: 10 }).success).toBe(false);
    expect(validateNumber(10, 'field', { max: 10 }).success).toBe(true);
  });

  it('rejects NaN', () => {
    expect(validateNumber('not-a-number', 'field').success).toBe(false);
    expect(validateNumber(NaN, 'field').success).toBe(false);
  });

  it('rejects non-numeric types', () => {
    expect(validateNumber(null, 'field').success).toBe(false);
    expect(validateNumber(undefined, 'field').success).toBe(false);
    expect(validateNumber(true, 'field').success).toBe(false);
  });
});

describe('validateEnum', () => {
  const colors = ['red', 'green', 'blue'] as const;

  it('accepts valid enum values', () => {
    expect(validateEnum('red', 'color', colors)).toEqual({ success: true, data: 'red' });
    expect(validateEnum('blue', 'color', colors)).toEqual({ success: true, data: 'blue' });
  });

  it('rejects invalid enum values', () => {
    const result = validateEnum('yellow', 'color', colors);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('must be one of');
    }
  });

  it('rejects non-string values', () => {
    expect(validateEnum(42, 'color', colors).success).toBe(false);
  });
});
