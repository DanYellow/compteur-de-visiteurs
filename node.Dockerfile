FROM node:24.8.0

WORKDIR /app

COPY --chown=node:node package*.json .

RUN npm install

COPY . .

RUN npm run email

RUN npm run build

CMD ["npm", "run", "prod"]
