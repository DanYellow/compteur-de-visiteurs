FROM node:22-alpine

RUN apk add --no-cache sqlite

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY ./server/backup.ts ./server/backup.ts
# COPY . .
