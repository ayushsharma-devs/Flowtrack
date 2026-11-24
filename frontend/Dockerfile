# =============================================================================
# FlowTrack Frontend — Production Dockerfile
# Multi-stage build: Node 18 Alpine, Next.js standalone output
# =============================================================================

# --------------- Stage 1: Dependencies ---------------
FROM node:18-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# --------------- Stage 2: Builder ---------------
FROM node:18-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Enable standalone output for a leaner production image
RUN sed -i 's/reactStrictMode: false,/reactStrictMode: false,\n  output: "standalone",/' next.config.mjs

RUN npm run build

# --------------- Stage 3: Runtime ---------------
FROM node:18-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copy standalone server + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public 2>/dev/null || true

RUN chown -R nextjs:nextjs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
