FROM node:18-alpine

# Verify Node.js and npm installation
RUN node --version && npm --version

# Install FFmpeg and Chromium for Remotion
RUN apk add --no-cache \
    ffmpeg \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set environment variables for Remotion
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV REMOTION_GL=angle

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with verbose logging
RUN npm ci --omit=dev --verbose

# Copy source code
COPY . .

# Create a health check endpoint script
RUN echo 'console.log("Health check: OK");' > health.js

EXPOSE 3001

# Use explicit path to npm
CMD ["/usr/local/bin/npm", "start"]
