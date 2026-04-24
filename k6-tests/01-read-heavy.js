import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

// Custom metrics
const incidentListDuration = new Trend('incident_list_duration');
const checkpointListDuration = new Trend('checkpoint_list_duration');
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 50 },    // Stay at 50 users
    { duration: '30s', target: 100 },  // Peak at 100 users
    { duration: '1m', target: 100 },   // Stay at peak
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],   // 95% of requests under 2s
    errors: ['rate<0.1'],                // Error rate below 10%
  },
};

export default function () {
  // Scenario 1: List all incidents (public endpoint)
  const incidentsRes = http.get(`${BASE_URL}/incidents`);
  incidentListDuration.add(incidentsRes.timings.duration);
  check(incidentsRes, {
    'incidents: status 200': (r) => r.status === 200,
    'incidents: has data': (r) => r.body.length > 0,
  }) || errorRate.add(1);

  sleep(0.5);

  // Scenario 2: List all checkpoints (public endpoint)
  const checkpointsRes = http.get(`${BASE_URL}/checkpoints`);
  checkpointListDuration.add(checkpointsRes.timings.duration);
  check(checkpointsRes, {
    'checkpoints: status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(0.5);

  // Scenario 3: Get incident stats
  const statsRes = http.get(`${BASE_URL}/incidents/stats`);
  check(statsRes, {
    'stats: status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(0.5);

  // Scenario 4: Get high-severity incidents
  const highSevRes = http.get(`${BASE_URL}/incidents/high-severity`);
  check(highSevRes, {
    'high-severity: status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(0.5);

  // Scenario 5: Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health: status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}
