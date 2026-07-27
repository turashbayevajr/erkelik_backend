# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app/webapp

# webapp — отдельный npm-проект (не workspace), у него свой lock-файл
COPY webapp/package.json webapp/package-lock.json ./
RUN npm ci

COPY webapp ./
RUN npm run build

# ---------- runtime ----------
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
# miniapp живёт на корне домена (vite base по умолчанию '/')
COPY --from=build /app/webapp/dist /usr/share/nginx/html
EXPOSE 80
