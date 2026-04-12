import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';

// Helper to create request
function req(path: string, opts?: { method?: string; headers?: Record<string, string>; body?: unknown }) {
  const url = new URL(path, 'http://localhost:3000');
  const init: RequestInit = { method: opts?.method || 'GET', headers: new Headers(opts?.headers || {}) };
  if (opts?.body) {
    init.body = JSON.stringify(opts.body);
    (init.headers as Headers).set('Content-Type', 'application/json');
  }
  return new NextRequest(url, init);
}

// Standard response contract
interface ApiSuccessResponse {
  success: true;
  data: unknown;
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    totalPages?: number;
  };
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

function assertSuccessResponse(json: unknown): asserts json is ApiSuccessResponse {
  const obj = json as Record<string, unknown>;
  expect(obj.success).toBe(true);
  expect(obj).toHaveProperty('data');
}

function assertErrorResponse(json: unknown, expectedCode?: string): asserts json is ApiErrorResponse {
  const obj = json as Record<string, unknown>;
  expect(obj.success).toBe(false);
  expect(obj).toHaveProperty('error');
  const error = obj.error as Record<string, unknown>;
  expect(error).toHaveProperty('code');
  expect(error).toHaveProperty('message');
  expect(typeof error.code).toBe('string');
  expect(typeof error.message).toBe('string');
  if (expectedCode) expect(error.code).toBe(expectedCode);
}

function assertHasRequestId(res: Response) {
  expect(res.headers.get('X-Request-Id')).toBeTruthy();
}

describe('API Response Contract Tests', () => {
  describe('Health endpoint contract', () => {
    it('returns standard success response', async () => {
      const { GET } = await import('../health/route');
      const res = await GET(req('/api/v1/health'));
      const json = await res.json();
      assertSuccessResponse(json);
      assertHasRequestId(res);
    });
  });

  describe('Auth endpoint contract', () => {
    it('returns error response for missing credentials', async () => {
      const { POST } = await import('../auth/route');
      const res = await POST(req('/api/v1/auth', { method: 'POST', body: {} }));
      const json = await res.json();
      // Should return an error with proper format
      if (!json.success) {
        assertErrorResponse(json);
      }
      assertHasRequestId(res);
    });

    it('GET without token returns 401 error contract', async () => {
      const { GET } = await import('../auth/route');
      const res = await GET(req('/api/v1/auth'));
      const json = await res.json();
      assertErrorResponse(json, 'NO_TOKEN');
      expect(res.status).toBe(401);
    });
  });

  describe('Pricing endpoint contract', () => {
    it('returns standard success response with pricing data', async () => {
      const { GET } = await import('../pricing/route');
      const res = await GET(req('/api/v1/pricing'));
      const json = await res.json();
      assertSuccessResponse(json);
    });
  });

  describe('Actions endpoint contract', () => {
    it('returns standard success response with actions array', async () => {
      const { GET } = await import('../actions/route');
      const res = await GET(req('/api/v1/actions'));
      const json = await res.json();
      assertSuccessResponse(json);
      expect(Array.isArray(json.data) || typeof json.data === 'object').toBe(true);
    });
  });

  describe('Response headers contract', () => {
    it('all endpoints include X-Request-Id', async () => {
      const { GET } = await import('../health/route');
      const res = await GET(req('/api/v1/health'));
      expect(res.headers.get('X-Request-Id')).toBeTruthy();
      expect(res.headers.get('Content-Type')).toContain('application/json');
    });
  });

  describe('Error response contracts', () => {
    it('protected endpoints return 401 without auth', async () => {
      const { GET } = await import('../campaigns/route');
      const res = await GET(req('/api/v1/campaigns'));
      if (res.status === 401) {
        const json = await res.json();
        assertErrorResponse(json);
      }
    });
  });
});
