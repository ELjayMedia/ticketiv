// Public-path load test (TICK-181) — discovery + search + suggest.
// No auth required; safe against any preview/staging deploy.
//
//   BASE_URL="https://<deploy>" k6 run loadtest/k6-public.js
//
// Fails the run if p95 latency or the error rate breach the thresholds, so it
// doubles as a smoke gate. Tune thresholds against the first baseline.
import http from "k6/http"
import { check, sleep } from "k6"
import { Rate } from "k6/metrics"

const errors = new Rate("path_errors")
const BASE_URL = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/$/, "")

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<800"],
    path_errors: ["rate<0.01"],
  },
}

const SEARCH_TERMS = ["festival", "comedy", "music", "workshop", "live", "art"]

export default function () {
  // Discover home (cacheable RSC).
  const discover = http.get(`${BASE_URL}/`)
  check(discover, { "discover 200": (r) => r.status === 200 }) || errors.add(1)

  // Search suggest (rate-limited 60/60s/IP — keep per-VU rate modest).
  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)]
  const suggest = http.get(`${BASE_URL}/api/search/suggest?q=${encodeURIComponent(term)}`)
  check(suggest, { "suggest ok": (r) => r.status === 200 || r.status === 429 }) || errors.add(1)

  sleep(Math.random() * 2 + 1)
}
