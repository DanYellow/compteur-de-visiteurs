# Run as a non-privileged user
FROM node:24.8.0
RUN useradd -ms /bin/sh -u 1001 app
USER app

# Install dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

# Copy source files into application directory
COPY --chown=app:app . /app
