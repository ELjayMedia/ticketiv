// Authenticated checkout + scan load test (TICK-181).
// GATED: run only against a seeded Supabase staging branch (loadtest/seed.sql)
// — never production. Requires:
//   BASE_URL, BUYER_TOKEN, EVENT_ID, TICKET_TYPE_ID, SCANNER_TOKEN
//
//   BASE_URL=... BUYER_TOKEN=... EVENT_ID=... TICKET_TYPE_ID=... SCANNER_TOKEN=... \
//     k6 run loadtest/k6-checkout.js
//
// Measures the order→payment-attempt path (Paystack init is mocked at the
// provider; we stop at attempt creation to avoid hitting the real gateway) and
// the scanner validate path. Honours the TICK-177 rate limits.
import http from "k6/http"
import { check, sleep } from "k6"
import { Rate, Trend } from "k6/metrics"

const errors = new Rate("path_errors")
const attemptLatency = new Trend("checkout_attempt_ms")
const scanLatency = new Trend("scan_validate_ms")

const BASE_URL = (__ENV.BASE_URL || "").replace(/\/$/, "")
const BUYER_TOKEN = __ENV.BUYER_TOKEN || ""
const EVENT_ID = __ENV.EVENT_ID || ""
const TICKET_TYPE_ID = __ENV.TICKET_TYPE_ID || ""
const SCANNER_TOKEN = __ENV.SCANNER_TOKEN || ""

export const options = {
  scenarios: {
    // Stay under payments 10/60s/user — each iteration is one buyer token, so
    // keep VUs low and pace slow. Raise only with many distinct buyer tokens.
    checkout: { executor: "constant-vus", vus: 5, duration: "1m", exec: "checkout" },
    scan: { executor: "ramping-vus", startVUs: 0, stages: [
      { duration: "20s", target: 30 }, { duration: "40s", target: 30 }, { duration: "10s", target: 0 },
    ], exec: "scan" },
  },
  thresholds: {
    checkout_attempt_ms: ["p(95)<1500"],
    scan_validate_ms: ["p(95)<600"],
    path_errors: ["rate<0.02"],
  },
}

function preflight() {
  if (!BASE_URL || !BUYER_TOKEN || !EVENT_ID || !TICKET_TYPE_ID) {
    throw new Error("Set BASE_URL, BUYER_TOKEN, EVENT_ID, TICKET_TYPE_ID (see loadtest/README.md)")
  }
}
export function setup() { preflight() }

export function checkout() {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${BUYER_TOKEN}` }

  // Create a pending order via the public checkout action's API surface. The
  // exact create-order endpoint may differ per deploy; adjust to your route.
  const orderRes = http.post(`${BASE_URL}/api/orders`, JSON.stringify({
    eventId: EVENT_ID,
    items: [{ ticketTypeId: TICKET_TYPE_ID, quantity: 1 }],
  }), { headers })
  const okOrder = check(orderRes, { "order created": (r) => r.status === 200 || r.status === 201 })
  if (!okOrder) { errors.add(1); sleep(2); return }

  const orderId = (orderRes.json() || {}).orderId || (orderRes.json() || {}).id
  if (!orderId) { errors.add(1); sleep(2); return }

  const t0 = Date.now()
  const attempt = http.post(`${BASE_URL}/api/payments/attempt`, JSON.stringify({ orderId }), { headers })
  attemptLatency.add(Date.now() - t0)
  // 201 = attempt created; 429 = rate-limited (expected at load) — both are
  // "the system behaved", not an error of correctness.
  check(attempt, { "attempt ok/limited": (r) => r.status === 201 || r.status === 429 }) || errors.add(1)
  sleep(6) // respect 10/60s/user
}

export function scan() {
  if (!SCANNER_TOKEN) return
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${SCANNER_TOKEN}` }
  const t0 = Date.now()
  // Invalid code is fine — we're measuring the validate path latency/limits,
  // not a successful admit (which would consume a real ticket).
  const res = http.post(`${BASE_URL}/api/scanner/validate`, JSON.stringify({
    eventId: EVENT_ID,
    code: `LOADTEST-${__VU}-${__ITER}`,
  }), { headers })
  scanLatency.add(Date.now() - t0)
  check(res, { "scan responded": (r) => r.status === 200 || r.status === 404 || r.status === 429 }) || errors.add(1)
  sleep(0.5)
}
