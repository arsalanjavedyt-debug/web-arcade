# NEXORA PLAY — Production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN node scripts/generate-all-thumbnails.mjs
RUN node build.mjs

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/games ./games
COPY --from=builder /app/assets ./assets

EXPOSE 3000

CMD ["node", "server.js"]
