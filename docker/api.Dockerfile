# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate && npm run build

# ---------- runtime ----------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production TZ=Asia/Aqtau PORT=4000

# только прод-зависимости; prisma — прод-зависимость,
# чтобы migrate deploy работал без похода в registry
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# артефакты: собранный сервер, схема и миграции
COPY --from=build /app/dist ./dist
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY prisma/migrations ./prisma/migrations

# клиент генерируется в этом слое: npm ci выше ставит чистый @prisma/client
# без сгенерированного кода (схемы в тот момент ещё нет в образе)
RUN npx prisma generate

EXPOSE 4000
# миграции применяются на старте — рестарт контейнера безопасен (идемпотентно)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
