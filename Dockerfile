FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY dist ./dist
COPY src ./src
COPY tsconfig.json ./

EXPOSE 3000

ENTRYPOINT ["node", "dist/index.js"]
