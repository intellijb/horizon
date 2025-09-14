# ------------------------
# Base image
# ------------------------
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# ------------------------
# Dependencies install
# ------------------------
FROM base AS deps
# Copy package files
COPY package.json package-lock.json ./
# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# ------------------------
# Builder
# ------------------------
FROM base AS builder
# Copy package files for full install (including dev dependencies)
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy source code and config files
COPY src ./src
COPY scripts ./scripts
COPY tsconfig*.json ./

# Build the application
RUN npm run build

# ------------------------
# Runner (production)
# ------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify

# Copy production dependencies and built app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Change ownership to fastify user
RUN chown -R fastify:nodejs /app
USER fastify

EXPOSE 3000

CMD ["node", "dist/server.js"]