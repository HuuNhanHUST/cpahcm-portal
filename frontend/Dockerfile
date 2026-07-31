# syntax=docker/dockerfile:1

# ── Stage 1: deps — cài toàn bộ dependencies (cần cả devDependencies để build: tailwind, ts) ──
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: builder — build Next.js ở chế độ "standalone" ──
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* được Next.js "bake" (nhúng cứng) vào bundle NGAY LÚC build — phải truyền qua
# build-arg từ CI (docker build --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.cpahcm.vn ...),
# không thể set biến này sau khi build hoặc lúc container chạy vì sẽ không có tác dụng.
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

RUN npm run build

# ── Stage 3: runner — chỉ copy output "standalone" (đã tự gom node_modules tối giản) ──
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
