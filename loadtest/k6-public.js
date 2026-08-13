// Public-path load test (TICK-181) — discovery + search suggestions.
// No auth required; safe against any preview/staging deploy.
//
//   BASE_URL="https://<deploy>" k6 run loadtest/k6-public.js
//
// Fails the run if p95 latency or the error rate breach the thresholds, so it
// doubles as a smoke gate. Tune thresholds against the first baseline.
import http from "k6/http"
import { check, sleep } from "k6"
import { Rate, Trend } from "k6/metrics"

const discoverErrors = new Rate("discover_errors")
const discoverLatency = new Trend("discover_ms", true)
const suggestErrors = new Rate("suggest_errors")
const suggestLatency = new Trend("suggest_ms", true)
const BASE_URL = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/$/, "")

export const options = {
  scenarios: {
    discover: {
      executor: "ramping-vus",
      exec: "discover",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 0 },
      ],
    },
    suggest: {
      executor: "constant-arrival-rate",
      exec: "suggest",
      rate: 30,
      timeUnit: "1m",
      duration: "2m",
      preAllocatedVUs: 2,
      maxVUs: 5,
    },
  },
  thresholds: {
    discover_ms: ["p(95)<800"],
    suggest_ms: ["p(95)<800"],
    discover_errors: ["rate<0.01"],
    suggest_errors: ["rate<0.01"],
  },
}

const SEARCH_TERMS = ["festival", "comedy", "music", "workshop", "live", "art"]

export function discover() {
  const response = http.get(`${BASE_URL}/`, { tags: { endpoint: "discover" } })
  discoverLatency.add(response.timings.duration)
  check(response, { "discover 200": (r) => r.status === 200 }) || discoverErrors.add(1)

  sleep(Math.random() * 2 + 1)
}

export function suggest() {
  // Keep this scenario below the route's 60 requests/minute shared-IP limit.
  // A 429 here is a capacity-test failure, not an accepted response.
  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)]
  const response = http.get(
    `${BASE_URL}/api/search/suggest?q=${encodeURIComponent(term)}`,
    { tags: { endpoint: "suggest" } },
  )
  suggestLatency.add(response.timings.duration)
  check(response, { "suggest 200": (r) => r.status === 200 }) || suggestErrors.add(1)
}
