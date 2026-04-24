import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

const reportSubmitDuration = new Trend('report_submit_duration');
const incidentCreateDuration = new Trend('incident_create_duration');
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 30 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    errors: ['rate<0.15'],
  },
};

// Setup: register and login once per VU
export function setup() {
  // Create a test user for write operations
  const email = `writetest_${Date.now()}@test.com`;
  const password = 'WriteTest123!';

  http.post(`${BASE_URL}/auth/register`, JSON.stringify({
    email,
    fullName: 'Write Test User',
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

  // Write 1: Submit a crowdsourced report
  const reportPayload = JSON.stringify({
    categoryId: 1,
    description: `Load test report from VU ${__VU} iteration ${__ITER} - road condition update near checkpoint`,
    latitude: 32.2211 + (Math.random() * 0.1 - 0.05),
    longitude: 35.2544 + (Math.random() * 0.1 - 0.05),
  });

  const reportRes = http.post(`${BASE_URL}/reports`, reportPayload, { headers });
  reportSubmitDuration.add(reportRes.timings.duration);
  check(reportRes, {
    'report: created (201) or accepted': (r) => r.status === 201 || r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Write 2: Create an incident
  const incidentPayload = JSON.stringify({
    categoryId: Math.ceil(Math.random() * 8),
    title: `Load test incident VU-${__VU}-${__ITER}`,
    description: 'Performance test incident - road delay reported during load testing',
    severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
    latitude: 32.2211 + (Math.random() * 0.1 - 0.05),
    longitude: 35.2544 + (Math.random() * 0.1 - 0.05),
  });

  const incidentRes = http.post(`${BASE_URL}/incidents`, incidentPayload, { headers });
  incidentCreateDuration.add(incidentRes.timings.duration);
  check(incidentRes, {
    'incident: created (201) or accepted': (r) => r.status === 201 || r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}
