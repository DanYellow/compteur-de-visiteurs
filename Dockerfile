# ---------- GLOBAL ARGS ----------
ARG PORT

# ---------- DEV ----------
FROM node:24 AS dev

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ARG PORT
ENV PORT=$PORT

EXPOSE $PORT 5173

# ---------- Build sources ----------
FROM node:24 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run email

RUN npm run build:server

RUN npm run build

# RUN ls -al

# ---------- Production ----------
FROM node:24 AS prod

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/.env.local ./

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/models ./models
COPY --from=builder /app/config ./config

COPY --from=builder /app/src/emails ./src/emails
COPY --from=builder /app/src/includes ./src/includes
COPY --from=builder /app/src/layouts ./src/layouts
COPY --from=builder /app/src/pages ./src/pages

ARG PORT
ENV PORT=$PORT

EXPOSE $PORT

# RUN chown -R node:node /app
# USER node

