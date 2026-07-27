FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

COPY adaptfit-api/package.json adaptfit-api/package.json

RUN npm ci --workspace=adaptfit-api --omit=dev

COPY . .

WORKDIR /app/adaptfit-api

EXPOSE 3000

CMD ["npm", "start"]
