import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

const readDuration = new Trend('read_duration');
const writeDuration = new Trend('write_duration');
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2500'],
    errors: ['rate<0.1'],
  },
};

export function setup() {
  const email = `mixedtest_${Date.now()}@test.com`;
  const password = 'MixedTest123!';

  http.post(`${BASE_URL}/auth/register`, JSON.stringify({
    email,
    fullName: 'Mixed Test User',
    password,
  }), { headers: { 'Content-Type': 'application/json' } });

  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email,
    password,
  }), { headers: { 'Content-Type': 'application/json' } });

  const body = JSON.parse(loginRes.body);
  return { token: body.data?.accessToken || body.accessToken || '' };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // 70% Read operations
  if (Math.random() < 0.7) {
    const endpoints = [
      '/incidents',
      '/checkpoints',
      '/incidents/stats',
      '/incidents/high-severity',
      '/health',
    ];
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const res = http.get(`${BASE_URL}${endpoint}`);
    readDuration.add(res.timings.duration);
    check(res, {
      'read: status 200': (r) => r.status === 200,
    }) || errorRate.add(1);
  }
  // 30% Write operations
  else {
    const reportPayload = JSON.stringify({
      categoryId: Math.ceil(Math.random() * 8),
      description: `Mixed workload report VU-${__VU}-${__ITER}`,
      latitude: 32.2211 + (Math.random() * 0.1 - 0.05),
      longitude: 35.2544 + (Math.random() * 0.1 - 0.05),
    });

    const res = http.post(`${BASE_URL}/reports`, reportPayload, { headers });
    writeDuration.add(res.timings.duration);
    check(res, {
      'write: created': (r) => r.status === 201 || r.status === 200,
    }) || errorRate.add(1);
  }

  sleep(0.5 + Math.random());
}
