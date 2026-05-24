# Deployment Guide – Ticketiv

Deploy Ticketiv to Vercel backed by Supabase with confidence. This playbook assumes you have the schema from [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) applied and that your payment providers (DeltaPay, Paystack, Flutterwave) are configured with sandbox and production keys.

## Prerequisites

- GitHub (or GitLab/Bitbucket) repository containing the application code
- Vercel account with permissions to create projects
- Supabase project for each environment (development, staging, production)
- Credentials for at least one supported payment provider

## Step 1 – Prepare Supabase

1. Create separate Supabase projects for staging and production, or use the Supabase CLI to manage environments.
2. Apply the SQL from [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) to each project.
3. Seed reference events if desired so QA testers have data to verify.
4. Configure authentication redirect URLs for each environment domain (see Step 4 below).

## Step 2 – Configure Payment Providers

- **DeltaPay**: Generate public and secret keys, enable webhook delivery, and note the webhook signing secret if provided.
- **Paystack**: Create API keys, enable test mode, and add your callback URL (e.g., `https://<project>.vercel.app/api/orders/paystack`).
- **Flutterwave**: Create public and secret keys, whitelist your domains, and configure event/webhook URLs.

Record all secrets so they can be added to Vercel in the next step.

## Step 3 – Deploy to Vercel

### Option A – Git Integration (Recommended)

1. Push your repository to GitHub.
2. Visit [vercel.com/new](https://vercel.com/new) and import the repository.
3. Choose the **Next.js** preset and confirm the project name.
4. Before the first deploy, open the **Environment Variables** section and add the following for each environment scope you intend to use:

   | Variable | Scope | Source |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | All | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server (Preview/Production) | Supabase service role key |
   | `NEXT_PUBLIC_APP_URL` | All | Vercel deployment domain or custom domain |
   | `DELTAPAY_PUBLIC_KEY` | Relevant envs | DeltaPay dashboard |
   | `DELTAPAY_SECRET_KEY` | Server | DeltaPay dashboard |
   | `PAYSTACK_PUBLIC_KEY` | Relevant envs | Paystack dashboard |
   | `PAYSTACK_SECRET_KEY` | Server | Paystack dashboard |
   | `FLUTTERWAVE_PUBLIC_KEY` | Relevant envs | Flutterwave dashboard |
   | `FLUTTERWAVE_SECRET_KEY` | Server | Flutterwave dashboard |
   | `NODE_ENV` | Optional | Set automatically by Vercel but can be overridden |

5. Trigger the initial deployment. Vercel will build the Next.js project and expose preview URLs per branch.

### Option B – Vercel CLI

If you prefer the CLI:

\`\`\`bash
npm i -g vercel
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Repeat for each variable listed above
vercel --prod
\`\`\`

## Step 4 – Align Supabase Redirects

For each Supabase project, navigate to **Authentication → URL Configuration** and add:

- `http://localhost:3000/browse`
- `http://localhost:3000/dashboard`
- `https://<preview-domain>.vercel.app/browse`
- `https://<preview-domain>.vercel.app/dashboard`
- `https://<production-domain>/browse`
- `https://<production-domain>/dashboard`

## Step 5 – Map Webhooks and Callbacks

1. Point DeltaPay, Paystack, and Flutterwave webhooks to the respective routes in `app/api/orders` or `app/api/payouts` depending on your integration pattern.
2. Ensure each provider sends signatures/headers that your handlers expect. Store signing secrets as additional environment variables if required.
3. Test callbacks using sandbox modes or provider-specific testing tools before going live.

## Step 6 – Smoke Test the Deployment

- Run the automated health smoke check against the deployed URL — it hits the public homepage and the unauthenticated JSON health endpoints so we can distinguish a healthy app from an auth-redirect intercept:

  ```bash
  scripts/smoke-deployment.sh https://<deployment-domain>
  ```

  The script verifies:

  - `GET /` returns `200 text/html`
  - `GET /api/health` returns `200 application/json` (e.g. `{ "ok": true, "service": "ticketiv" }`)
  - `GET /api/health/supabase` returns `200 application/json` showing Supabase connectivity without exposing keys

- Run through attendee checkout flows using test payment keys.
- Validate that Supabase receives new `tickets` records and that `/scanner/scan` verifies the generated codes.
- Confirm organiser dashboards display up-to-date payout and order data.
- Monitor Vercel build logs and Supabase logs for errors.

## Step 7 – Promote to Production

1. Merge the release branch into `main` (or your production branch).
2. Confirm the production Vercel project points to the production Supabase and payment credentials.
3. Flip providers from test to live mode.
4. Announce availability and continue monitoring analytics and logs.

## Troubleshooting

- **401/403 responses**: Verify Supabase keys and RLS policies. Ensure service role keys are only used server-side.
- **Webhook retries**: Check signature validation logic and confirm Vercel routes respond within provider timeouts.
- **Payment discrepancies**: Reconcile Supabase `tickets` totals with provider dashboards and investigate mismatches promptly.

## Ongoing Operations

- Rotate keys periodically in Supabase and payment provider dashboards, updating Vercel secrets accordingly.
- Enable Vercel Analytics and Supabase log drains for long-term monitoring.
- Schedule database backups or use Supabase PITR (Point-In-Time Recovery) for disaster readiness.
