import http from 'k6/http';
import { check, sleep } from 'k6';
import { apiUrl, defaultThresholds } from './config.js';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // ramp up to 20 VUs
    { duration: '1m', target: 50 },     // stay at 50 VUs
    { duration: '30s', target: 100 },   // spike to 100 VUs
    { duration: '30s', target: 0 },     // ramp down
  ],
  thresholds: {
    ...defaultThresholds,
    'http_req_duration{name:login}': ['p(95)<800'],
    'http_req_duration{name:health}': ['p(95)<100'],
  },
};

export default function () {
  // Health check (public, should be fast)
  const healthRes = http.get(apiUrl('/health'), { tags: { name: 'health' } });
  check(healthRes, {
    'health status 200': (r) => r.status === 200,
    'health response time < 200ms': (r) => r.timings.duration < 200,
  });

  // Login attempt
  const loginRes = http.post(
    apiUrl('/auth'),
    JSON.stringify({
      action: 'login',
      email: `user${__VU}@loadtest.com`,
      password: 'TestPass123!',
    }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } }
  );
  check(loginRes, {
    'login returns response': (r) => r.status === 200 || r.status === 401,
  });

  sleep(Math.random() * 2);
}
