#!/usr/bin/env bash
# CI guard: fail if any forbidden demo runtime pattern is found in application code.
# Prevents accidental re-introduction of demo infrastructure post-cleanup (TICK-162).
#
# Patterns checked in app/, components/, lib/ (*.ts / *.tsx / *.js / *.jsx).
# Markdown / SQL / config files are intentionally excluded.

set -euo pipefail

PATTERNS=(
  "@/lib/demo-auth"
  "@/lib/demo-data"
  "DEMO_SESSION"
  "getDemo"
  "demo-user"
  "demo@ticketiv.com"
  "demo_session"
  "ticketiv_demo_session"
)

SEARCH_DIRS=(app components lib)
FAILED=0

for PATTERN in "${PATTERNS[@]}"; do
  MATCHES=$(grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
    "$PATTERN" "${SEARCH_DIRS[@]}" 2>/dev/null || true)
  if [ -n "$MATCHES" ]; then
    echo "FAIL: Forbidden demo pattern '$PATTERN' found:"
    echo "$MATCHES"
    echo ""
    FAILED=1
  fi
done

if [ "$FAILED" -eq 1 ]; then
  echo "Demo-pattern guard failed. Remove all demo infrastructure before merging (TICK-162)."
  exit 1
fi

echo "OK: No demo patterns found."
