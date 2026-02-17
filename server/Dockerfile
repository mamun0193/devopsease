# Stage 1: Builder
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies (only in builder)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

# Build step (if any):
# RUN npm run build


# Stage 2: Production
FROM node:18-alpine

# Install tini for proper signal handling
RUN apk add --no-cache tini

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3497

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only production dependencies
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy application source
COPY --chown=appuser:appgroup src ./src
COPY --chown=appuser:appgroup package*.json ./

# Remove devDependencies safely
RUN npm prune --omit=dev

# Clean up
RUN npm cache clean --force

# Switch to non-root user
USER appuser

EXPOSE 3497

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3497/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
