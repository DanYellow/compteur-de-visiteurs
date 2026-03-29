FROM node:24

WORKDIR /home/node/app

# Install dependencies first (better caching)
COPY package*.json ./

RUN npm install

# Copy app source
COPY . .

# Expose ports (optional but nice)
EXPOSE 3900 5173

CMD ["npm", "run", "dev"]
