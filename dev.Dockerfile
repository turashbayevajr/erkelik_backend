FROM node:lts-bullseye-slim AS base

# Set working directory
WORKDIR /app

# Set timezone
ENV TZ=Asia/Aqtau
ENV NODE_ENV=development
ENV PORT=4002

# Install required packages (including 'procps' for 'ps' command)
RUN apt update && apt install -y --no-install-recommends \
    procps \
    openssl fonts-noto libcairo2 libpango-1.0-0 libjpeg62-turbo libgif7 librsvg2-bin \
 && rm -rf /var/lib/apt/lists/*

# Install Nest CLI globally
RUN npm install -g @nestjs/cli

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose API port
EXPOSE 4002

# Start application in dev mode
CMD ["npm", "run", "start:dev"]
