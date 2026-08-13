# Load tests (TICK-181)

[k6](https://k6.io) scripts for the two hot paths — public discovery/search and
the authenticated checkout + scan flow. Record results in
`docs/loadtest/BASELINE.md`.

## Install
```bash
brew install k6        # or: https://k6.io/docs/get-started/installation/
```

## 1. Public paths (no auth — runnable against any deploy now)
Discovery + search suggestions. Safe to point at a preview/staging URL. The
scenarios run independently: discovery ramps to 50 VUs, while suggestions are
paced at 30 requests/minute so a single load-generator IP stays below the
route's 60 requests/minute limit.
```bash
BASE_URL="https://<staging-or-preview>" k6 run loadtest/k6-public.js
```

## 2. Checkout + scan (needs seeded staging — gated on TICK-181 staging)
Requires the seed (`loadtest/seed.sql`, applied to a Supabase staging branch)
plus a buyer access token and a seeded event/ticket-type id, and a scanner
device token. Never run against production.
```bash
BASE_URL="https://<staging>" \
BUYER_TOKEN="<supabase access_token>" \
EVENT_ID="<seeded event uuid>" \
TICKET_TYPE_ID="<seeded ticket_type uuid>" \
SCANNER_TOKEN="<device session token>" \
k6 run loadtest/k6-checkout.js
```

## Thresholds
Both scripts fail the run (non-zero exit) if endpoint-specific p95 latency or
the error rate exceed the thresholds defined in each file — so they double as
CI smoke gates once a stable staging URL exists. Tune the thresholds against
the first recorded baseline.

## Notes
- The endpoints under test are rate-limited (TICK-177): payments 10/60s/user,
  scanner 120/60s, search/suggest 60/60s/IP. The public suggestion scenario is
  deliberately paced below that shared-IP limit; a 429 fails its check.
- Record dataset size + the commit SHA tested alongside the numbers.
