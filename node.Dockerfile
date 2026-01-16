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

# COPY --from=builder /app/whitelist-ip.tmp.txt ./

COPY --from=builder /app/.env.local ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/src/emails ./src/emails
COPY --from=builder /app/src/includes ./src/includes
COPY --from=builder /app/src/layouts ./src/layouts
COPY --from=builder /app/src/pages ./src/pages

RUN mkdir -p /app

RUN chown -R node:node /app

USER node

EXPOSE 3900

# CMD ["ls", "-al"]
CMD ["npm", "run", "prod"]
