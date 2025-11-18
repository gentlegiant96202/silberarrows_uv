FROM mcr.microsoft.com/playwright:v1.55.1-jammy

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

# Copy source and public files together to ensure template changes are detected
COPY src ./src
COPY public ./public

# Verify templates are present
RUN ls -la public/templates/ || echo "Templates directory check"

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"] 