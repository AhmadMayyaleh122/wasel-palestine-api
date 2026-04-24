import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '1m', target: 30 },    // Ramp up
    { duration: '5m', target: 30 },    // Sustained load for 5 minutes
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.05'],
  },
};

export function setup() {
  const email = `soaktest_${Date.now()}@test.com`;
  const password = 'SoakTest123!';

  http.post(`${BASE_URL}/auth/register`, JSON.stringify({
    email,
    fullName: 'Soak Test User',
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

  // Simulate realistic user flow
  // Step 1: Check health
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { 'health ok': (r) => r.status === 200 }) || errorRate.add(1);
  responseTime.add(healthRes.timings.duration);

  sleep(1);

  // Step 2: Browse checkpoints
  const cpRes = http.get(`${BASE_URL}/checkpoints`);
  check(cpRes, { 'checkpoints ok': (r) => r.status === 200 }) || errorRate.add(1);
  responseTime.add(cpRes.timings.duration);

  sleep(1);

  // Step 3: Browse incidents
  const incRes = http.get(`${BASE_URL}/incidents`);
  check(incRes, { 'incidents ok': (r) => r.status === 200 }) || errorRate.add(1);
  responseTime.add(incRes.timings.duration);

  sleep(1);

  // Step 4: Occasionally submit a report (10% chance)
  if (Math.random() < 0.1) {
    const reportRes = http.post(`${BASE_URL}/reports`, JSON.stringify({
      categoryId: Math.ceil(Math.random() * 8),
      description: `Soak test report VU-${__VU}-${__ITER}`,
      latitude: 32.2211 + (Math.random() * 0.1 - 0.05),
      longitude: 35.2544 + (Math.random() * 0.1 - 0.05),
    }), { headers });
    check(reportRes, { 'report ok': (r) => r.status === 201 || r.status === 200 }) || errorRate.add(1);
    responseTime.add(reportRes.timings.duration);
  }

  sleep(2);
}
