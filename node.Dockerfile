# ---------- Build sources ----------
FROM node:24.8.0 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run email

RUN npm run build:server

RUN npm run build

# ---------- Production ----------
FROM node:24.8.0

WORKDIR /app

# ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3900

CMD ["npm", "run", "prod"]
