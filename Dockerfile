FROM node:lts-bullseye-slim AS base

RUN apt-get update
RUN apt-get install -y --no-install-recommends openssl
RUN rm -rf /var/lib/apt/lists/*

FROM base AS builder
WORKDIR /app

RUN npm install -g @nestjs/cli
COPY package.json ./
COPY package-lock.json ./

RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
RUN npm i --omit=dev && npm cache clean --force

FROM base AS runner
WORKDIR /app

EXPOSE 4000
ENV PORT=4000
ENV TZ=Asia/Aqtau
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --chown=nodejs:nodejs --from=builder /app/dist/ ./dist
COPY --chown=nodejs:nodejs --from=builder /app/package*.json ./
COPY --chown=nodejs:nodejs --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs --from=builder /app/src/prisma/migrations ./src/prisma/migrations
COPY --chown=nodejs:nodejs --from=builder /app/src/prisma/schema.prisma ./src/prisma/schema.prisma 

USER nodejs

CMD ["npm", "run", "start:prod"]