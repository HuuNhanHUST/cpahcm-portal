# syntax=docker/dockerfile:1

# ── Stage 1: deps — cài toàn bộ dependencies (kể cả devDependencies để build) ──
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: build — generate Prisma Client + compile TypeScript ──
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 3: migrator — image RIÊNG chỉ để chạy "prisma migrate deploy" trong CD pipeline.
# Cần giữ lại "prisma" CLI (devDependency, không có trong image runner production ở dưới)
# + thư mục prisma/migrations. KHÔNG chứa code app đã build — không dùng để phục vụ traffic.
FROM node:22-alpine AS migrator
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
CMD ["npx", "prisma", "migrate", "deploy"]

# ── Stage 4: prod-deps — chỉ cài dependencies production (image gọn nhẹ) ──
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 5: runner — image cuối cùng chạy thật, không chứa source TS/devDependencies ──
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Prisma Client generate ra "node_modules/.prisma" — cần copy đè lại vì prod-deps ở trên
# chỉ chạy "npm ci --omit=dev" nên KHÔNG tự chạy prisma generate (không có devDependency prisma).
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
RUN mkdir -p uploads uploads-private && chown -R nestjs:nodejs /app

USER nestjs
EXPOSE 3001

CMD ["node", "dist/main.js"]
