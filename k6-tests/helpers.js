import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

/**
 * Helper: Register + Login to get a JWT token
 */
export function getAuthToken() {
  const uniqueId = `${__VU}-${__ITER}-${Date.now()}`;
  const email = `loadtest_${uniqueId}@test.com`;
  const password = 'TestPass123!';

  // Register
  http.post(`${BASE_URL}/auth/register`, JSON.stringify({
    email: email,
    fullName: `Load Test User ${uniqueId}`,
    password: password,
  }), { headers: { 'Content-Type': 'application/json' } });

  // Login
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: email,
    password: password,
  }), { headers: { 'Content-Type': 'application/json' } });

  const body = JSON.parse(loginRes.body);
  return body.data?.accessToken || body.accessToken || '';
}

/**
 * Helper: Get auth headers
 */
export function authHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
}

export { BASE_URL };
