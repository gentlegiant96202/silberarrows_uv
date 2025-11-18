FROM mcr.microsoft.com/playwright:v1.55.1-jammy

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

# Copy public directory - Railway should detect changes to template files
# Updated: Force rebuild to pick up template changes
# Build timestamp: 2025-11-18 19:36
COPY public ./public

# Force verification of template file to ensure it's copied correctly
# This will fail the build if the file is missing or stale
RUN test -f public/templates/price-drop-template-45.html && \
    echo "Template file found" && \
    grep -q "image-section" public/templates/price-drop-template-45.html && \
    echo "Template contains expected content" || \
    (echo "ERROR: Template file missing or incorrect!" && exit 1)

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"] 