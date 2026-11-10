# Multi-stage build: compile TypeScript, then ship only dist + production deps.
FROM registry.cn-hangzhou.aliyuncs.com/arm64m/node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
# --ignore-scripts: the prepare hook needs src/, which is copied below.
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM registry.cn-hangzhou.aliyuncs.com/arm64m/node:22-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist

# The image ships no writable state; run as the unprivileged user.
USER node

EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "const p=process.env.PORT||3000;require('net').connect(p,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"

ENTRYPOINT ["node", "dist/cli.js"]
