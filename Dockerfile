FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /app/data /app/public/uploads

EXPOSE 8081

ENV PORT=8081 \
    NODE_ENV=production

CMD ["node", "server.js"]
