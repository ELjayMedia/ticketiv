#!/usr/bin/env bash
# Smoke-test a Ticketiv deployment by hitting the public homepage and the
# unauthenticated JSON health endpoints. Designed for use after a Vercel deploy
# so we can distinguish a healthy app from an auth-redirect intercept.
#
# Usage:
#   scripts/smoke-deployment.sh https://v0-ticketiv.vercel.app

set -euo pipefail

BASE_URL="${1:-${DEPLOYMENT_URL:-}}"

if [[ -z "${BASE_URL}" ]]; then
  echo "usage: $0 <base-url>" >&2
  exit 2
fi

BASE_URL="${BASE_URL%/}"
fail=0

check() {
  local path="$1"
  local expect_status="$2"
  local expect_content_type="$3"
  local url="${BASE_URL}${path}"

  local out
  out=$(curl -sS -o /tmp/smoke-body.$$ -w '%{http_code} %{content_type}' "${url}")
  local status="${out%% *}"
  local content_type="${out#* }"

  if [[ "${status}" != "${expect_status}" ]]; then
    echo "FAIL ${url} status=${status} expected=${expect_status}"
    cat /tmp/smoke-body.$$ >&2 || true
    fail=1
  elif [[ -n "${expect_content_type}" && "${content_type}" != *"${expect_content_type}"* ]]; then
    echo "FAIL ${url} content-type=${content_type} expected~${expect_content_type}"
    fail=1
  else
    echo "OK   ${url} ${status} ${content_type}"
  fi
  rm -f /tmp/smoke-body.$$
}

check "/"                      200 "text/html"
check "/api/health"            200 "application/json"
# Supabase health may return 500 if env is unconfigured; we still require JSON
# so monitors can parse the payload. Treat 200 as the production expectation.
check "/api/health/supabase"   200 "application/json"

exit "${fail}"
