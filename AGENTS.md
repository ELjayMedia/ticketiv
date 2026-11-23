<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Branch and release policy

- Start all changes on `uat`, or on a feature branch whose pull request targets `uat`.
- Never push directly to `main`. Promote through a pull request from `uat` after its CI and UAT deployment pass.
- `uat` deploys only to `https://uat.ticketiv.app` and the isolated self-hosted backend at `https://uat-api.ticketiv.app`.
- `main` is the production release branch. Production releases run manually from `main` through the `Production` GitHub environment.
- Never run fixture seeds, destructive integration tests, or UAT teardown against production. Test scripts must reject the production Supabase project.
- Keep deployment credentials in branch-restricted GitHub environments. Pull-request CI must not receive deployment or production database credentials.
- Images are identified by commit and deployed by digest. A release must verify the exact running revision and roll back on a failed health check.
- Database changes require reviewed migrations, a recovery point, and an explicit schema rollout. Update the environment's schema fingerprint only after applying and verifying those migrations.
