#!/usr/bin/env bash
# Smoke-test a Ticketiv deployment using only non-destructive GET requests.
#
# Required probes cover the public app and its infrastructure dependencies.
# Optional fixture probes let release operators exercise a known event/ticket
# without creating orders, mutating inventory, or requiring privileged auth.
#
# Usage:
#   scripts/smoke-deployment.sh https://ticketiv.app
#
# Optional environment variables:
#   SMOKE_EVENT_SLUG=<published-event-slug>
#   SMOKE_TICKET_TOKEN=<non-sensitive UAT capability token>
#
# Exit codes:
#   0 = all required/enabled probes passed
#   1 = one or more probes failed
#   2 = invalid invocation

set -euo pipefail

BASE_URL="${1:-${DEPLOYMENT_URL:-}}"
CONNECT_TIMEOUT_SECONDS="${SMOKE_CONNECT_TIMEOUT_SECONDS:-5}"
MAX_TIME_SECONDS="${SMOKE_MAX_TIME_SECONDS:-15}"
EVENT_SLUG="${SMOKE_EVENT_SLUG:-}"
TICKET_TOKEN="${SMOKE_TICKET_TOKEN:-}"

if [[ -z "${BASE_URL}" ]]; then
  echo "usage: $0 <base-url>" >&2
  exit 2
fi

if [[ ! "${BASE_URL}" =~ ^https?:// ]]; then
  echo "base URL must start with http:// or https://" >&2
  exit 2
fi

BASE_URL="${BASE_URL%/}"
BODY_FILE="$(mktemp)"
trap 'rm -f "${BODY_FILE}"' EXIT

passed=0
failed=0
skipped=0

record_ok() {
  printf 'OK   %s\n' "$1"
  passed=$((passed + 1))
}

record_fail() {
  printf 'FAIL %s\n' "$1" >&2
  failed=$((failed + 1))
}

record_skip() {
  printf 'SKIP %s\n' "$1"
  skipped=$((skipped + 1))
}

request() {
  local url="$1"
  curl \
    --silent \
    --show-error \
    --connect-timeout "${CONNECT_TIMEOUT_SECONDS}" \
    --max-time "${MAX_TIME_SECONDS}" \
    --output "${BODY_FILE}" \
    --write-out '%{http_code}\t%{content_type}\t%{time_total}' \
    "${url}"
}

check_http() {
  local path="$1"
  local expected_status="$2"
  local expected_content_type="$3"
  local label="$4"
  local url="${BASE_URL}${path}"
  local output

  if ! output="$(request "${url}")"; then
    record_fail "${label}: request failed (${url})"
    return
  fi

  local status content_type duration
  IFS=$'\t' read -r status content_type duration <<<"${output}"

  if [[ "${status}" != "${expected_status}" ]]; then
    record_fail "${label}: status=${status}, expected=${expected_status} (${url})"
    head -c 1000 "${BODY_FILE}" >&2 || true
    printf '\n' >&2
    return
  fi

  if [[ -n "${expected_content_type}" && "${content_type}" != *"${expected_content_type}"* ]]; then
    record_fail "${label}: content-type=${content_type}, expected~${expected_content_type} (${url})"
    return
  fi

  record_ok "${label}: ${status} ${content_type} ${duration}s (${url})"
}

check_json_contract() {
  local path="$1"
  local label="$2"
  shift 2
  local url="${BASE_URL}${path}"
  local output

  if ! output="$(request "${url}")"; then
    record_fail "${label}: request failed (${url})"
    return
  fi

  local status content_type duration
  IFS=$'\t' read -r status content_type duration <<<"${output}"

  if [[ "${status}" != "200" ]]; then
    record_fail "${label}: status=${status}, expected=200 (${url})"
    head -c 1000 "${BODY_FILE}" >&2 || true
    printf '\n' >&2
    return
  fi

  if [[ "${content_type}" != *"application/json"* ]]; then
    record_fail "${label}: content-type=${content_type}, expected~application/json (${url})"
    return
  fi

  if ! node - "${BODY_FILE}" "$@" <<'NODE'
const fs = require('node:fs')
const [bodyPath, ...assertions] = process.argv.slice(2)
let body
try {
  body = JSON.parse(fs.readFileSync(bodyPath, 'utf8'))
} catch (error) {
  console.error(`invalid JSON: ${error.message}`)
  process.exit(1)
}
for (const assertion of assertions) {
  const separator = assertion.indexOf('=')
  if (separator < 1) {
    console.error(`invalid assertion: ${assertion}`)
    process.exit(1)
  }
  const key = assertion.slice(0, separator)
  const expectedRaw = assertion.slice(separator + 1)
  const expected = expectedRaw === 'true' ? true : expectedRaw === 'false' ? false : expectedRaw
  if (body[key] !== expected) {
    console.error(`contract mismatch: ${key}=${JSON.stringify(body[key])}, expected=${JSON.stringify(expected)}`)
    process.exit(1)
  }
}
NODE
  then
    record_fail "${label}: JSON contract failed (${url})"
    head -c 1000 "${BODY_FILE}" >&2 || true
    printf '\n' >&2
    return
  fi

  record_ok "${label}: 200 application/json ${duration}s (${url})"
}

printf 'Ticketiv deployment smoke: %s\n' "${BASE_URL}"

# Required, non-destructive production probes.
check_http "/" 200 "text/html" "homepage"
check_http "/login" 200 "text/html" "auth entry"
check_json_contract "/api/health" "app health" "ok=true" "service=ticketiv"
check_json_contract "/api/health/supabase" "supabase health" "ok=true" "configured=true" "adminConfigured=true" "reachable=true"

# Fixture-backed probes are optional because a release must not invent or mutate
# production data just to satisfy smoke testing. Configure stable UAT fixtures
# to enable these checks.
if [[ -n "${EVENT_SLUG}" ]]; then
  check_http "/events/${EVENT_SLUG}" 200 "text/html" "event browse fixture"
  check_http "/events/${EVENT_SLUG}/checkout" 200 "text/html" "checkout page fixture"
else
  record_skip "event browse + checkout fixture (set SMOKE_EVENT_SLUG)"
fi

if [[ -n "${TICKET_TOKEN}" ]]; then
  check_http "/t/${TICKET_TOKEN}" 200 "text/html" "ticket retrieval fixture"
else
  record_skip "ticket retrieval fixture (set SMOKE_TICKET_TOKEN)"
fi

printf '\nSmoke summary: passed=%d failed=%d skipped=%d\n' "${passed}" "${failed}" "${skipped}"

if (( failed > 0 )); then
  cat >&2 <<EOF_ROLLBACK

Deployment smoke failed for ${BASE_URL}.
Do not promote this deployment. Follow the bad-deployment rollback procedure in
  docs/OPERATIONS.md
and inspect Vercel runtime/build logs before retrying the smoke.
EOF_ROLLBACK
  exit 1
fi
