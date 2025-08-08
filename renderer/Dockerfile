FROM mcr.microsoft.com/playwright:v1.54.2-jammy

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src
COPY public ./public

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"] 