FROM node:18-bullseye-slim

# Verify Node.js and npm installation
RUN node --version && npm --version

# Install FFmpeg, Chromium and required libraries for headless Chrome
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      chromium \
      ffmpeg \
      ca-certificates \
      fonts-liberation \
      libasound2 \
      libatk-bridge2.0-0 \
      libc6 \
      libcairo2 \
      libdrm2 \
      libexpat1 \
      libfontconfig1 \
      libgbm1 \
      libgcc1 \
      libgdk-pixbuf2.0-0 \
      libglib2.0-0 \
      libgtk-3-0 \
      libnspr4 \
      libnss3 \
      libpango-1.0-0 \
      libpangocairo-1.0-0 \
      libstdc++6 \
      libx11-6 \
      libx11-xcb1 \
      libxcb1 \
      libxcomposite1 \
      libxcursor1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxi6 \
      libxrandr2 \
      libxrender1 \
      libxshmfence1 \
      libxss1 \
      libxtst6 && \
    rm -rf /var/lib/apt/lists/*

# Set environment variables for Remotion
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV REMOTION_GL=angle
ENV PUPPETEER_ARGS="--headless=new --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu --single-process"

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with verbose logging
RUN npm ci --omit=dev --verbose

# Copy source code
COPY . .

# Create a health check endpoint script
RUN echo 'process.stdout.write("Health check: OK\\n");' > health.js

EXPOSE 3001

# Use explicit path to npm
CMD ["/usr/local/bin/npm", "start"]
