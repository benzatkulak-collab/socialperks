/**
 * Shared k6 configuration for Social Perks load tests.
 */
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const defaultThresholds = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.01'],
};

export const defaultOptions = {
  thresholds: defaultThresholds,
};

export function apiUrl(path) {
  return `${BASE_URL}/api/v1${path}`;
}

export function authHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
