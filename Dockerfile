# syntax=docker/dockerfile:1.7
# Ticketiv production image for Coolify (linux/arm64).
# NEXT_PUBLIC_* values are inlined into the client bundle, so Coolify supplies
# them to both the build and runtime environments. Server secrets remain
# runtime-only and are never copied into the image.
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/ticketiv/package.json apps/ticketiv/
COPY apps/access/package.json apps/access/
COPY packages/adapters/package.json packages/adapters/
COPY packages/shared/package.json packages/shared/
COPY packages/tokens/package.json packages/tokens/
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
ARG NEXT_PUBLIC_CHATWOOT_BASE_URL
ARG NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
ARG GOOGLE_MAPS_EMBED_KEY
ARG SOURCE_COMMIT
ARG DEPLOYMENT_ENV=production
ARG VERCEL_ENV=production
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
    DEPLOYMENT_ENV=${DEPLOYMENT_ENV} VERCEL_ENV=${VERCEL_ENV} \
    VERCEL_GIT_COMMIT_SHA=${SOURCE_COMMIT}
COPY . .
# Empty optional build arguments must behave like unset environment variables.
RUN for v in $(env | sed -n "s/^\([A-Z0-9_]*\)=$/\1/p"); do unset "$v"; done \
    && pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ARG DEPLOYMENT_ENV=production
ARG VERCEL_ENV=production
ARG SOURCE_COMMIT
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    DEPLOYMENT_ENV=${DEPLOYMENT_ENV} VERCEL_ENV=${VERCEL_ENV} \
    VERCEL_GIT_COMMIT_SHA=${SOURCE_COMMIT}
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/next.config.mjs ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/scripts/verify-production-payout-encryption.mjs ./scripts/
COPY --from=builder --chown=nextjs:nodejs /app/lib/payout-crypto-core.ts ./lib/
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
STOPSIGNAL SIGTERM
CMD ["sh", "-c", "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types scripts/verify-production-payout-encryption.mjs && exec node_modules/.bin/next start -H 0.0.0.0 -p 3000"]
