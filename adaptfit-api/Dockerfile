FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

WORKDIR /app/adaptfit-api

RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
