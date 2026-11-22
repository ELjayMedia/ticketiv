# Ticketiv release process

All work starts on `uat`, or in a feature branch with a PR targeting `uat`.
`main` contains production releases. The default branch is `uat`.

## Delivery flow

1. CI checks feature PRs against a disposable database and runs the release gate without deployment or production credentials.
2. A push to `uat` runs the same checks, builds an ARM64 image on GitHub, and deploys its immutable digest to Coolify's UAT frontend.
3. The UAT job checks the deployed revision, then runs database lifecycle and browser tests against `uat-api.ticketiv.app` and `uat.ticketiv.app`. A sandbox payment configuration is restored and deterministic fixtures are cleaned up even after test failures.
4. Open a PR from `uat` to `main`. The release-policy check requires a successful UAT deployment of the exact source tree being promoted. Other source branches cannot promote directly to `main`.
5. After merging, wait for main CI. Run **Release production** from the `main` branch and enter `DEPLOY_PRODUCTION`. The workflow requires enforced main protection, green main CI, and matching UAT evidence before deploying production.
6. Production deploys by image digest. Its exact `/api/health` revision must match the release commit. Deployment failures trigger restoration of the previous image and revision; a failed rollback requires operator attention.

Do not manually retag or overwrite commit images. The UAT and production frontend bundles use different public backend URLs, so they are built separately from the tested source tree. Build provenance and SBOMs are attached to published images. Private build credentials use ephemeral BuildKit mounts.

## GitHub account requirements

This is a private personal repository. Enforced branch protection, environment secrets, and deployment-branch policies require GitHub Pro or a higher eligible plan. Repository settings returning HTTP 403 are an installation blocker, not an enforced protection.

Required environment policies:

| Environment | Permitted branch | Purpose |
| --- | --- | --- |
| `UAT` | `uat` only | Isolated deployment and mutation-backed tests |
| `Production` | `main` only | Production release and maintenance |
| `google-play-production` | `main` only | Existing Google Play promotion |

Required reviewers for private deployment environments require an additional GitHub plan capability; the production workflow therefore uses an explicit manual release action. Main protection requires PRs, up-to-date checks, resolved conversations, no force pushes or deletion, and applies to administrators. The repository currently has one maintainer, so the checked-in policy does not require an unavailable second approver. Increase the approval count when an independent reviewer joins.

Apply the checked-in `.github/main-protection.json` through the GitHub API. Confirm the policy by reading it back; a JSON file in the repository alone does not protect a branch.

## Credentials

Never store production credentials as repository-wide Actions secrets. Move existing production, signing, backup and monitoring credentials into their main-only environments before enabling automated UAT deployments. The repository variable `CICD_SECRETS_ISOLATED=true` is an administrator's completion marker for that migration; it must stay unset until verified.

UAT environment secrets: `COOLIFY_TOKEN`, `CLOUDFLARE_ACCESS_CLIENT_ID`, `CLOUDFLARE_ACCESS_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and `E2E_PAYSTACK_TEST_KEY`. The last key must start with `sk_test_`.

Production environment secrets: `RELEASE_POLICY_TOKEN` (fine-grained, this repository only: Administration read, Actions read and Deployments read, to read enforced protection), its own `COOLIFY_TOKEN` and Cloudflare Access pair, plus optional `SENTRY_AUTH_TOKEN` for source-map uploads. Production runtime database, cron and payout credentials remain in Coolify and are not needed by the application deployment workflow. Production maintenance workflows use Production-scoped credentials separately.

Coolify tokens must be scoped to their specific frontend resource: UAT service `f6zklydyif1ob3kk2dkvrnjn`, production application `zs2jkfesdsmrrftkjgcnoekp`. UAT needs read-sensitive access to its own Compose definition, write and deploy. Production needs read, write and deploy. Verify UAT's token is denied access to production. Use expirations and rotate before expiry.

The UAT Access service identity needs access to the UAT site and Coolify's API. Browser tests add its headers only to the UAT origin and do not forward them across redirects. Tracing is disabled for those tests to avoid recording Access credentials in diagnostic artifacts. Keep the app's human Access policy and its proxy no-index policy enabled.

## Public configuration and database migrations

Repository variables: `UAT_SUPABASE_PUBLIC_KEY`, `UAT_SCHEMA_FINGERPRINT`, `CICD_SECRETS_ISOLATED`.

Production variables: `SUPABASE_PUBLIC_KEY`, `SCHEMA_FINGERPRINT`, optional `SENTRY_DSN`. Public API keys are client credentials, not service-role secrets.

Both releases compare the committed migration fingerprint with the administrator-verified environment fingerprint. Generate it with `node scripts/ci/schema-fingerprint.mjs`. A mismatch blocks deployment. The app pipeline never applies arbitrary SQL automatically.

For schema changes: review migrations, create and verify a recovery point, apply and test them in UAT, then perform an explicit production database rollout and update that environment's fingerprint only after verifying the result. Use backward-compatible expand/contract changes so application rollback remains possible. Image rollback does not reverse database migrations.

Do not re-enable `.github/workflows/shared-uat.yml`: its production-backed mutation path has been retired. Mutation harnesses and fixture scripts reject the production project even if production credentials are supplied accidentally.

The legacy `ci.yml` workflow is disabled during the migration because its main-push job deploys production automatically. `checks.yml` replaces verification without deployment credentials. Leave the legacy shared-production UAT workflow disabled.
