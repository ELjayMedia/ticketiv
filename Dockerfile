# syntax=docker/dockerfile:1.7
# Ticketiv web (Next 16) for Coolify on eljay-ops-01 (arm64).
# NEXT_PUBLIC_* values are inlined into the client bundle, so they are build arguments.
# Server secrets are runtime env only; they never enter an image layer.
# VERCEL_ENV=production keeps the existing production gates (next.config deployment
# safety, Paystack/DeltaPay live-mode guards, payout keyring check) active off Vercel.
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/ticketiv/package.json apps/ticketiv/
COPY apps/access/package.json apps/access/
COPY packages/adapters/package.json packages/adapters/
COPY packages/shared/package.json packages/shared/
COPY packages/tokens/package.json packages/tokens/
# Only the web app and its workspace deps; the Expo apps are not needed here.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "ticketiv..."

FROM deps AS builder
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL=https://ticketiv.app
ARG NEXT_PUBLIC_TICKET_BASE_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
ARG NEXT_PUBLIC_APP_VERSION
ARG GOOGLE_MAPS_EMBED_KEY
ARG SOURCE_COMMIT
ARG VERCEL_ENV=production
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
    VERCEL_ENV=${VERCEL_ENV} VERCEL_GIT_COMMIT_SHA=${SOURCE_COMMIT}
COPY . .
# Build args are visible to RUN; drop empty ones so optional vars validate as "unset", not "".
RUN for v in $(env | sed -n "s/^\([A-Z0-9_]*\)=$/\1/p"); do unset "$v"; done \
    && pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ARG VERCEL_ENV=production
ARG SOURCE_COMMIT
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    VERCEL_ENV=${VERCEL_ENV} VERCEL_GIT_COMMIT_SHA=${SOURCE_COMMIT}
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/next.config.mjs ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
# Payout keyring gate (TICK-376) runs at start, where the secret actually lives.
COPY --from=builder --chown=nextjs:nodejs /app/scripts/verify-production-payout-encryption.mjs ./scripts/
COPY --from=builder --chown=nextjs:nodejs /app/lib/payout-crypto-core.ts ./lib/
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
STOPSIGNAL SIGTERM
CMD ["sh", "-c", "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types scripts/verify-production-payout-encryption.mjs && exec node_modules/.bin/next start -H 0.0.0.0 -p 3000"]
