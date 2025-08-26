# syntax=docker/dockerfile:1

# --- deps ---
FROM node:22-slim AS deps
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- build (needs dev deps) ---
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# --- runtime ---
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production TZ=Asia/Aqtau PORT=4002
# prod deps + built artifacts only
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./
EXPOSE 4002
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
