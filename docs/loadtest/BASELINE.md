# Load-test baseline (TICK-181)

Record results from `loadtest/` here. The harness is committed and runnable;
numbers below are filled in once a stable staging URL exists (gated on the
TICK-181 staging branch + Vercel preview).

## How to run
See `loadtest/README.md`. Public paths run against any deploy today; the
checkout + scan script needs the seeded staging branch (`loadtest/seed.sql`).

## Results

| Date | Commit | Target | Scenario | VUs (peak) | p50 | p95 | p99 | error% | notes |
|------|--------|--------|----------|-----------:|----:|----:|----:|------:|-------|
| _pending_ | — | staging | public discover+suggest | 50 | | | | | run `k6-public.js` |
| _pending_ | — | staging | checkout attempt | 5 | | | | | run `k6-checkout.js` |
| _pending_ | — | staging | scanner validate | 30 | | | | | run `k6-checkout.js` |

## Thresholds (current)
- public `http_req_duration` p95 < 800ms, errors < 1%
- checkout attempt p95 < 1500ms
- scanner validate p95 < 600ms, errors < 2%

Re-tune these against the first real baseline, then wire `k6-public.js` as a
post-deploy smoke gate.

## Dataset
Seeded via `loadtest/seed.sql` (1 org, 1 published event, 1 ticket type, quota
100k). Note the real dataset size when recording production-like runs.
