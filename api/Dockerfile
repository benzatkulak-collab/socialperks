# ── Stage 1: Install dependencies ──────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY api/package.json api/package-lock.json* ./api/
COPY package.json package-lock.json* ./
RUN cd api && npm ci --omit=dev

# ── Stage 2: Production runner ────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser

# Copy the API service
COPY --from=deps /app/api/node_modules ./api/node_modules
COPY api/ ./api/

# Copy shared source code (engines, types, etc.)
COPY src/lib/ ./src/lib/

# Install tsx globally for running TypeScript
RUN npm install -g tsx

ENV NODE_ENV=production
ENV API_PORT=4000

USER apiuser
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/v1/health || exit 1

CMD ["tsx", "api/src/index.ts"]
