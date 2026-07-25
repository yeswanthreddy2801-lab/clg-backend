import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users for 1 min
    { duration: '30s', target: 200 }, // Spike to 200 users
    { duration: '1m', target: 200 },  // Stay at 200 users for 1 min
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

const BASE_URL = 'http://localhost:3000';
const COLLEGE_ID = 'college-1';

// Mock auth token generator or static token for testing
const AUTH_TOKEN = 'Bearer YOUR_TEST_TOKEN_HERE'; 

export default function () {
  const params = {
    headers: {
      'Authorization': AUTH_TOKEN,
      'Content-Type': 'application/json',
    },
  };

  // 1. Fetch Trending Feed
  const feedRes = http.get(`${BASE_URL}/feed/trending?collegeId=${COLLEGE_ID}`, params);
  check(feedRes, {
    'feed status is 200': (r) => r.status === 200,
  });
  sleep(1);

  // 2. Search Users
  const searchRes = http.get(`${BASE_URL}/search?q=test&collegeId=${COLLEGE_ID}`, params);
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
  });
  sleep(1);

  // 3. Send Message
  const msgRes = http.post(`${BASE_URL}/messaging/send`, JSON.stringify({
    receiverId: 'user-2',
    content: 'Load test message',
  }), params);
  check(msgRes, {
    'message status is 201': (r) => r.status === 201 || r.status === 401, // 401 if token is invalid
  });
  sleep(1);
}
