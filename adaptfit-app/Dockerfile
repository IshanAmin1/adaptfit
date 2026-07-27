FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./

COPY adaptfit-app/package.json adaptfit-app/package.json

RUN npm ci --workspace=adaptfit-app --include-workspace-root

COPY . .

WORKDIR /app/adaptfit-app

RUN npm run build

FROM nginx:1.30.4-alpine

COPY --from=build /app/adaptfit-app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
