# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json .npmrc* ./

RUN npm install --no-audit --no-fund

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
