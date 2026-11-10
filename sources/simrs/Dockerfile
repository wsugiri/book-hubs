# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Runtime Minimalis
FROM node:20-alpine AS runner
WORKDIR /app

# Pasang dumb-init untuk menangani sinyal PID 1 (SIGTERM/SIGINT) secara presisi
RUN apk add --no-cache dumb-init

# Jalankan sebagai non-root user demi keamanan kepatuhan rumah sakit
USER node

COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src/ ./src/
COPY --chown=node:node server.js ./
COPY --chown=node:node worker.js ./

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server.js"]

