# syntax=docker/dockerfile:1

# ---- Base ----------------------------------------------------------------
# Match the Node major version used for local development.
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-alpine AS base
# libc6-compat is needed for some native addons (e.g. sharp's prebuilt
# binaries) to run correctly on musl-based Alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app
# Pin the exact pnpm version this repo was locked with (see package.json
# "packageManager") instead of trusting whatever corepack would default to.
RUN corepack enable && corepack prepare pnpm@10.9.0 --activate

# ---- Dependencies ----------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- Build -----------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `next build` imports every API route to collect its metadata, and a few
# modules (lib/auth.ts, lib/voterLink.ts, the helpdesk login route) throw at
# import time if JWT_SECRET is unset. This placeholder only exists to get
# through that build step — it is NOT baked into the runtime image (each
# Docker stage starts with a clean environment) and is overridden by the
# real JWT_SECRET you pass to `docker run` / compose at container start.
ENV JWT_SECRET=build-time-placeholder-overridden-at-runtime
ENV NEXT_TELEMETRY_DISABLED=1

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm build

# ---- Runtime -----------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Standalone server listens on this host:port.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone output only includes what next/server.js needs to run — the
# public/ and .next/static folders are copied in separately per Next.js docs.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>{if(r.ok)process.exit(0);process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
