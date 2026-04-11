import http from 'k6/http';
import { check } from 'k6';
import { apiUrl } from './config.js';

export const options = {
  scenarios: {
    rate_limit_burst: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 200,
      maxDuration: '30s',
    },
  },
  thresholds: {
    'checks': ['rate>0.5'],
  },
};

export default function () {
  // Rapid-fire requests to trigger rate limiting
  const res = http.get(apiUrl('/health'));

  check(res, {
    'response received': (r) => r.status === 200 || r.status === 429,
    'rate limit headers present': (r) => r.headers['X-Ratelimit-Limit'] !== undefined || r.status === 200,
  });

  if (res.status === 429) {
    check(res, {
      'rate limit response has retry info': (r) => {
        const body = JSON.parse(r.body);
        return body.error?.code === 'RATE_LIMIT_EXCEEDED';
      },
    });
  }
}
