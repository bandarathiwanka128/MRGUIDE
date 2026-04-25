# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json .npmrc* ./

RUN npm install --no-audit --no-fund

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
