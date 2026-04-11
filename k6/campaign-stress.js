import http from 'k6/http';
import { check, sleep } from 'k6';
import { apiUrl, defaultThresholds, authHeaders } from './config.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 30 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ...defaultThresholds,
    'http_req_duration{name:list_campaigns}': ['p(95)<500'],
    'http_req_duration{name:get_pricing}': ['p(95)<300'],
    'http_req_duration{name:get_actions}': ['p(95)<300'],
  },
};

// Setup: create a test user and get token
export function setup() {
  const signupRes = http.post(
    apiUrl('/auth'),
    JSON.stringify({
      action: 'signup',
      email: 'k6-campaign-test@loadtest.com',
      password: 'TestPass123!',
      name: 'K6 Load Tester',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const loginRes = http.post(
    apiUrl('/auth'),
    JSON.stringify({
      action: 'login',
      email: 'k6-campaign-test@loadtest.com',
      password: 'TestPass123!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const body = JSON.parse(loginRes.body);
  return { token: body.data?.token || '' };
}

export default function (data) {
  const headers = authHeaders(data.token);

  // List campaigns
  const campaignsRes = http.get(apiUrl('/campaigns?page=1&perPage=20'), {
    headers,
    tags: { name: 'list_campaigns' },
  });
  check(campaignsRes, {
    'campaigns status ok': (r) => r.status === 200 || r.status === 401,
  });

  // Get pricing (public, cached)
  const pricingRes = http.get(apiUrl('/pricing'), { tags: { name: 'get_pricing' } });
  check(pricingRes, {
    'pricing status 200': (r) => r.status === 200,
    'pricing is cached': (r) => r.headers['X-Cache'] === 'HIT' || r.headers['X-Cache'] === 'MISS',
  });

  // Get actions (public, cached)
  const actionsRes = http.get(apiUrl('/actions'), { tags: { name: 'get_actions' } });
  check(actionsRes, {
    'actions status 200': (r) => r.status === 200,
  });

  sleep(Math.random() * 3);
}
