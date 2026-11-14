# Ticketiv Deployment Guide

Ticketiv's web app runs on a **self-hosted Coolify** server as a Docker image,
behind a Cloudflare Tunnel. It is no longer hosted on Vercel. The database,
auth and storage are Supabase (project `radsfmlsjznqvcpogluo`).

- Cutover runbook and routing: [`docs/infra/ticketiv-coolify-cutover-2026-11-12.md`](docs/infra/ticketiv-coolify-cutover-2026-11-12.md)
- Recovery point: [`docs/infra/ticketiv-production-recovery-point.md`](docs/infra/ticketiv-production-recovery-point.md)
- Schema setup: [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md)

## How a release reaches production

1. A pull request runs **CI** (`.github/workflows/ci.yml`): the release gate
   (typecheck, lint, tests, route/permission checks) and the browser smoke.
2. A merge to `main` runs the same jobs, then **Deploy production to Coolify**:
   - syncs the production environment into Coolify's encrypted store
     (Supabase keys, payout encryption key, `CRON_SECRET` read from Supabase
     Vault, Sentry DSN and upload token, `SOURCE_COMMIT`, `DEPLOYMENT_ENV`);
   - turns on BuildKit build secrets so build-only values never land in the
     image;
   - queues a Coolify deployment, which builds the `Dockerfile`. The job does
     not wait for the build; check Coolify for its result.
3. `/api/health` reports the deployed commit (`SOURCE_COMMIT`), so you can
   confirm production runs the merged SHA.

There are no preview deployments. Test UI changes locally (`pnpm dev`) or on
`uat.ticketiv.app`, which also routes to Coolify through the Tunnel and sits
behind Cloudflare Access.

## Environment

- `NEXT_PUBLIC_*` values are inlined into the browser bundle, so Coolify passes
  them at build time and at runtime. Server secrets are runtime-only.
- The `Dockerfile` sets `DEPLOYMENT_ENV=production` and `SOURCE_COMMIT` in both
  the build and the runtime image. The deploy-safety check
  (`lib/deployment-safety.ts`), the Paystack live-key guard, payment
  availability, Sentry's environment and the app version read
  `DEPLOYMENT_ENV`; `/api/health` and the version label read `SOURCE_COMMIT`.
  Leave `DEPLOYMENT_ENV` unset locally.
- See `.env.example` for every variable and where it comes from. Add or rotate
  secrets in Coolify (or in GitHub Actions secrets for values the deploy job
  syncs). See `docs/SECRET_ROTATION.md`.

## Supabase Auth redirects

In **Authentication → URL Configuration**, keep the production and UAT origins
(`https://ticketiv.app`, `https://uat.ticketiv.app`) and `http://localhost:3000`
for local development.

## Webhooks and callbacks

Payment callbacks are generated from `NEXT_PUBLIC_APP_URL`
(e.g. `https://ticketiv.app/api/payments/deltapay/callback`). Check signatures
and provider readiness in Super admin → Integrations before switching a provider
to live money.

## Smoke test a deployment

```bash
scripts/smoke-deployment.sh https://ticketiv.app
```

It checks:

- `GET /` returns `200 text/html`
- `GET /api/health` returns `200 application/json` with the deployed commit
- `GET /api/health/supabase` returns `200 application/json`

Then run an attendee checkout with test keys, scan the ticket, and confirm the
organiser dashboard shows the order. Watch the Coolify container logs, Sentry
and Supabase logs for errors.

## Rollback

Roll back inside Coolify by redeploying a retained known-good image. Vercel is
not a rollback target.

## Troubleshooting

- **401/403 responses**: check Supabase keys and RLS policies. Service role keys
  are server-only.
- **Webhook retries**: check signature validation and that the Coolify
  container responds within the provider's timeout.
- **Build fails on deployment safety**: read the listed issues; production must
  use `NEXT_PUBLIC_APP_URL=https://ticketiv.app`, and live Paystack keys are
  refused outside production.
