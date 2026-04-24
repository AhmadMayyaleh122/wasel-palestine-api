import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Normal load
    { duration: '10s', target: 200 },   // SPIKE! Sudden jump to 200 users
    { duration: '30s', target: 200 },   // Stay at spike
    { duration: '10s', target: 10 },    // Quick drop back to normal
    { duration: '30s', target: 10 },    // Recovery period
    { duration: '10s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // More lenient for spike test
    errors: ['rate<0.3'],               // Allow higher error rate during spike
  },
};

export default function () {
  // Mix of read endpoints to simulate real traffic during spike
  const endpoints = [
    '/incidents',
    '/checkpoints',
    '/incidents/stats',
    '/health',
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${endpoint}`);

  check(res, {
    'status is 200 or 429 (rate limited)': (r) => r.status === 200 || r.status === 429,
  }) || errorRate.add(1);

  sleep(0.3 + Math.random() * 0.5);
}
