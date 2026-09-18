FROM registry.cn-hangzhou.aliyuncs.com/arm64m/node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY src ./src
COPY tsconfig.json ./

RUN npm run build

FROM registry.cn-hangzhou.aliyuncs.com/arm64m/node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

ENTRYPOINT ["node", "dist/index.js"]
