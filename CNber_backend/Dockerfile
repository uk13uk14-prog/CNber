# CNber Backend — production container image
# Secrets must be provided via env/compose, never baked into the image.
FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3100

# Install production dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Application source (see .dockerignore)
COPY . .

# Runtime-writable dirs (also mounted as volumes in compose)
RUN mkdir -p public/uploads/payment-proofs \
             public/uploads/payment-accounts \
             public/downloads/driver \
             public/downloads/client \
             public/admin \
             logs

EXPOSE 3100

# Do not use PM2 as PID 1 inside the container
CMD ["node", "server.js"]
