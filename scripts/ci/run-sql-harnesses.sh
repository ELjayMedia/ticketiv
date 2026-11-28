#!/usr/bin/env bash
# Run every SQL harness in supabase/tests against the isolated verification
# database. Each harness runs in its own transaction and rolls back; a failing
# expectation raises and stops the run. New harnesses are picked up
# automatically — list a file in supabase/tests/.gate-exclude only with a reason.
set -euo pipefail
DB_URL="${1:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
cd "$(dirname "$0")/../.."
exclude="supabase/tests/.gate-exclude"
status=0
for f in supabase/tests/*.sql; do
  name="$(basename "$f")"
  if [ -f "$exclude" ] && grep -qx "$name" <(grep -v '^#' "$exclude" | awk '{print $1}'); then
    echo "skip  $name"
    continue
  fi
  if psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 < "$f" >/tmp/harness-"$name".log 2>&1; then
    echo "pass  $name"
  else
    echo "FAIL  $name"
    tail -20 /tmp/harness-"$name".log
    status=1
  fi
done
exit $status
